import Fastify from 'fastify';
import cors from '@fastify/cors';
import { InstanceManager } from './baileys.js';
import dotenv from 'dotenv';
dotenv.config();
const fastify = Fastify({
    logger: true
});
// Registrar CORS
fastify.register(cors, {
    origin: '*', // Em produção, mude para o domínio real
});
const manager = new InstanceManager();
// Listar instâncias
fastify.get('/instances', async (request, reply) => {
    return manager.getInstances();
});
// Criar nova instância
fastify.post('/instances', async (request, reply) => {
    const { id } = request.body;
    if (!id)
        return reply.status(400).send({ error: 'ID da instância é obrigatório' });
    const instance = await manager.createInstance(id);
    return { id: instance.id, status: instance.status };
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
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log('Automatech API rodando na porta 3001');
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map