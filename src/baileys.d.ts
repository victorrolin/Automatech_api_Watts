import { WASocket } from '@whiskeysockets/baileys';
export declare class Instance {
    id: string;
    sock?: WASocket;
    qr?: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'qr';
    private authPath;
    constructor(id: string);
    init(): Promise<void>;
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