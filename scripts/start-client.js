// scripts/start-client.js
// Finds a free port starting from the default (3500) and starts the React client.

const net = require('net');
const { spawn } = require('child_process');

const DEFAULT_PORT = parseInt(process.env.CLIENT_PORT, 10) || 3500;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on('error', () => resolve(false));
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port++;
  }
  return port;
}

async function main() {
  const port = await findFreePort(DEFAULT_PORT);
  console.log(`Starting client on port ${port}`);

  const child = spawn('npm', ['start', '--prefix', 'client'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), BROWSER: 'none' },
    shell: true,
  });

  child.on('exit', (code) => process.exit(code));
}

main();
