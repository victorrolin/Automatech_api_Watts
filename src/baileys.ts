import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import type { WASocket, ConnectionState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { MetricsManager } from './metrics.js';

const logger = pino({ level: 'error' });

export interface LogEntry {
    timestamp: string;
    type: 'WHATSAPP' | 'TYPEBOT' | 'N8N' | 'SYSTEM';
    instance: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

export class LogSystem {
    private static logs: LogEntry[] = [];
    private static maxLogs = 100;
    private static io: any;

    static setIO(io: any) {
        this.io = io;
    }

    static add(log: Omit<LogEntry, 'timestamp'>) {
        const entry = { ...log, timestamp: new Date().toISOString() };
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) this.logs.pop();

        // Emitir via WebSocket
        if (this.io) {
            try {
                this.io.emit('new_log', entry);
                console.log(`[Socket.io] Log emitido: ${entry.type} para instância ${entry.instance}`);
            } catch (err: any) {
                console.error(`[Socket.io] Erro ao emitir log:`, err.message);
            }
        } else {
            console.warn(`[LogSystem] Socket.io não definido ao tentar logar: ${entry.type}`);
        }

        console.log(`[${entry.type}] ${entry.instance}: ${entry.message}`);
    }

    static getLogs() {
        return this.logs;
    }
}

export interface InstanceSettings {
    n8nUrl?: string;
    typebotUrl?: string;
    typebotName?: string;
    typebotApiKey?: string;
    typebotDelay?: number;
    typebotSessionTimeout?: number; // Timeout em minutos (padrão: 30)
    enabled?: boolean;
    isPaused?: boolean;
}

export class Instance {
    public sock?: WASocket;
    public qr: string | undefined;
    public status: 'connecting' | 'connected' | 'disconnected' | 'qr' = 'disconnected';
    public settings: InstanceSettings = { enabled: true };
    private authPath: string;
    private settingsPath: string;
    private processedMessages: Set<string> = new Set();
    private isInitializing: boolean = false;
    private connectionAttempts: number = 0;

    constructor(public id: string) {
        this.authPath = path.join(process.cwd(), 'sessions', id);
        this.settingsPath = path.join(this.authPath, 'settings.json');
        this.loadSettings();
    }

    private loadSettings() {
        if (fs.existsSync(this.settingsPath)) {
            try {
                this.settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            } catch (e) {
                console.error(`Erro ao carregar configurações da instância ${this.id}:`, e);
            }
        }
    }

    public saveSettings(newSettings: InstanceSettings) {
        this.settings = { ...this.settings, ...newSettings };
        if (!fs.existsSync(this.authPath)) {
            fs.mkdirSync(this.authPath, { recursive: true });
        }
        fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    }

    async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            // Garantir limpeza de socket antigo se houver
            if (this.sock) {
                this.sock.ev.removeAllListeners('connection.update');
                this.sock.ev.removeAllListeners('creds.update');
                this.sock.ev.removeAllListeners('messages.upsert');
            }

            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                logger,
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
                const { connection, lastDisconnect, qr } = update;

                // DEBUG: Log every connection.update event
                LogSystem.add({
                    type: 'WHATSAPP',
                    level: 'INFO',
                    instance: this.id,
                    message: `[DEBUG] connection.update: connection=${connection}, qr=${qr ? 'PRESENTE' : 'undefined'}, keys=${Object.keys(update).join(',')}`
                });

                if (qr) {
                    this.qr = qr;
                    this.status = 'qr';
                    LogSystem.add({ type: 'WHATSAPP', level: 'INFO', instance: this.id, message: 'QR Code atualizado' });
                }

                if (connection === 'close') {
                    // Verificar se tem credenciais salvas ANTES de tratar como desconexão
                    const credsPath = path.join(this.authPath, 'creds.json');
                    const hasCredentials = fs.existsSync(credsPath);

                    if (!hasCredentials) {
                        // Primeira conexão - recriar socket para gerar QR code
                        this.connectionAttempts++;

                        // Delay progressivo: 3s, 5s, 10s, depois reinicia
                        const delays = [3000, 5000, 10000];
                        const delayIndex = Math.min(this.connectionAttempts - 1, delays.length - 1);
                        const delay = delays[delayIndex] || 5000;

                        LogSystem.add({
                            type: 'WHATSAPP',
                            level: 'INFO',
                            instance: this.id,
                            message: `Tentativa ${this.connectionAttempts} - Reconectando em ${delay / 1000}s para gerar QR Code...`
                        });
                        this.status = 'qr';
                        this.isInitializing = false;

                        // Reset após muitas tentativas
                        if (this.connectionAttempts >= 5) {
                            this.connectionAttempts = 0;
                        }

                        // Sempre recriar socket para tentar gerar QR
                        setTimeout(() => this.init(), delay);
                        return;
                    }

                    this.qr = undefined;
                    this.status = 'disconnected';
                    const lastDisconnectError = (lastDisconnect?.error as Boom | undefined);
                    const shouldReconnect = lastDisconnectError?.output?.statusCode !== DisconnectReason.loggedOut;

                    if (shouldReconnect) {
                        this.connectionAttempts++;
                        const delay = Math.min(5000 * Math.pow(2, this.connectionAttempts - 1), 60000); // 5s, 10s, 20s, 40s, max 60s
                        LogSystem.add({
                            type: 'WHATSAPP',
                            level: 'WARN',
                            instance: this.id,
                            message: `Conexão perdida, tentativa ${this.connectionAttempts}. Reconectando em ${delay / 1000}s...`
                        });
                        this.isInitializing = false;
                        setTimeout(() => this.init(), delay);
                    } else {
                        LogSystem.add({ type: 'WHATSAPP', level: 'INFO', instance: this.id, message: 'Deslogado. Limpando dados...' });
                        this.isInitializing = false;
                        this.connectionAttempts = 0;
                    }
                } else if (connection === 'open') {
                    this.qr = undefined;
                    this.status = 'connected';
                    this.isInitializing = false;
                    this.connectionAttempts = 0; // Reset no sucesso
                    LogSystem.add({ type: 'WHATSAPP', level: 'INFO', instance: this.id, message: 'Conexão estabelecida com sucesso' });
                }
            });

            this.sock.ev.on('messages.upsert', async m => {
                // Log forçado no console para garantir que o evento foi recebido
                console.log(`[Baileys] Novo evento de mensagem recebido: ${m.type} | Count: ${m.messages.length}`);

                for (const msg of m.messages) {
                    const from = msg.key.remoteJid;
                    const isFromMe = msg.key.fromMe;
                    const msgId = msg.key.id;

                    if (!from || !msgId) continue;

                    if (isFromMe) {
                        MetricsManager.trackSent(this.id);
                        continue;
                    }

                    MetricsManager.trackReceived(this.id);

                    // Evitar processar a mesma mensagem duas vezes (cache de 1000 IDs)
                    if (this.processedMessages.has(msgId)) {
                        LogSystem.add({ type: 'SYSTEM', level: 'INFO', instance: this.id, message: `Ignorado: Mensagem duplicada ${msgId}` });
                        continue;
                    }
                    this.processedMessages.add(msgId);
                    if (this.processedMessages.size > 1000) {
                        const firstItem = this.processedMessages.values().next().value;
                        if (firstItem) this.processedMessages.delete(firstItem);
                    }

                    // FILTRO: Apenas chats privados (@s.whatsapp.net)
                    const isGroup = from.endsWith('@g.us');
                    const isBroadcast = from.endsWith('@broadcast');

                    if (isGroup || isBroadcast) {
                        LogSystem.add({ type: 'SYSTEM', level: 'INFO', instance: this.id, message: `Ignorado: Chat não é privado (${from})` });
                        continue;
                    }

                    const pushName = msg.pushName || 'Desconhecido';
                    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                    const type = Object.keys(msg.message || {})[0] || 'unknown';

                    // JID do usuário conectado (para detectar self-chat)
                    const rawMyId = this.sock?.user?.id || '';
                    // @ts-ignore
                    const myJid = rawMyId ? (rawMyId.split(':')[0].split('@')[0] + '@s.whatsapp.net') : '';
                    const isSelfChat = from === myJid;

                    LogSystem.add({
                        type: 'SYSTEM',
                        level: 'INFO',
                        instance: this.id,
                        message: `[MSG-RECV] From: ${from} | MyID: ${myJid} | Self: ${isSelfChat} | Text: ${text.slice(0, 30)}`
                    });

                    // Lógica de Processamento:
                    // 1. Se NÃO sou eu -> Processa se habilitado.
                    // 2. Se SOU eu E é chat comigo mesmo -> Processa se habilitado (Autoteste).
                    // Consideramos TRUE por padrão se undefined
                    const isEnabled = this.settings.enabled !== false;
                    const shouldProcess = (!isFromMe || (isFromMe && isSelfChat)) && isEnabled;

                    if (shouldProcess) {
                        if (!text) continue;

                        // Verificar se está pausado (Human Takeover)
                        if (this.settings.isPaused === true) {
                            LogSystem.add({
                                type: 'SYSTEM',
                                level: 'INFO',
                                instance: this.id,
                                message: `⏸️ Automação PAUSADA para intervenção humana. Ignorando mensagem.`
                            });
                            continue;
                        }

                        LogSystem.add({ type: 'WHATSAPP', level: 'INFO', instance: this.id, message: `📨 PROCESSAR: ${text}` });
                        console.log(`[Instance ${this.id}] Mensagem de ${from}: ${text}`);

                        // Integração n8n
                        if (this.settings.n8nUrl) {
                            axios.post(this.settings.n8nUrl, {
                                instance: this.id,
                                from,
                                message: text,
                                pushName,
                                timestamp: msg.messageTimestamp
                            })
                                .then(() => {
                                    LogSystem.add({ type: 'N8N', level: 'INFO', instance: this.id, message: `✅ Webhook enviado com sucesso` });
                                })
                                .catch((e: any) => {
                                    LogSystem.add({ type: 'N8N', level: 'ERROR', instance: this.id, message: `❌ Falha no Webhook: ${e.message}` });
                                    console.error(`[n8n Error]`, e.message);
                                });
                        } else {
                            // Apenas log se o Typebot também estiver desativado, para não encher o log
                            if (!this.settings.typebotUrl) {
                                LogSystem.add({ type: 'SYSTEM', level: 'WARN', instance: this.id, message: `⚠️ Nenhuma automação (n8n/Typebot) configurada.` });
                            }
                        }

                        // Integração Typebot
                        if (this.settings.typebotUrl && this.settings.typebotName) {
                            this.handleTypebot(from, text, pushName);
                        } else {
                            LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: `⚠️ Typebot OFF: URL/Name vazios` });
                        }
                    } else {
                        // Log detalhado do motivo de ignorar
                        const reason = !isEnabled ? 'Instância DESATIVADA' :
                            (isFromMe && !isSelfChat) ? 'Enviado por mim para outro contato' :
                                'Filtro de segurança ativado';

                        LogSystem.add({
                            type: 'SYSTEM',
                            level: 'INFO',
                            instance: this.id,
                            message: `Ignorado: ${reason}`
                        });
                    }
                }
            });
        } catch (error) {
            console.error(`[Instance ${this.id}] Erro na inicialização:`, error);
            this.isInitializing = false;
        }
    }

    private typebotSessions: Map<string, { sessionId: string; lastActivity: number }> = new Map();

    private async handleTypebot(remoteJid: string, text: string, name: string) {
        try {
            // Normalizar URL (remover slash final se existir)
            const baseUrl = this.settings.typebotUrl?.replace(/\/$/, '') || '';
            const typebotName = this.settings.typebotName;

            if (!baseUrl || !typebotName) {
                LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: 'Configuração incompleta: URL ou Nome do bot ausentes.' });
                return;
            }

            // Limpar sessões expiradas antes de processar
            this.cleanExpiredSessions();

            const sessionData = this.typebotSessions.get(remoteJid);
            let sessionId = sessionData?.sessionId;

            let url = "";
            let body: any = {};

            if (!sessionId) {
                // START CHAT
                url = `${baseUrl}/api/v1/typebots/${typebotName}/startChat`;
                body = {
                    isStreamEnabled: false,
                    message: text,
                    user: { name }
                };
                LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `🔄 Conectando ao Typebot... [START] URL: ${url}` });
            } else {
                // CONTINUE CHAT
                url = `${baseUrl}/api/v1/sessions/${sessionId}/continueChat`;
                body = { message: text };
                LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `🔄 Continuando fluxo... [CONTINUE] Session: ${sessionId}` });
            }

            const startTime = Date.now();
            const response = await axios.post(url, body, {
                headers: this.settings.typebotApiKey ? { 'Authorization': `Bearer ${this.settings.typebotApiKey}` } : {}
            });
            const duration = Date.now() - startTime;

            // Se for novo chat, guarda o ID da sessão com timestamp
            if (!sessionId && response.data.sessionId) {
                this.typebotSessions.set(remoteJid, {
                    sessionId: response.data.sessionId,
                    lastActivity: Date.now()
                });
                LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `✅ Sessão criada: ${response.data.sessionId}` });
            } else if (sessionId) {
                // Atualizar timestamp de atividade
                this.typebotSessions.set(remoteJid, {
                    sessionId,
                    lastActivity: Date.now()
                });
            }

            LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `⚡ Resposta Typebot (${duration}ms): ${response.status} OK` });

            // Processar mensagens do Bot
            const processMessages = async (messages: any[]) => {
                for (const botMsg of messages) {
                    const delay = this.settings.typebotDelay || 1500;

                    // Ativar status de "digitando..."
                    try {
                        await this.sock?.sendPresenceUpdate('composing', remoteJid);
                    } catch (e) { }

                    if (botMsg.type === 'text') {
                        let messageText = '';
                        if (botMsg.content.richText) {
                            messageText = botMsg.content.richText.map((block: any) =>
                                block.children.map((child: any) => child.text).join('')
                            ).join('\n');
                        } else if (botMsg.content.text) {
                            messageText = botMsg.content.text;
                        }

                        if (messageText) {
                            // Delay proporcional ao texto (mínimo delay configurado)
                            const typingTime = Math.max(delay, Math.min(messageText.length * 50, 5000));
                            await new Promise(resolve => setTimeout(resolve, typingTime));

                            const sentMsg = await this.sock?.sendMessage(remoteJid, { text: messageText });

                            if (sentMsg?.key.id) {
                                this.processedMessages.add(sentMsg.key.id);
                                if (this.processedMessages.size > 1000) {
                                    const firstItem = this.processedMessages.values().next().value;
                                    if (firstItem) this.processedMessages.delete(firstItem);
                                }
                            }
                            LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `📤 Enviando resposta: "${messageText.substring(0, 30)}..."` });
                        }
                    } else if (botMsg.type === 'image' || botMsg.type === 'video') {
                        const mediaUrl = botMsg.content?.url;
                        if (mediaUrl) {
                            // Delay para mídia
                            await new Promise(resolve => setTimeout(resolve, delay));

                            const isImage = botMsg.type === 'image';
                            const messageContent = isImage
                                ? { image: { url: mediaUrl } }
                                : { video: { url: mediaUrl } };

                            const sentMsg = await this.sock?.sendMessage(remoteJid, messageContent as any);

                            if (sentMsg?.key.id) {
                                this.processedMessages.add(sentMsg.key.id);
                                if (this.processedMessages.size > 1000) {
                                    const firstItem = this.processedMessages.values().next().value;
                                    if (firstItem) this.processedMessages.delete(firstItem);
                                }
                            }
                            LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `📤 Enviando ${botMsg.type}: ${mediaUrl.substring(0, 50)}...` });
                        }
                    }

                    // Parar status de "digitando..."
                    try {
                        await this.sock?.sendPresenceUpdate('paused', remoteJid);
                    } catch (e) { }
                }
            };

            if (response.data.messages) {
                await processMessages(response.data.messages);
            }

        } catch (e: any) {
            MetricsManager.trackTypebot(this.id, false);
            const status = e.response?.status || 'ERR_CONN';
            const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;

            LogSystem.add({
                type: 'TYPEBOT',
                level: 'ERROR',
                instance: this.id,
                message: `❌ Erro Conexão (${status}): ${errorMsg.substring(0, 150)}`
            });
            console.error(`[Typebot Error]`, e.response?.data || e.message);

            // Sessão inválida/expirada?
            if (e.response?.status === 404 && this.typebotSessions.has(remoteJid)) {
                LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: 'Sessão expirada pelo servidor. Reiniciando fluxo na próxima mensagem.' });
                this.typebotSessions.delete(remoteJid);
            }
        }
    }

    private cleanExpiredSessions() {
        const timeoutMinutes = this.settings.typebotSessionTimeout || 2; // Padrão: 2 minutos
        const timeoutMs = timeoutMinutes * 60 * 1000;
        const now = Date.now();

        for (const [jid, session] of this.typebotSessions.entries()) {
            if (now - session.lastActivity > timeoutMs) {
                this.typebotSessions.delete(jid);
                LogSystem.add({
                    type: 'TYPEBOT',
                    level: 'INFO',
                    instance: this.id,
                    message: `🕒 Sessão expirada por inatividade (${timeoutMinutes}min): ${jid}`
                });
            }
        }
    }

    async logout() {
        if (this.sock) {
            await this.sock.logout();
            this.status = 'disconnected';
            if (fs.existsSync(this.authPath)) {
                fs.rmSync(this.authPath, { recursive: true, force: true });
            }
        }
    }
}

export class InstanceManager {
    private instances: Map<string, Instance> = new Map();

    async createInstance(id: string) {
        if (this.instances.has(id)) return this.instances.get(id);
        const instance = new Instance(id);
        await instance.init();
        this.instances.set(id, instance);
        return instance;
    }

    getInstance(id: string) {
        return this.instances.get(id);
    }

    getInstances() {
        return Array.from(this.instances.values()).map(inst => ({
            id: inst.id,
            status: inst.status,
            hasQr: !!inst.qr
        }));
    }

    async removeInstance(id: string) {
        const instance = this.instances.get(id);
        if (instance) {
            try {
                if (instance.sock) {
                    instance.sock.ev.removeAllListeners('connection.update');
                    await instance.logout().catch(() => { });
                    instance.sock.end(undefined);
                }
            } catch (e: any) {
                console.warn(`[Manager] Erro ao deslogar instância ${id}:`, e.message);
            }
            this.instances.delete(id);
        }

        // Aguarda um momento para o Windows liberar os "handles" dos arquivos
        await new Promise(resolve => setTimeout(resolve, 2000));

        const sessionsPath = path.join(process.cwd(), 'sessions', id);
        if (fs.existsSync(sessionsPath)) {
            LogSystem.add({ type: 'SYSTEM', level: 'WARN', instance: id, message: `Limpando arquivos de sessão no disco...` });

            for (let i = 0; i < 3; i++) {
                try {
                    fs.rmSync(sessionsPath, { recursive: true, force: true });
                    LogSystem.add({ type: 'SYSTEM', level: 'INFO', instance: id, message: `Sessão removida totalmente.` });
                    return;
                } catch (e: any) {
                    console.warn(`[Manager] Tentativa ${i + 1} falhou para apagar ${id}:`, e.message);
                    if (i === 2) {
                        console.error(`[Manager] Erro fatal ao apagar pasta de sessão ${id}:`, e.message);
                        throw new Error(`Pasta de sessão ocupada por outro processo. Tente novamente em instantes.`);
                    }
                    // Espera mais um pouco antes de tentar novamente
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    }

    async loadExistingInstances() {
        const sessionsPath = path.join(process.cwd(), 'sessions');
        if (!fs.existsSync(sessionsPath)) return;

        const folders = fs.readdirSync(sessionsPath);
        for (const id of folders) {
            const folderPath = path.join(sessionsPath, id);
            if (fs.statSync(folderPath).isDirectory()) {
                console.log(`[Boot] Carregando instância existente: ${id}`);
                try {
                    await this.createInstance(id);
                } catch (e: any) {
                    console.error(`[Boot] Falha ao carregar instância ${id}:`, e.message);
                }
            }
        }
    }

    async shutdownAll() {
        console.log('[Manager] Iniciando encerramento gracioso de todas as instâncias...');
        for (const [id, instance] of this.instances) {
            try {
                if (instance.sock) {
                    instance.sock.ev.removeAllListeners('connection.update');
                    instance.sock.end(undefined);
                    console.log(`[Manager] Socket da instância ${id} encerrado.`);
                }
            } catch (e: any) {
                console.warn(`[Manager] Erro ao fechar instância ${id} durante shutdown:`, e.message);
            }
        }
    }
}
