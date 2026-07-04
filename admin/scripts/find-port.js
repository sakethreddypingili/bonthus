const net = require('net');

async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '127.0.0.1');
    });
}

async function findAvailablePort(startPort, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
        console.log(`  Port ${port} in use, trying ${port + 1}...`);
    }
    throw new Error(`No available port found starting from ${startPort} (tried ${maxAttempts} ports)`);
}

if (require.main === module) {
    const startPort = parseInt(process.argv[2], 10) || 3001;
    findAvailablePort(startPort).then((port) => {
        console.log(port);
    }).catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
}

module.exports = { findAvailablePort, isPortAvailable };