import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySocketIO from 'fastify-socket.io';
import { InstanceManager, LogSystem } from './baileys.js';
import { MetricsManager } from './metrics.js';
import dotenv from 'dotenv';
import path from 'path';
import QRCode from 'qrcode';
import { supabase } from './supabase.js';

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
fastify.register(fastifySocketIO as any, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const manager = new InstanceManager();

const ADMIN_EMAILS = ['victor@gmail.com', 'victorrolin@gmail.com']; // Lista de administradores

// Middleware de Autenticação Global (Agora via Tabela dashboard_users)
fastify.addHook('preHandler', async (request, reply) => {
    // Pular autenticação para o health check e login
    if (request.url === '/health' || request.url === '/login') return;

    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return reply.status(401).send({ error: 'Token não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificamos o token na nossa tabela (o token será o email para simplificar ou um payload)
    const { data: user, error } = await supabase
        .from('dashboard_users')
        .select('*')
        .eq('email', token) // Usando email como token simples para evitar complexidade de JWT agora
        .single();

    if (error || !user) {
        return reply.status(401).send({ error: 'Sessão inválida ou usuário bloqueado' });
    }

    if (user.banned) {
        return reply.status(403).send({ error: 'Sua conta está bloqueada' });
    }

    (request as any).user = user;
});

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
    const { id } = request.body as { id: string };
    if (!id) return reply.status(400).send({ error: 'ID é obrigatório' });
    await manager.createInstance(id);
    return { success: true };
});

// Obter configurações
fastify.get('/instances/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const instance = manager.getInstance(id);
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' });
    return instance.settings;
});

// Salvar configurações
fastify.post('/instances/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const settings = request.body as any;
    const instance = manager.getInstance(id);
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' });
    instance.saveSettings(settings);
    return { success: true };
});

// Obter QR Code de uma instância
fastify.get('/instances/:id/qr', async (request, reply) => {
    const { id } = request.params as { id: string };
    const instance = manager.getInstance(id);

    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' });
    if (!instance.qr) return reply.status(400).send({ error: 'QR Code não disponível ou já conectado' });

    try {
        // Gerar imagem PNG do QR Code
        const qrImage = await QRCode.toBuffer(instance.qr, {
            type: 'png',
            width: 512,
            margin: 2
        });

        reply.type('image/png');
        return reply.send(qrImage);
    } catch (error) {
        return reply.status(500).send({ error: 'Erro ao gerar QR Code' });
    }
});

// Deletar instância (Logout + Limpeza de Disco)
fastify.delete('/instances/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
        await manager.removeInstance(id);
        return { success: true };
    } catch (e: any) {
        return reply.status(500).send({
            error: 'Falha ao deletar instância',
            details: e.message
        });
    }
});

// Reset de instância (Força logout e regeneração de QR Code)
fastify.post('/instances/:id/reset', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
        const instance = manager.getInstance(id);
        if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' });

        // Fazer logout para limpar credenciais
        await instance.logout();

        // Aguardar um pouco para garantir limpeza
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reinicializar a instância
        await instance.init();

        return { success: true, message: 'Instância resetada. QR Code será gerado em breve.' };
    } catch (e: any) {
        return reply.status(500).send({
            error: 'Falha ao resetar instância',
            details: e.message
        });
    }
});


// Enviar mensagem via instância específica
fastify.post('/instances/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { number, message } = request.body as { number: string, message: string };

    const instance = manager.getInstance(id);
    if (!instance || instance.status !== 'connected' || !instance.sock) {
        return reply.status(400).send({ error: 'Instância não conectada' });
    }

    try {
        const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
        await instance.sock.sendMessage(jid, { text: message });
        return { success: true };
    } catch (error) {
        return reply.status(500).send({ error: 'Falha ao enviar mensagem' });
    }
});

fastify.get('/metrics', async (request, reply) => {
    return reply.send(MetricsManager.getAll());
});

fastify.get('/instances/:id/metrics', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(MetricsManager.get(id));
});

// --- Rota de Login Simplificada ---
fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    const { data: user, error } = await supabase
        .from('dashboard_users')
        .select('*')
        .eq('email', email)
        .eq('password', password) // Comparação direta conforme solicitado
        .single();

    if (error || !user) {
        return reply.status(401).send({ error: 'E-mail ou senha incorretos' });
    }

    if (user.banned) {
        return reply.status(403).send({ error: 'Sua conta está suspensa' });
    }

    return {
        success: true,
        user: {
            email: user.email,
            role: user.role
        },
        token: user.email // O email servirá como token de sessão
    };
});

// --- Rotas Administrativas de Usuários (IAM) ---

// Listar todos os usuários (Apenas Admin)
fastify.get('/users', async (request, reply) => {
    const currentUser = (request as any).user;
    if (currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Acesso negado: Apenas administradores podem gerenciar usuários' });
    }

    const { data, error } = await supabase.from('dashboard_users').select('*');
    if (error) return reply.status(500).send({ error: error.message });
    return data;
});

// Criar novo usuário (Apenas Admin)
fastify.post('/users', async (request, reply) => {
    const currentUser = (request as any).user;
    if (currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Acesso negado' });
    }

    const { email, password, role = 'operator' } = request.body as any;

    if (!password || password.length < 4) {
        return reply.status(400).send({ error: 'A senha deve ter pelo menos 4 caracteres' });
    }

    const { data, error } = await supabase
        .from('dashboard_users')
        .insert([{ email, password, role }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return reply.status(400).send({ error: 'E-mail já cadastrado' });
        return reply.status(400).send({ error: error.message });
    }

    return { success: true, user: data };
});

// Atualizar usuário (bloquear/desbloquear)
fastify.patch('/users/:id', async (request, reply) => {
    const currentUser = (request as any).user;
    if (currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Acesso negado' });
    }

    const { id } = request.params as { id: string };
    const { banned_until, ...updates } = request.body as any;

    // Converter o payload antigo para o novo formato de tabela
    const finalUpdates: any = { ...updates };
    if (banned_until !== undefined) {
        finalUpdates.banned = banned_until !== 'none';
    }

    const { data, error } = await supabase
        .from('dashboard_users')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) return reply.status(400).send({ error: error.message });
    return { success: true, user: data };
});

// Deletar usuário
fastify.delete('/users/:id', async (request, reply) => {
    const currentUser = (request as any).user;
    if (currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Acesso negado' });
    }

    const { id } = request.params as { id: string };
    const { error } = await supabase.from('dashboard_users').delete().eq('id', id);
    if (error) return reply.status(400).send({ error: error.message });
    return { success: true };
});

const start = async () => {
    try {
        await fastify.ready();

        const io = (fastify as any).io;
        if (io) {
            console.log('[Socket.io] Servidor IO pronto');
            LogSystem.setIO(io);
        } else {
            console.error('[Socket.io] OBJETO IO NÃO ENCONTRADO NO FASTIFY!');
        }

        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`[${new Date().toISOString()}] Automatech API rodando na porta 3001 | PID: ${process.pid} | CWD: ${process.cwd()}`);

        // Carregar instâncias existentes automaticamente (depois de liberar a porta)
        console.log('[Boot] Iniciando carregamento de instâncias...');
        await manager.loadExistingInstances();

        // Tratamento de encerramento gracioso
        const shutdown = async (signal: string) => {
            console.log(`\n[Server] Recebido sinal ${signal}. Encerrando...`);
            await manager.shutdownAll();
            await fastify.close();
            console.log('[Server] Servidor encerrado com sucesso.');
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
