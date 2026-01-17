import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        host: true,
        strictPort: true,
        allowedHosts: ['wattsapi.automatech.tech', 'localhost'],
        hmr: {
            host: 'wattsapi.automatech.tech',
            protocol: 'wss'
        }
    }
});

