import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        strictPort: true,
        allowedHosts: ['wattsapi.automatech.tech', 'localhost', '172.17.0.1'],
        hmr: {
            host: 'wattsapi.automatech.tech',
            protocol: 'wss'
        }
    }
});

