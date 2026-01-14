import React, { useState, useEffect } from 'react';
import {
    Plus,
    Settings,
    MessageSquare,
    Activity,
    LogOut,
    QrCode,
    CheckCircle2,
    XCircle,
    Trash2,
    RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3001';

interface Instance {
    id: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'qr';
    hasQr: boolean;
}

const App = () => {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newInstanceId, setNewInstanceId] = useState('');
    const [selectedInstanceQr, setSelectedInstanceQr] = useState<string | null>(null);

    const fetchInstances = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/instances`);
            setInstances(data);
        } catch (error) {
            console.error('Erro ao buscar instâncias:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
        const interval = setInterval(fetchInstances, 5000); // Polling simples para atualização de status
        return () => clearInterval(interval);
    }, []);

    const createInstance = async () => {
        if (!newInstanceId) return;
        try {
            await axios.post(`${API_URL}/instances`, { id: newInstanceId });
            setNewInstanceId('');
            setShowModal(false);
            fetchInstances();
        } catch (error) {
            alert('Erro ao criar instância');
        }
    };

    const deleteInstance = async (id: string) => {
        if (!confirm('Deseja realmente remover esta instância?')) return;
        try {
            await axios.delete(`${API_URL}/instances/${id}`);
            fetchInstances();
        } catch (error) {
            alert('Erro ao deletar instância');
        }
    };

    const getQrCode = async (id: string) => {
        try {
            const { data } = await axios.get(`${API_URL}/instances/${id}/qr`);
            setSelectedInstanceQr(data.qr);
        } catch (error) {
            alert('QR Code ainda não disponível');
        }
    };

    return (
        <div className="flex h-screen bg-background text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 glass flex flex-col p-6 gap-6 border-r border-white/10">
                <div className="flex items-center gap-3 text-accent font-bold text-xl">
                    <div className="p-2 bg-accent/20 rounded-lg">
                        <Activity className="w-6 h-6" />
                    </div>
                    Automatech
                </div>

                <nav className="flex flex-col gap-2 mt-4">
                    <button className="flex items-center gap-3 p-3 rounded-xl bg-accent text-white font-medium transition-all">
                        <MessageSquare className="w-5 h-5" /> Instâncias
                    </button>
                    <button className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/5 transition-all">
                        <Settings className="w-5 h-5" /> Configurações
                    </button>
                </nav>

                <div className="mt-auto">
                    <button className="flex items-center gap-3 p-3 w-full text-white/40 hover:text-red-400 transition-all">
                        <LogOut className="w-5 h-5" /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Instâncias WhatsApp</h1>
                        <p className="text-white/40 italic">Gerencie suas conexões de forma centralizada.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-accent/20"
                    >
                        <Plus className="w-5 h-5" /> Nova Instância
                    </button>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {instances.map((inst) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={inst.id}
                                    className="glass p-6 rounded-3xl border border-white/5 card-hover transition-all flex flex-col gap-4 relative overflow-hidden group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold truncate pr-8">{inst.id}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {inst.status === 'connected' ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Online
                                                    </div>
                                                ) : inst.status === 'qr' ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                                        <QrCode className="w-3 h-3" /> Aguardando Scan
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                                                        <XCircle className="w-3 h-3" /> Offline
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteInstance(inst.id)}
                                            className="text-white/20 hover:text-red-500 transition-all p-2 bg-white/5 rounded-xl"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-2 mt-2">
                                        <img src="https://typebot.io/favicon.ico" className="w-5 h-5 opacity-40 grayscale group-hover:grayscale-0 transition-all" title="Typebot" />
                                        <img src="https://n8n.io/favicon.ico" className="w-5 h-5 opacity-40 grayscale group-hover:grayscale-0 transition-all" title="n8n" />
                                    </div>

                                    {inst.status !== 'connected' && (
                                        <button
                                            onClick={() => getQrCode(inst.id)}
                                            className="mt-4 w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-semibold transition-all border border-white/5"
                                        >
                                            Conectar WhatsApp
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Modal Nova Instância */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass p-8 rounded-[2rem] w-full max-w-md relative z-10 border border-white/20"
                        >
                            <h2 className="text-2xl font-bold mb-6">Criar Nova Instância</h2>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/40 mb-2">Nome da Instância</label>
                                    <input
                                        autoFocus
                                        value={newInstanceId}
                                        onChange={(e) => setNewInstanceId(e.target.value)}
                                        placeholder="Ex: Suporte-Vendas"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-accent outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={createInstance}
                                    className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg hover:bg-accent/80 transition-all mt-4"
                                >
                                    Inicializar Instância
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Code Viewer */}
            <AnimatePresence>
                {selectedInstanceQr && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedInstanceQr(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-12 rounded-[3rem] relative z-10 flex flex-col items-center gap-6"
                        >
                            <h2 className="text-black text-2xl font-bold">Escaneie o QR Code</h2>
                            <div className="bg-white p-2 rounded-2xl border-4 border-gray-100 shadow-2xl">
                                {/* Aqui seria um componente de QR Code real, usando placeholder para demo */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedInstanceQr)}`}
                                    alt="WhatsApp QR Code"
                                    className="w-64 h-64"
                                />
                            </div>
                            <p className="text-black/40 text-sm max-w-[250px] text-center">
                                Abra o WhatsApp no seu celular e vá em Dispositivos Conectados.
                            </p>
                            <button
                                onClick={() => setSelectedInstanceQr(null)}
                                className="mt-4 text-accent font-bold text-lg"
                            >
                                Concluído
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
