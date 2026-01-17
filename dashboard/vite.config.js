import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        strictPort: true,
        allowedHosts: ['wattsapi.automatech.tech', 'localhost'],
        hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 3000
        }
    }
});
//# sourceMappingURL=vite.config.js.map