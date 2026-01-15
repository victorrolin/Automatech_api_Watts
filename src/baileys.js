import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
const logger = pino({ level: 'error' });
export class LogSystem {
    static logs = [];
    static maxLogs = 100;
    static io;
    static setIO(io) {
        this.io = io;
    }
    static add(log) {
        const entry = { ...log, timestamp: new Date().toISOString() };
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs)
            this.logs.pop();
        // Emitir via WebSocket
        if (this.io) {
            try {
                this.io.emit('new_log', entry);
                console.log(`[Socket.io] Log emitido: ${entry.type} para instância ${entry.instance}`);
            }
            catch (err) {
                console.error(`[Socket.io] Erro ao emitir log:`, err.message);
            }
        }
        else {
            console.warn(`[LogSystem] Socket.io não definido ao tentar logar: ${entry.type}`);
        }
        console.log(`[${entry.type}] ${entry.instance}: ${entry.message}`);
    }
    static getLogs() {
        return this.logs;
    }
}
export class Instance {
    id;
    sock;
    qr;
    status = 'disconnected';
    settings = {};
    authPath;
    settingsPath;
    constructor(id) {
        this.id = id;
        this.authPath = path.join(process.cwd(), 'sessions', id);
        this.settingsPath = path.join(this.authPath, 'settings.json');
        this.loadSettings();
    }
    loadSettings() {
        if (fs.existsSync(this.settingsPath)) {
            try {
                this.settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            }
            catch (e) {
                console.error(`Erro ao carregar configurações da instância ${this.id}:`, e);
            }
        }
    }
    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        if (!fs.existsSync(this.authPath)) {
            fs.mkdirSync(this.authPath, { recursive: true });
        }
        fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    }
    async init() {
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
        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                this.qr = qr;
                this.status = 'qr';
                console.log(`[Instance ${this.id}] QR Code atualizado`);
            }
            if (connection === 'close') {
                this.qr = undefined;
                this.status = 'disconnected';
                const lastDisconnectError = lastDisconnect?.error;
                const shouldReconnect = lastDisconnectError?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    LogSystem.add({ type: 'WHATSAPP', level: 'WARN', instance: this.id, message: 'Conexão perdida, reconectando...' });
                    this.init();
                }
            }
            else if (connection === 'open') {
                this.qr = undefined;
                this.status = 'connected';
                LogSystem.add({ type: 'WHATSAPP', level: 'INFO', instance: this.id, message: 'Conexão estabelecida com sucesso' });
                console.log(`[Instance ${this.id}] Conexão aberta!`);
            }
        });
        this.sock.ev.on('messages.upsert', async (m) => {
            // DEBUG EXTREMO: Logando tudo que chega
            LogSystem.add({ type: 'SYSTEM', level: 'INFO', instance: this.id, message: `RAW UPSERT: ${m.type} | Count: ${m.messages.length}` });
            for (const msg of m.messages) {
                const from = msg.key.remoteJid;
                const isFromMe = msg.key.fromMe;
                const pushName = msg.pushName || 'Desconhecido';
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const type = Object.keys(msg.message || {})[0] || 'unknown';
                LogSystem.add({
                    type: 'SYSTEM',
                    level: 'INFO',
                    instance: this.id,
                    message: `[DEBUG] Msg de ${from?.slice(0, 6)}.. | Me: ${isFromMe} | Type: ${type} | Text: ${text.slice(0, 20)}...`
                });
                if (m.type === 'notify' || m.type === 'append') {
                    if (!isFromMe && this.settings.enabled) {
                        if (!text)
                            continue;
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
                            }).catch((e) => console.error(`[n8n Error]`, e.message));
                        }
                        // Integração Typebot
                        if (this.settings.typebotUrl && this.settings.typebotName) {
                            this.handleTypebot(from, text, pushName);
                        }
                        else {
                            LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: `⚠️ Typebot OFF: URL/Name vazios` });
                        }
                    }
                    else {
                        // Log do motivo de ignorar
                        if (isFromMe)
                            LogSystem.add({ type: 'SYSTEM', level: 'INFO', instance: this.id, message: `Ignorado: Mensagem enviada por mim` });
                        if (!this.settings.enabled)
                            LogSystem.add({ type: 'SYSTEM', level: 'WARN', instance: this.id, message: `Ignorado: Instância DESATIVADA` });
                    }
                }
            }
        });
    }
    typebotSessions = new Map();
    async handleTypebot(remoteJid, text, name) {
        try {
            // Normalizar URL (remover slash final se existir)
            const baseUrl = this.settings.typebotUrl?.replace(/\/$/, '') || '';
            const typebotName = this.settings.typebotName;
            if (!baseUrl || !typebotName) {
                LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: 'Configuração incompleta: URL ou Nome do bot ausentes.' });
                return;
            }
            const userId = remoteJid.replace(/[^0-9]/g, '');
            let sessionId = this.typebotSessions.get(remoteJid);
            let url = "";
            let body = {};
            if (!sessionId) {
                // START CHAT
                url = `${baseUrl}/api/v1/typebots/${typebotName}/startChat`;
                body = {
                    isStreamEnabled: false,
                    message: text,
                    user: { name }
                };
                LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `🔄 Conectando ao Typebot... [START] URL: ${url}` });
            }
            else {
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
            // Se for novo chat, guarda o ID da sessão
            if (!sessionId && response.data.sessionId) {
                this.typebotSessions.set(remoteJid, response.data.sessionId);
                LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `✅ Sessão criada: ${response.data.sessionId}` });
            }
            LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `⚡ Resposta Typebot (${duration}ms): ${response.status} OK` });
            // Processar mensagens do Bot
            const processMessages = async (messages) => {
                for (const botMsg of messages) {
                    if (botMsg.type === 'text') {
                        // Delay humano
                        const delay = this.settings.typebotDelay || 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        let messageText = '';
                        if (botMsg.content.richText) {
                            messageText = botMsg.content.richText.map((block) => block.children.map((child) => child.text).join('')).join('\n');
                        }
                        else if (botMsg.content.text) {
                            messageText = botMsg.content.text;
                        }
                        if (messageText) {
                            await this.sock?.sendMessage(remoteJid, { text: messageText });
                            LogSystem.add({ type: 'TYPEBOT', level: 'INFO', instance: this.id, message: `📤 Enviando resposta: "${messageText.substring(0, 30)}..."` });
                        }
                    }
                    else if (botMsg.type === 'image' || botMsg.type === 'video') {
                        // Opcional: Implementar envio de mídia no futuro
                        LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: `Media type '${botMsg.type}' ignorado (não implementado)` });
                    }
                }
            };
            if (response.data.messages) {
                await processMessages(response.data.messages);
            }
        }
        catch (e) {
            const status = e.response?.status || 'UNKNOWN';
            const errorData = JSON.stringify(e.response?.data || {});
            LogSystem.add({ type: 'TYPEBOT', level: 'ERROR', instance: this.id, message: `❌ Erro Conexão (${status}): ${errorData.substring(0, 100)}` });
            console.error(`[Typebot Error]`, e.response?.data || e.message);
            // Sessão inválida/expirada?
            if (e.response?.status === 404 && this.typebotSessions.has(remoteJid)) {
                LogSystem.add({ type: 'TYPEBOT', level: 'WARN', instance: this.id, message: 'Sessão expirada. Reiniciando fluxo na próxima mensagem.' });
                this.typebotSessions.delete(remoteJid);
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
    instances = new Map();
    async createInstance(id) {
        if (this.instances.has(id))
            return this.instances.get(id);
        const instance = new Instance(id);
        await instance.init();
        this.instances.set(id, instance);
        return instance;
    }
    getInstance(id) {
        return this.instances.get(id);
    }
    getInstances() {
        return Array.from(this.instances.values()).map(inst => ({
            id: inst.id,
            status: inst.status,
            hasQr: !!inst.qr
        }));
    }
    async removeInstance(id) {
        const instance = this.instances.get(id);
        if (instance) {
            await instance.logout();
            this.instances.delete(id);
        }
    }
}
//# sourceMappingURL=baileys.js.map