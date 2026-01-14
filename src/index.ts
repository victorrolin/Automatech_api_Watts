import Fastify from 'fastify';
import { connectToWhatsApp } from './baileys.js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
    logger: true
});

let sock: any;

fastify.get('/status', async (request, reply) => {
    return { status: sock ? 'connected' : 'disconnected' };
});

fastify.post('/send-message', async (request, reply) => {
    const { number, message } = request.body as any;

    if (!sock) {
        return reply.status(500).send({ error: 'WhatsApp não conectado' });
    }

    try {
        const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        return { success: true };
    } catch (error) {
        return reply.status(500).send({ error: 'Falha ao enviar mensagem' });
    }
});

const start = async () => {
    try {
        sock = await connectToWhatsApp();
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log('Servidor rodando na porta 3001');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
