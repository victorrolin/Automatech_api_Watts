import fs from 'fs';
import path from 'path';

interface InstanceMetrics {
    messagesReceived: number;
    messagesSent: number;
    typebotRequests: number;
    typebotSuccess: number;
    typebotErrors: number;
    averageResponseTime: number;
    totalResponseTime: number;
    lastUpdate: string;
}

const METRICS_DIR = path.join(process.cwd(), 'metrics');

if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
}

export class MetricsManager {
    private static getPath(instanceId: string) {
        return path.join(METRICS_DIR, `${instanceId}.json`);
    }

    private static getInitialMetrics(): InstanceMetrics {
        return {
            messagesReceived: 0,
            messagesSent: 0,
            typebotRequests: 0,
            typebotSuccess: 0,
            typebotErrors: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            lastUpdate: new Date().toISOString()
        };
    }

    static get(instanceId: string): InstanceMetrics {
        const file = this.getPath(instanceId);
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf-8'));
            } catch (e) {
                return this.getInitialMetrics();
            }
        }
        return this.getInitialMetrics();
    }

    static save(instanceId: string, metrics: InstanceMetrics) {
        metrics.lastUpdate = new Date().toISOString();
        if (metrics.typebotSuccess > 0) {
            metrics.averageResponseTime = Math.round(metrics.totalResponseTime / metrics.typebotSuccess);
        }
        fs.writeFileSync(this.getPath(instanceId), JSON.stringify(metrics, null, 2));
    }

    static trackReceived(instanceId: string) {
        const m = this.get(instanceId);
        m.messagesReceived++;
        this.save(instanceId, m);
    }

    static trackSent(instanceId: string) {
        const m = this.get(instanceId);
        m.messagesSent++;
        this.save(instanceId, m);
    }

    static trackTypebot(instanceId: string, success: boolean, durationMs: number = 0) {
        const m = this.get(instanceId);
        m.typebotRequests++;
        if (success) {
            m.typebotSuccess++;
            m.totalResponseTime += durationMs;
        } else {
            m.typebotErrors++;
        }
        this.save(instanceId, m);
    }

    static getAll() {
        if (!fs.existsSync(METRICS_DIR)) return {};
        const files = fs.readdirSync(METRICS_DIR);
        const all: { [key: string]: InstanceMetrics } = {};
        files.forEach(f => {
            if (f.endsWith('.json')) {
                const id = f.replace('.json', '');
                all[id] = this.get(id);
            }
        });
        return all;
    }
}
