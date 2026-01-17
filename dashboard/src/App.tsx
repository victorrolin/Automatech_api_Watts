import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Settings,
    RefreshCw,
    MessageSquare,
    Activity,
    Layout,
    Bell,
    Layers,
    Terminal,
    LogOut,
    CheckCircle2,
    AlertCircle,
    Zap,
    Pause,
    Play,
    BarChart2,
    Users,
    UserPlus,
    UserMinus,
    ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

const getApiUrl = (): string => {
    const { hostname } = window.location;

    // Se for localhost (desenvolvimento)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:3001';
    }

    // Em qualquer outro caso (produção), usa o domínio correto com HTTPS
    return 'https://api.wattsapi.automatech.tech';
};

const API_URL = getApiUrl();


const translations = {
    en: {
        instances: 'Instances',
        logs: 'Real-time Logs',
        automation: 'Automation',
        admin_account: 'Admin Account',
        connected_instances: 'Connected Instances',
        terminal_activity: 'Terminal Activity',
        automation_hub: 'Automation Hub',
        manage_infra: 'Manage your WhatsApp infrastructure with ease.',
        new_instance: 'New Instance',
        id_label: 'ID',
        config: 'Config',
        logs_btn: 'Logs',
        scan_qr: 'Scan QR Code',
        qr_ready: 'QR Code Ready',
        qr_scan_logs: 'Scanning available in server logs...',
        activity_stream: 'Activity Stream (Last 100 entries)',
        filtering: 'Filtering',
        instance_settings: 'Instance Settings',
        configuring: 'Configuring',
        n8n_url: 'N8N URL',
        typebot_url: 'Typebot URL',
        bot_name: 'Bot Name',
        api_key: 'API Key',
        delay_ms: 'Delay (ms)',
        session_timeout: 'Session Timeout (min)',
        instance_status: 'Instance Status',
        enabled: 'Enabled',
        disabled: 'Disabled',
        save_changes: 'Save Changes',
        cancel: 'Cancel',
        init_conn: 'Initialize Connection',
        enter_id: 'Enter a unique identifier for your new WhatsApp instance.',
        deploy: 'Deploy Instance',
        delete_confirm: 'Do you really want to delete instance {id}?',
        settings_saved: 'Settings saved!',
        save_error: 'Error saving',
        create_error: 'Error creating instance',
        paused: 'Paused',
        resume: 'Resume Bot',
        pause: 'Pause Bot',
        analytics: 'Analytics',
        total_msg: 'Total Messages',
        avg_response: 'Avg Response',
        success_rate: 'Success Rate',
        messages_flow: 'Message Flow (Last 24h)',
        bot_performance: 'Bot Performance',
        login_title: 'Access Panel',
        login_subtitle: 'Enter your credentials to manage your bots.',
        email: 'Email',
        password: 'Password',
        login_btn: 'Sign In',
        invalid_login: 'Invalid credentials',
        logout: 'Sign Out',
        users_title: 'Users Management',
        users_subtitle: 'Create and manage system operators.',
        new_user: 'New User',
        created_at: 'Created at',
        last_login: 'Last login',
        status: 'Status',
        actions: 'Actions',
        delete_user_confirm: 'Do you really want to delete this user?'
    },
    pt: {
        instances: 'Instâncias',
        logs: 'Logs em tempo real',
        automation: 'Automação',
        admin_account: 'Conta Admin',
        connected_instances: 'Instâncias Conectadas',
        terminal_activity: 'Atividade do Terminal',
        automation_hub: 'Hub de Automação',
        manage_infra: 'Gerencie sua infraestrutura do WhatsApp com facilidade.',
        new_instance: 'Nova Instância',
        id_label: 'ID',
        config: 'Config',
        logs_btn: 'Logs',
        scan_qr: 'Escanear QR Code',
        qr_ready: 'QR Code Pronto',
        qr_scan_logs: 'Escaneamento disponível nos logs do servidor...',
        activity_stream: 'Fluxo de Atividade (Últimas 100 entradas)',
        filtering: 'Filtrando',
        instance_settings: 'Configurações da Instância',
        configuring: 'Configurando',
        n8n_url: 'URL do N8N',
        typebot_url: 'URL do Typebot',
        bot_name: 'Nome do Bot',
        api_key: 'Chave da API',
        delay_ms: 'Atraso (ms)',
        session_timeout: 'Timeout de Sessão (min)',
        instance_status: 'Status da Instância',
        enabled: 'Ativado',
        disabled: 'Desativado',
        save_changes: 'Salvar Alterações',
        cancel: 'Cancelar',
        init_conn: 'Iniciar Conexão',
        enter_id: 'Digite um identificador único para sua nova instância do WhatsApp.',
        deploy: 'Implantar Instância',
        delete_confirm: 'Deseja realmente deletar a instância {id}?',
        settings_saved: 'Configurações salvas!',
        save_error: 'Erro ao salvar',
        create_error: 'Erro ao criar instância',
        paused: 'Pausado',
        resume: 'Retomar Bot',
        pause: 'Pausar Bot',
        analytics: 'Análise',
        total_msg: 'Total de Mensagens',
        avg_response: 'Tempo Médio',
        success_rate: 'Taxa de Sucesso',
        messages_flow: 'Fluxo de Mensagens (24h)',
        bot_performance: 'Desempenho do Bot',
        login_title: 'Acessar Painel',
        login_subtitle: 'Digite suas credenciais para gerenciar seus bots.',
        email: 'E-mail',
        password: 'Senha',
        login_btn: 'Entrar no Sistema',
        invalid_login: 'Credenciais inválidas',
        logout: 'Sair',
        users_title: 'Gestão de Usuários',
        users_subtitle: 'Crie e gerencie os operadores do sistema.',
        new_user: 'Novo Usuário',
        created_at: 'Criado em',
        last_login: 'Último acesso',
        status: 'Status',
        actions: 'Ações',
        delete_user_confirm: 'Deseja realmente excluir este usuário?'
    }
};

interface Instance {
    id: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'qr';
    hasQr: boolean;
    isPaused?: boolean;
}

interface AllMetrics {
    [key: string]: {
        messagesReceived: number;
        messagesSent: number;
        typebotRequests: number;
        typebotSuccess: number;
        typebotErrors: number;
        averageResponseTime: number;
        totalResponseTime: number;
        lastUpdate: string;
    }
}

interface LogEntry {
    timestamp: string;
    type: 'WHATSAPP' | 'TYPEBOT' | 'N8N' | 'SYSTEM';
    instance: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

interface UserIAM {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    banned_until?: string;
}

interface InstanceSettings {
    n8nUrl?: string;
    typebotUrl?: string;
    typebotName?: string;
    typebotApiKey?: string;
    typebotDelay?: number;
    typebotSessionTimeout?: number;
    enabled?: boolean;
    isPaused?: boolean;
}

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(true);

    const [instances, setInstances] = useState<Instance[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newInstanceId, setNewInstanceId] = useState('');
    const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
    const [settings, setSettings] = useState<InstanceSettings>({});
    const [activeTab, setActiveTab] = useState<'instances' | 'logs' | 'automation' | 'users'>('instances');
    const [metrics, setMetrics] = useState<AllMetrics>({});
    const [usersIAM, setUsersIAM] = useState<UserIAM[]>([]);
    const [showUserModal, setShowUserModal] = useState(false);

    // Lista de administradores em sincronia com o backend
    const isAdmin = (user as any)?.role === 'admin';
    const [language, setLanguage] = useState<'pt' | 'en'>(() => {
        const saved = localStorage.getItem('app_lang');
        return (saved === 'pt' || saved === 'en') ? saved : 'pt';
    });

    const t = translations[language];

    const toggleLanguage = () => {
        const next = language === 'pt' ? 'en' : 'pt';
        setLanguage(next);
        localStorage.setItem('app_lang', next);
    };

    // Custom Auth Effect (Manual Session)
    useEffect(() => {
        const savedToken = localStorage.getItem('app_token');
        const savedUser = localStorage.getItem('app_user');

        if (savedToken && savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setupAxiosInterceptor(savedToken);
        }

        setLoading(false);
    }, []);

    const setupAxiosInterceptor = (token: string) => {
        // Remover interceptores antigos para não duplicar
        axios.interceptors.request.clear();
        axios.interceptors.request.use((config) => {
            config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await axios.post(`${API_URL}/login`, {
                email: loginEmail,
                password: loginPassword
            });

            const { user, token } = res.data;
            localStorage.setItem('app_token', token);
            localStorage.setItem('app_user', JSON.stringify(user));

            setUser(user);
            setupAxiosInterceptor(token);
        } catch (e: any) {
            setLoginError(e.response?.data?.error || t.invalid_login);
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('app_token');
        localStorage.removeItem('app_user');
        window.location.reload();
    };

    useEffect(() => {
        if (!user) return;

        const socket = io(API_URL);

        socket.on('new_log', (log: LogEntry) => {
            setLogs(prev => [log, ...prev].slice(0, 100));
        });

        fetchInstances();
        fetchLogs();
        fetchMetrics();
        fetchUsers();

        const interval = setInterval(() => {
            fetchInstances();
            fetchMetrics();
            if (activeTab === 'users') fetchUsers();
        }, 5000);
        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedInstance) {
            fetchSettings(selectedInstance);
        }
    }, [selectedInstance]);

    const fetchInstances = async () => {
        try {
            const res = await axios.get(`${API_URL}/instances`);
            setInstances(res.data);
        } catch (e) {
            console.error('Erro ao buscar instâncias');
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${API_URL}/logs`);
            setLogs(res.data);
        } catch (e) {
            console.error('Erro ao buscar logs');
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await axios.get(`${API_URL}/metrics`);
            setMetrics(res.data);
        } catch (e) {
            console.error('Erro ao buscar métricas');
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsersIAM(res.data);
        } catch (e) {
            console.error('Erro ao buscar usuários');
        }
    };

    const fetchSettings = async (id: string) => {
        try {
            const res = await axios.get(`${API_URL}/instances/${id}/settings`);
            setSettings(res.data);
        } catch (e) {
            console.error('Erro ao buscar configurações');
        }
    };

    const createInstance = async () => {
        if (!newInstanceId) return;
        try {
            await axios.post(`${API_URL}/instances`, { id: newInstanceId });
            setNewInstanceId('');
            setShowNewModal(false);
            fetchInstances();
        } catch (e) {
            alert(t.create_error);
        }
    };

    const deleteInstance = async (id: string) => {
        if (!confirm(t.delete_confirm.replace('{id}', id))) return;
        try {
            await axios.delete(`${API_URL}/instances/${id}`);
            fetchInstances();
            if (selectedInstance === id) setSelectedInstance(null);
        } catch (e) {
            alert(t.create_error);
        }
    };

    const togglePause = async (id: string, currentStatus: boolean) => {
        try {
            // Primeiro buscamos as settings atuais
            const res = await axios.get(`${API_URL}/instances/${id}/settings`);
            const currentSettings = res.data;

            // Enviamos o update com o isPaused invertido
            await axios.post(`${API_URL}/instances/${id}/settings`, {
                ...currentSettings,
                isPaused: !currentStatus
            });
            fetchInstances();
        } catch (e) {
            console.error('Erro ao alternar pausa');
        }
    };

    const saveSettings = async () => {
        if (!selectedInstance) return;
        try {
            await axios.post(`${API_URL}/instances/${selectedInstance}/settings`, settings);
            alert(t.settings_saved);
        } catch (e) {
            alert(t.save_error);
        }
    };

    const deleteUserIAM = async (id: string) => {
        if (!confirm(t.delete_user_confirm)) return;
        try {
            await axios.delete(`${API_URL}/users/${id}`);
            fetchUsers();
        } catch (e) {
            alert('Erro ao excluir usuário');
        }
    };

    const toggleBan = async (id: string, isBanned: boolean) => {
        try {
            await axios.patch(`${API_URL}/users/${id}`, {
                ban_duration: isBanned ? 'none' : '876000h'
            });
            fetchUsers();
        } catch (e) {
            alert('Erro ao alterar status do usuário');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, { email: loginEmail, password: loginPassword });
            setShowUserModal(false);
            setLoginEmail('');
            setLoginPassword('');
            fetchUsers();
            alert('Usuário criado com sucesso!');
        } catch (e: any) {
            const errorMsg = e.response?.data?.error || 'Erro ao criar usuário';
            alert(errorMsg);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-10 w-full max-w-md shadow-2xl relative z-10 border-white/5"
                >
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-[#00F5FF] to-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00F5FF]/20 mb-6 group cursor-pointer">
                            <Zap className="text-black w-10 h-10 group-hover:scale-110 transition-transform" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Automatech</h1>
                        <p className="text-slate-400 text-sm text-center">{t.login_subtitle}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                {t.email}
                            </label>
                            <input
                                type="email"
                                required
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                placeholder="admin@automatech.tech"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                {t.password}
                            </label>
                            <input
                                type="password"
                                required
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>

                        {loginError && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-semibold flex items-center gap-2"
                            >
                                <AlertCircle size={14} />
                                {loginError}
                            </motion.div>
                        )}

                        <button type="submit" className="w-full btn-premium justify-center py-4 text-sm font-bold mt-4">
                            {t.login_btn}
                        </button>
                    </form>

                    <div className="mt-8 flex justify-center gap-4">
                        <button onClick={toggleLanguage} className="text-[10px] text-slate-500 hover:text-cyan-400 font-bold uppercase tracking-widest transition-colors cursor-pointer border-none bg-transparent">
                            {language === 'pt' ? 'English' : 'Português'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar Ultra-Premium */}
            <aside className="sidebar">
                <div className="flex items-center gap-3 mb-12 px-4">
                    <div className="w-10 h-10 bg-gradient-to-tr from-[#00F5FF] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#00F5FF]/20">
                        <Zap className="text-black w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Automatech</span>
                </div>

                <nav className="flex-1">
                    <button
                        onClick={() => setActiveTab('instances')}
                        className={`nav-link w-full border-none cursor-pointer ${activeTab === 'instances' ? 'active' : ''}`}
                    >
                        <Layers size={20} />
                        <span>{t.instances}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`nav-link w-full border-none cursor-pointer ${activeTab === 'logs' ? 'active' : ''}`}
                    >
                        <Terminal size={20} />
                        <span>{t.logs}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('automation')}
                        className={`nav-link w-full border-none cursor-pointer ${activeTab === 'automation' ? 'active' : ''}`}
                    >
                        <Activity size={20} />
                        <span>{t.automation}</span>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`nav-link w-full border-none cursor-pointer ${activeTab === 'users' ? 'active' : ''}`}
                        >
                            <Users size={20} />
                            <span>Usuários</span>
                        </button>
                    )}
                </nav>

                <div className="pt-6 border-t border-white/5 px-4 shrink-0">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{user?.email}</p>
                            <p className="text-[10px] text-slate-500">{isAdmin ? 'Administrator' : 'Operator'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="nav-link w-full border-none cursor-pointer text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>{t.logout}</span>
                    </button>
                    <div className="mt-8 mb-4">
                        <button
                            onClick={toggleLanguage}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer border border-white/5 rounded-lg bg-transparent"
                        >
                            <Layout size={12} />
                            {language === 'pt' ? 'English' : 'Português'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] p-10">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {activeTab === 'instances' ? t.connected_instances :
                                activeTab === 'logs' ? t.terminal_activity :
                                    activeTab === 'users' ? t.users_title : t.automation_hub}
                        </h1>
                        <p className="text-slate-400">{activeTab === 'users' ? t.users_subtitle : t.manage_infra}</p>
                    </div>
                    {activeTab === 'users' ? (
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="btn-premium"
                        >
                            <UserPlus size={20} />
                            <span>{t.new_user}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="btn-premium"
                        >
                            <Plus size={20} />
                            <span>{t.new_instance}</span>
                        </button>
                    )}
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'instances' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {instances.map(inst => (
                                <motion.div
                                    key={inst.id}
                                    layoutId={inst.id}
                                    className="glass-card p-6 rounded-2xl relative overflow-hidden group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${inst.status === 'connected' ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
                                                <MessageSquare className={inst.status === 'connected' ? 'text-emerald-400' : 'text-slate-400'} size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{inst.id}</h3>
                                                <p className="text-xs text-slate-500">{t.id_label}: {inst.id.toLowerCase()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {inst.status === 'connected' && (
                                                <button
                                                    onClick={() => togglePause(inst.id, inst.isPaused || false)}
                                                    className={`p-2 rounded-lg transition-all cursor-pointer ${inst.isPaused
                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-400/20'
                                                        }`}
                                                    title={inst.isPaused ? t.resume : t.pause}
                                                >
                                                    {inst.isPaused ? <Play size={14} /> : <Pause size={14} />}
                                                </button>
                                            )}
                                            <div className={`status-badge ${inst.isPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : inst.status === 'connected' ? 'status-online' : 'status-offline'}`}>
                                                {inst.isPaused ? t.paused : inst.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedInstance(inst.id)}
                                            className="flex-1 glass-panel py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer"
                                        >
                                            <Settings size={14} />
                                            {t.config}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedInstance(inst.id);
                                                setActiveTab('logs');
                                            }}
                                            className="flex-1 glass-panel py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer"
                                        >
                                            <Terminal size={14} />
                                            {t.logs_btn}
                                        </button>
                                        <button
                                            onClick={() => deleteInstance(inst.id)}
                                            className="w-10 h-10 glass-panel flex items-center justify-center text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {inst.status === 'qr' && (
                                            <button
                                                onClick={() => {
                                                    setQrInstanceId(inst.id);
                                                    setShowQrModal(true);
                                                }}
                                                className="w-full glass-panel py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer mt-1"
                                            >
                                                <Zap size={14} className="animate-pulse" />
                                                {t.scan_qr}
                                            </button>
                                        )}
                                    </div>

                                    {inst.status === 'qr' && (
                                        <div className="mt-4 p-4 bg-white/5 rounded-xl text-center">
                                            <p className="text-xs text-cyan-400 font-semibold mb-2 flex items-center justify-center gap-2">
                                                <RefreshCw size={12} className="animate-spin" />
                                                {t.qr_ready}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{t.qr_scan_logs}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel rounded-3xl overflow-hidden border-white/5"
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-4">{t.email}</th>
                                        <th className="px-6 py-4">{t.created_at}</th>
                                        <th className="px-6 py-4">{t.last_login}</th>
                                        <th className="px-6 py-4">{t.status}</th>
                                        <th className="px-6 py-4 text-right">{t.actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {usersIAM.map(u => (
                                        <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-semibold">{u.email}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '---'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.banned_until ? (
                                                    <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded text-[10px] font-bold uppercase">Banned</span>
                                                ) : (
                                                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase">Active</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleBan(u.id, !!u.banned_until)}
                                                        className={`p-2 rounded-lg transition-colors ${u.banned_until ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                                                    >
                                                        {u.banned_until ? <ShieldAlert size={16} /> : <UserMinus size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUserIAM(u.id)}
                                                        className="p-2 bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {activeTab === 'logs' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-panel p-6 rounded-3xl min-h-[600px] border-white/5"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Terminal size={18} />
                                    <span className="text-sm font-medium">{t.activity_stream}</span>
                                </div>
                                {selectedInstance && (
                                    <div className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 py-1.5 px-3 rounded-lg border border-cyan-500/20 text-xs font-semibold">
                                        {t.filtering}: {selectedInstance}
                                        <button
                                            onClick={() => setSelectedInstance(null)}
                                            className="ml-1 opacity-60 hover:opacity-100 cursor-pointer"
                                        >
                                            <Plus size={14} className="rotate-45" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 font-mono text-xs overflow-y-auto max-h-[600px] pr-4 custom-scrollbar">
                                {logs
                                    .filter(log => !selectedInstance || log.instance === selectedInstance)
                                    .map((log, i) => (
                                        <div key={i} className="flex gap-4 p-2 rounded hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-cyan-500/50">
                                            <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            <span className={`font-bold shrink-0 w-20 ${log.type === 'WHATSAPP' ? 'text-emerald-400' :
                                                log.type === 'TYPEBOT' ? 'text-purple-400' :
                                                    log.type === 'N8N' ? 'text-amber-400' : 'text-blue-400'
                                                }`}>
                                                [{log.type}]
                                            </span>
                                            <span className={`shrink-0 w-24 font-semibold ${log.level === 'ERROR' ? 'text-rose-400' :
                                                log.level === 'WARN' ? 'text-amber-400' : 'text-slate-400'
                                                }`}>
                                                {log.level}
                                            </span>
                                            <span className="text-slate-300 break-all">{log.message}</span>
                                            <span className="ml-auto text-slate-600 text-[10px]">#{log.instance}</span>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'automation' && (
                        <motion.div
                            key="automation"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6 pb-20"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="glass-card p-6 rounded-2xl border-white/5 bg-gradient-to-br from-cyan-500/10 to-transparent">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.total_msg}</p>
                                    <h3 className="text-3xl font-black text-white">
                                        {Object.values(metrics).reduce((acc, m) => acc + (m.messagesReceived + m.messagesSent), 0)}
                                    </h3>
                                    <p className="text-[10px] text-cyan-400 mt-2 flex items-center gap-1">
                                        <Zap size={10} /> +12% vs last week
                                    </p>
                                </div>
                                <div className="glass-card p-6 rounded-2xl border-white/5">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.avg_response}</p>
                                    <h3 className="text-3xl font-black text-white">
                                        {Math.round(Object.values(metrics).reduce((acc, m) => acc + m.averageResponseTime, 0) / (Object.values(metrics).length || 1)) / 1000}s
                                    </h3>
                                    <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Human Simulation Active
                                    </p>
                                </div>
                                <div className="glass-card p-6 rounded-2xl border-white/5">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.success_rate}</p>
                                    <h3 className="text-3xl font-black text-white">
                                        {Math.round((Object.values(metrics).reduce((acc, m) => acc + m.typebotSuccess, 0) /
                                            (Object.values(metrics).reduce((acc, m) => acc + m.typebotRequests, 0) || 1)) * 100)}%
                                    </h3>
                                    <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                            style={{ width: `${Math.round((Object.values(metrics).reduce((acc, m) => acc + m.typebotSuccess, 0) / (Object.values(metrics).reduce((acc, m) => acc + m.typebotRequests, 0) || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="glass-card p-6 rounded-2xl border-white/5 bg-gradient-to-br from-purple-500/10 to-transparent">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Bot API Status</p>
                                    <h3 className="text-3xl font-black text-emerald-400">Stable</h3>
                                    <p className="text-[10px] text-slate-500 mt-2">Latency: 45ms</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-3xl border-white/5">
                                    <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                                        <Activity size={18} className="text-cyan-400" />
                                        {t.messages_flow}
                                    </h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={Object.entries(metrics).map(([id, m]) => ({ name: id, sent: m.messagesSent, recv: m.messagesReceived }))}>
                                                <defs>
                                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '12px' }}
                                                />
                                                <Area type="monotone" dataKey="sent" stroke="#22d3ee" fillOpacity={1} fill="url(#colorSent)" />
                                                <Area type="monotone" dataKey="recv" stroke="#8b5cf6" fillOpacity={0.1} fill="#8b5cf6" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="glass-panel p-6 rounded-3xl border-white/5">
                                    <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                                        <BarChart2 size={18} className="text-purple-400" />
                                        {t.bot_performance}
                                    </h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={Object.entries(metrics).map(([id, m]) => ({ name: id, success: m.typebotSuccess, errors: m.typebotErrors }))}>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                />
                                                <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="errors" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Panel (Modal-like) */}
                <AnimatePresence>
                    {selectedInstance && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="glass-panel p-8 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                                            <Settings className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">{t.instance_settings}</h2>
                                            <p className="text-sm text-slate-400">{t.configuring}: {selectedInstance}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedInstance(null)}
                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                                    >
                                        <Plus size={24} className="rotate-45" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <label className="block">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.n8n_url}</span>
                                            <input
                                                type="text"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                value={settings.n8nUrl || ''}
                                                onChange={e => setSettings({ ...settings, n8nUrl: e.target.value })}
                                                placeholder="https://n8n.yourdomain.com/webhook..."
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.typebot_url}</span>
                                            <input
                                                type="text"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                value={settings.typebotUrl || ''}
                                                onChange={e => setSettings({ ...settings, typebotUrl: e.target.value })}
                                                placeholder="https://typebot.yourdomain.com"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.bot_name}</span>
                                            <input
                                                type="text"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                value={settings.typebotName || ''}
                                                onChange={e => setSettings({ ...settings, typebotName: e.target.value })}
                                                placeholder="my-personal-bot"
                                            />
                                        </label>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.api_key}</span>
                                            <input
                                                type="password"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                value={settings.typebotApiKey || ''}
                                                onChange={e => setSettings({ ...settings, typebotApiKey: e.target.value })}
                                                placeholder="Bearer your-token..."
                                            />
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.delay_ms}</span>
                                                <input
                                                    type="number"
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                    value={settings.typebotDelay || 1000}
                                                    onChange={e => setSettings({ ...settings, typebotDelay: parseInt(e.target.value) })}
                                                />
                                            </label>
                                            <label className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.session_timeout}</span>
                                                <input
                                                    type="number"
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                                    value={settings.typebotSessionTimeout || 2}
                                                    onChange={e => setSettings({ ...settings, typebotSessionTimeout: parseInt(e.target.value) })}
                                                    placeholder="2"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex gap-4">
                                            <label className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.instance_status}</span>
                                                <button
                                                    onClick={() => setSettings({ ...settings, enabled: settings.enabled === false ? true : false })}
                                                    className={`w-full h-[47px] rounded-xl flex items-center justify-center gap-2 border transition-all cursor-pointer ${settings.enabled !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        }`}
                                                >
                                                    {settings.enabled !== false ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                    {settings.enabled !== false ? t.enabled : t.disabled}
                                                </button>
                                            </label>
                                            <label className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Takeover (Pausa)</span>
                                                <button
                                                    onClick={() => setSettings({ ...settings, isPaused: !settings.isPaused })}
                                                    className={`w-full h-[47px] rounded-xl flex items-center justify-center gap-2 border transition-all cursor-pointer ${!settings.isPaused ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}
                                                >
                                                    {settings.isPaused ? <Play size={16} /> : <Pause size={16} />}
                                                    {settings.isPaused ? t.resume : t.pause}
                                                </button>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={saveSettings}
                                        className="btn-premium flex-1 justify-center"
                                    >
                                        {t.save_changes}
                                    </button>
                                    <button
                                        onClick={() => setSelectedInstance(null)}
                                        className="px-6 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        {t.cancel}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* New Instance Modal */}
                <AnimatePresence>
                    {showNewModal && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="glass-panel p-10 rounded-[40px] w-full max-w-lg text-center relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                                <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                                    <Zap className="text-black w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4">{t.init_conn}</h2>
                                <p className="text-slate-400 mb-8">{t.enter_id}</p>

                                <div className="space-y-6">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-xl font-semibold focus:border-cyan-500/50 outline-none transition-all"
                                            placeholder="Ex: Marketing_01"
                                            value={newInstanceId}
                                            onChange={e => setNewInstanceId(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={createInstance}
                                            className="btn-premium flex-1 h-14 justify-center"
                                        >
                                            {t.deploy}
                                        </button>
                                        <button
                                            onClick={() => setShowNewModal(false)}
                                            className="px-8 rounded-2xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            {t.cancel}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modal de QR Code */}
                <AnimatePresence>
                    {showQrModal && qrInstanceId && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="glass-card p-8 rounded-3xl max-w-md w-full relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                                <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-purple-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                                    <Zap className="text-black w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold mb-4 text-center">QR Code - {qrInstanceId}</h2>
                                <p className="text-slate-400 mb-6 text-center text-sm">
                                    Escaneie o QR Code abaixo com o WhatsApp para conectar a instância.
                                </p>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                                    <div className="bg-white p-4 rounded-xl mx-auto w-fit">
                                        <img
                                            src={`${API_URL}/instances/${qrInstanceId}/qr`}
                                            alt="QR Code"
                                            className="w-64 h-64"
                                            onError={(e) => {
                                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%2364748b" font-family="sans-serif" font-size="14">QR Code não disponível</text></svg>';
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            // Recarregar QR Code
                                            const img = document.querySelector(`img[src^="${API_URL}/instances/${qrInstanceId}/qr"]`) as HTMLImageElement;
                                            if (img) img.src = `${API_URL}/instances/${qrInstanceId}/qr?t=${Date.now()}`;

                                        }}
                                        className="flex-1 glass-panel py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer"
                                    >
                                        <RefreshCw size={16} />
                                        Atualizar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowQrModal(false);
                                            setQrInstanceId(null);
                                        }}
                                        className="flex-1 px-8 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modal Novo Usuário */}
                <AnimatePresence>
                    {showUserModal && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowUserModal(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="glass-panel p-8 w-full max-w-md relative z-10 border-white/5"
                            >
                                <h2 className="text-2xl font-bold mb-2">{t.new_user}</h2>
                                <p className="text-slate-400 text-sm mb-8">{t.users_subtitle}</p>

                                <form onSubmit={handleCreateUser} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                                            {t.email}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={loginEmail}
                                            onChange={e => setLoginEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                                            {t.password}
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={loginPassword}
                                            onChange={e => setLoginPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-cyan-500/50 outline-none transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setShowUserModal(false)}
                                            className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                                        >
                                            {t.cancel}
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] btn-premium justify-center py-3"
                                        >
                                            {t.new_user}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default App;
