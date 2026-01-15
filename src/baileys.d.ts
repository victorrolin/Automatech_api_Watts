import type { WASocket } from '@whiskeysockets/baileys';
export interface LogEntry {
    timestamp: string;
    type: 'WHATSAPP' | 'TYPEBOT' | 'N8N' | 'SYSTEM';
    instance: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}
export declare class LogSystem {
    private static logs;
    private static maxLogs;
    private static io;
    static setIO(io: any): void;
    static add(log: Omit<LogEntry, 'timestamp'>): void;
    static getLogs(): LogEntry[];
}
export interface InstanceSettings {
    n8nUrl?: string;
    typebotUrl?: string;
    typebotName?: string;
    typebotApiKey?: string;
    typebotDelay?: number;
    enabled?: boolean;
}
export declare class Instance {
    id: string;
    sock?: WASocket;
    qr: string | undefined;
    status: 'connecting' | 'connected' | 'disconnected' | 'qr';
    settings: InstanceSettings;
    private authPath;
    private settingsPath;
    constructor(id: string);
    private loadSettings;
    saveSettings(newSettings: InstanceSettings): void;
    init(): Promise<void>;
    private typebotSessions;
    private handleTypebot;
    logout(): Promise<void>;
}
export declare class InstanceManager {
    private instances;
    createInstance(id: string): Promise<Instance | undefined>;
    getInstance(id: string): Instance | undefined;
    getInstances(): {
        id: string;
        status: "connecting" | "connected" | "disconnected" | "qr";
        hasQr: boolean;
    }[];
    removeInstance(id: string): Promise<void>;
}
//# sourceMappingURL=baileys.d.ts.map