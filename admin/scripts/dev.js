const { spawn } = require('child_process');
const path = require('path');
const { findAvailablePort } = require('./find-port');

const BACKEND_START = 5000;
const FRONTEND_START = 3001;

async function main() {
    console.log('\n--- Checking available ports ---\n');

    const backendPort = await findAvailablePort(BACKEND_START);
    console.log(`  Backend  → http://localhost:${backendPort}\n`);

    const frontendPort = await findAvailablePort(FRONTEND_START);
    console.log(`  Frontend → https://localhost:${frontendPort}\n`);

    const root = path.resolve(__dirname, '..');

    const backend = spawn('node', ['src/server/server.js'], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(backendPort) },
    });

    const frontend = spawn(
        'npx',
        ['react-scripts', 'start'],
        {
            cwd: root,
            stdio: 'inherit',
            env: {
                ...process.env,
                PORT: String(frontendPort),
                HTTPS: 'true',
                SSL_CRT_FILE: path.join(root, '.certs/localhost+2.pem'),
                SSL_KEY_FILE: path.join(root, '.certs/localhost+2-key.pem'),
                DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
            },
        }
    );

    process.on('SIGINT', () => {
        backend.kill();
        frontend.kill();
        process.exit();
    });

    process.on('SIGTERM', () => {
        backend.kill();
        frontend.kill();
        process.exit();
    });
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});