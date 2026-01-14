import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, WASocket, ConnectionState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
const logger = pino({ level: 'error' });
export class Instance {
    id;
    sock;
    qr;
    status = 'disconnected';
    authPath;
    constructor(id) {
        this.id = id;
        this.authPath = path.join(process.cwd(), 'sessions', id);
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
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    this.init();
                }
            }
            else if (connection === 'open') {
                this.qr = undefined;
                this.status = 'connected';
                console.log(`[Instance ${this.id}] Conexão aberta!`);
            }
        });
        this.sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe) {
                        console.log(`[Instance ${this.id}] Mensagem de ${msg.key.remoteJid}: ${msg.message?.conversation || msg.message?.extendedTextMessage?.text}`);
                        // TODO: Enviar para Webhook
                    }
                }
            }
        });
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