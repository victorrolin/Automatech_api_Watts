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
    Zap
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

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
        create_error: 'Error creating instance'
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
        create_error: 'Erro ao criar instância'
    }
};

interface Instance {
    id: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'qr';
    hasQr: boolean;
}

interface LogEntry {
    timestamp: string;
    type: 'WHATSAPP' | 'TYPEBOT' | 'N8N' | 'SYSTEM';
    instance: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

interface InstanceSettings {
    n8nUrl?: string;
    typebotUrl?: string;
    typebotName?: string;
    typebotApiKey?: string;
    typebotDelay?: number;
    typebotSessionTimeout?: number;
    enabled?: boolean;
}

function App() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newInstanceId, setNewInstanceId] = useState('');
    const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
    const [settings, setSettings] = useState<InstanceSettings>({});
    const [activeTab, setActiveTab] = useState<'instances' | 'logs' | 'automation'>('instances');
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

    useEffect(() => {
        const socket = io(API_URL);

        socket.on('new_log', (log: LogEntry) => {
            setLogs(prev => [log, ...prev].slice(0, 100));
        });

        fetchInstances();
        fetchLogs();

        const interval = setInterval(fetchInstances, 5000);
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
            alert(t.create_error); // Reuse generic error or add delete_error
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
                </nav>

                <div className="px-4 mb-4">
                    <button
                        onClick={toggleLanguage}
                        className="w-full glass-panel py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer border-white/5"
                    >
                        <RefreshCw size={14} className={language === 'en' ? 'rotate-180' : ''} />
                        {language === 'pt' ? 'English (EN)' : 'Português (PT)'}
                    </button>
                </div>

                <div className="px-6 mb-8">
                    <div className="glass-card p-4 rounded-2xl flex items-center gap-3 brightness-90">
                        <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold">Victor Rolin</p>
                            <p className="text-[10px] text-slate-400">{t.admin_account}</p>
                        </div>
                        <LogOut size={14} className="text-slate-500 hover:text-white cursor-pointer" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] p-10">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {activeTab === 'instances' ? t.connected_instances :
                                activeTab === 'logs' ? t.terminal_activity : t.automation_hub}
                        </h1>
                        <p className="text-slate-400">{t.manage_infra}</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="btn-premium"
                    >
                        <Plus size={20} />
                        <span>{t.new_instance}</span>
                    </button>
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
                                        <div className={`status-badge ${inst.status === 'connected' ? 'status-online' : 'status-offline'}`}>
                                            {inst.status}
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
            </main>
        </div>
    );
}

export default App;
