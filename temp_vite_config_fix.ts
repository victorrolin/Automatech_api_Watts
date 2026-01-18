import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: ['wattsapi.automatech.tech', 'localhost', '127.0.0.1', '195.35.40.99'],
        hmr: {
            host: 'wattsapi.automatech.tech',
            clientPort: 443,
            protocol: 'wss'
        }
    }
});
