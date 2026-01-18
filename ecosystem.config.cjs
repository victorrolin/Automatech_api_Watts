module.exports = {
    apps: [
        {
            name: 'automatech-api',
            cwd: './',
            script: 'src/index.ts',
            interpreter: 'node_modules/.bin/tsx',
            env: {
                NODE_ENV: 'production',
                PORT: 3003
            }
        },
        {
            name: 'automatech-dashboard',
            cwd: './dashboard',
            script: 'serve',
            env: {
                PM2_SERVE_PATH: './dist',
                PM2_SERVE_PORT: 3002,
                PM2_SERVE_SPA: 'true',
                PM2_SERVE_HOMEPAGE: '/index.html'
            }
        }
    ]
};
