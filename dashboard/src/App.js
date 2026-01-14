import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Plus, Settings, MessageSquare, Activity, LogOut, QrCode, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
const API_URL = 'http://localhost:3001';
const App = () => {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newInstanceId, setNewInstanceId] = useState('');
    const [selectedInstanceQr, setSelectedInstanceQr] = useState(null);
    const fetchInstances = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/instances`);
            setInstances(data);
        }
        catch (error) {
            console.error('Erro ao buscar instâncias:', error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchInstances();
        const interval = setInterval(fetchInstances, 5000); // Polling simples para atualização de status
        return () => clearInterval(interval);
    }, []);
    const createInstance = async () => {
        if (!newInstanceId)
            return;
        try {
            await axios.post(`${API_URL}/instances`, { id: newInstanceId });
            setNewInstanceId('');
            setShowModal(false);
            fetchInstances();
        }
        catch (error) {
            alert('Erro ao criar instância');
        }
    };
    const deleteInstance = async (id) => {
        if (!confirm('Deseja realmente remover esta instância?'))
            return;
        try {
            await axios.delete(`${API_URL}/instances/${id}`);
            fetchInstances();
        }
        catch (error) {
            alert('Erro ao deletar instância');
        }
    };
    const getQrCode = async (id) => {
        try {
            const { data } = await axios.get(`${API_URL}/instances/${id}/qr`);
            setSelectedInstanceQr(data.qr);
        }
        catch (error) {
            alert('QR Code ainda não disponível');
        }
    };
    return (_jsxs("div", { className: "flex h-screen bg-background text-white font-sans", children: [_jsxs("aside", { className: "w-64 glass flex flex-col p-6 gap-6 border-r border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 text-accent font-bold text-xl", children: [_jsx("div", { className: "p-2 bg-accent/20 rounded-lg", children: _jsx(Activity, { className: "w-6 h-6" }) }), "Automatech"] }), _jsxs("nav", { className: "flex flex-col gap-2 mt-4", children: [_jsxs("button", { className: "flex items-center gap-3 p-3 rounded-xl bg-accent text-white font-medium transition-all", children: [_jsx(MessageSquare, { className: "w-5 h-5" }), " Inst\u00E2ncias"] }), _jsxs("button", { className: "flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/5 transition-all", children: [_jsx(Settings, { className: "w-5 h-5" }), " Configura\u00E7\u00F5es"] })] }), _jsx("div", { className: "mt-auto", children: _jsxs("button", { className: "flex items-center gap-3 p-3 w-full text-white/40 hover:text-red-400 transition-all", children: [_jsx(LogOut, { className: "w-5 h-5" }), " Sair"] }) })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-12", children: [_jsxs("header", { className: "flex justify-between items-center mb-12", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: "Inst\u00E2ncias WhatsApp" }), _jsx("p", { className: "text-white/40 italic", children: "Gerencie suas conex\u00F5es de forma centralizada." })] }), _jsxs("button", { onClick: () => setShowModal(true), className: "flex items-center gap-2 bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-accent/20", children: [_jsx(Plus, { className: "w-5 h-5" }), " Nova Inst\u00E2ncia"] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(RefreshCw, { className: "w-8 h-8 text-accent animate-spin" }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", children: _jsx(AnimatePresence, { children: instances.map((inst) => (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: "glass p-6 rounded-3xl border border-white/5 card-hover transition-all flex flex-col gap-4 relative overflow-hidden group", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold truncate pr-8", children: inst.id }), _jsx("div", { className: "flex items-center gap-2 mt-1", children: inst.status === 'connected' ? (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), " Online"] })) : inst.status === 'qr' ? (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20", children: [_jsx(QrCode, { className: "w-3 h-3" }), " Aguardando Scan"] })) : (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20", children: [_jsx(XCircle, { className: "w-3 h-3" }), " Offline"] })) })] }), _jsx("button", { onClick: () => deleteInstance(inst.id), className: "text-white/20 hover:text-red-500 transition-all p-2 bg-white/5 rounded-xl", children: _jsx(Trash2, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx("img", { src: "https://typebot.io/favicon.ico", className: "w-5 h-5 opacity-40 grayscale group-hover:grayscale-0 transition-all", title: "Typebot" }), _jsx("img", { src: "https://n8n.io/favicon.ico", className: "w-5 h-5 opacity-40 grayscale group-hover:grayscale-0 transition-all", title: "n8n" })] }), inst.status !== 'connected' && (_jsx("button", { onClick: () => getQrCode(inst.id), className: "mt-4 w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-semibold transition-all border border-white/5", children: "Conectar WhatsApp" }))] }, inst.id))) }) }))] }), _jsx(AnimatePresence, { children: showModal && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-6", children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setShowModal(false), className: "absolute inset-0 bg-black/80 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, className: "glass p-8 rounded-[2rem] w-full max-w-md relative z-10 border border-white/20", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Criar Nova Inst\u00E2ncia" }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-white/40 mb-2", children: "Nome da Inst\u00E2ncia" }), _jsx("input", { autoFocus: true, value: newInstanceId, onChange: (e) => setNewInstanceId(e.target.value), placeholder: "Ex: Suporte-Vendas", className: "w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-accent outline-none transition-all" })] }), _jsx("button", { onClick: createInstance, className: "w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg hover:bg-accent/80 transition-all mt-4", children: "Inicializar Inst\u00E2ncia" })] })] })] })) }), _jsx(AnimatePresence, { children: selectedInstanceQr && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-6", children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setSelectedInstanceQr(null), className: "absolute inset-0 bg-black/90 backdrop-blur-md" }), _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, className: "bg-white p-12 rounded-[3rem] relative z-10 flex flex-col items-center gap-6", children: [_jsx("h2", { className: "text-black text-2xl font-bold", children: "Escaneie o QR Code" }), _jsx("div", { className: "bg-white p-2 rounded-2xl border-4 border-gray-100 shadow-2xl", children: _jsx("img", { src: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedInstanceQr)}`, alt: "WhatsApp QR Code", className: "w-64 h-64" }) }), _jsx("p", { className: "text-black/40 text-sm max-w-[250px] text-center", children: "Abra o WhatsApp no seu celular e v\u00E1 em Dispositivos Conectados." }), _jsx("button", { onClick: () => setSelectedInstanceQr(null), className: "mt-4 text-accent font-bold text-lg", children: "Conclu\u00EDdo" })] })] })) })] }));
};
export default App;
//# sourceMappingURL=App.js.map