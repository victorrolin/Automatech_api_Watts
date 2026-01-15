import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySocketIO from 'fastify-socket.io';
import { InstanceManager, LogSystem } from './baileys.js';
import dotenv from 'dotenv';
dotenv.config();
const fastify = Fastify({
    logger: true
});
// Registrar CORS com todos os métodos necessários
fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
// Registrar Socket.io
fastify.register(fastifySocketIO, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const manager = new InstanceManager();
// Health Check
fastify.get('/health', async (request, reply) => {
    return { status: 'online', timestamp: new Date().toISOString() };
});
// Listar logs
fastify.get('/logs', async (request, reply) => {
    return LogSystem.getLogs();
});
// Listar instâncias
fastify.get('/instances', async (request, reply) => {
    return manager.getInstances();
});
// Criar instância
fastify.post('/instances', async (request, reply) => {
    const { id } = request.body;
    if (!id)
        return reply.status(400).send({ error: 'ID é obrigatório' });
    await manager.createInstance(id);
    return { success: true };
});
// Obter configurações
fastify.get('/instances/:id/settings', async (request, reply) => {
    const { id } = request.params;
    const instance = manager.getInstance(id);
    if (!instance)
        return reply.status(404).send({ error: 'Instância não encontrada' });
    return instance.settings;
});
// Salvar configurações
fastify.post('/instances/:id/settings', async (request, reply) => {
    const { id } = request.params;
    const settings = request.body;
    const instance = manager.getInstance(id);
    if (!instance)
        return reply.status(404).send({ error: 'Instância não encontrada' });
    instance.saveSettings(settings);
    return { success: true };
});
// Obter QR Code de uma instância
fastify.get('/instances/:id/qr', async (request, reply) => {
    const { id } = request.params;
    const instance = manager.getInstance(id);
    if (!instance)
        return reply.status(404).send({ error: 'Instância não encontrada' });
    if (!instance.qr)
        return reply.status(400).send({ error: 'QR Code não disponível ou já conectado' });
    return { qr: instance.qr };
});
// Deletar instância (Logout)
fastify.delete('/instances/:id', async (request, reply) => {
    const { id } = request.params;
    await manager.removeInstance(id);
    return { success: true };
});
// Enviar mensagem via instância específica
fastify.post('/instances/:id/send', async (request, reply) => {
    const { id } = request.params;
    const { number, message } = request.body;
    const instance = manager.getInstance(id);
    if (!instance || instance.status !== 'connected' || !instance.sock) {
        return reply.status(400).send({ error: 'Instância não conectada' });
    }
    try {
        const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
        await instance.sock.sendMessage(jid, { text: message });
        return { success: true };
    }
    catch (error) {
        return reply.status(500).send({ error: 'Falha ao enviar mensagem' });
    }
});
const start = async () => {
    try {
        await fastify.ready();
        const io = fastify.io;
        if (io) {
            console.log('[Socket.io] Servidor IO pronto');
            LogSystem.setIO(io);
        }
        else {
            console.error('[Socket.io] OBJETO IO NÃO ENCONTRADO NO FASTIFY!');
        }
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`[${new Date().toISOString()}] Automatech API rodando na porta 3001`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map