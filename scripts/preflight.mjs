import net from 'node:net';
import { platform } from 'node:process';

/**
 * `tsx watch` keeps running when its child process dies, so a port collision
 * leaves a silent watcher that binds nothing and logs nothing — the dev stack
 * looks alive while Vite proxies into a closed port. Catch it before start.
 */
const PORTS = [
  { port: 4000, label: 'API (Express)' },
  { port: 5173, label: 'Web (Vite)' },
];

const isInUse = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(false)));
    // 0.0.0.0 matches how Express and Vite bind, so we detect their listeners.
    server.listen(port, '0.0.0.0');
  });

const busy = [];
for (const entry of PORTS) {
  if (await isInUse(entry.port)) busy.push(entry);
}

if (busy.length > 0) {
  const lines = ['', 'Cannot start — these ports are already in use:', ''];
  for (const { port, label } of busy) {
    lines.push(`  ${port}  ${label}`);
  }
  lines.push('', 'A previous dev server is still running. Stop it with:', '');
  if (platform === 'win32') {
    lines.push('  npm run kill');
    lines.push('', '  (or manually:  netstat -ano | findstr :4000');
    lines.push('                 taskkill /PID <pid> /T /F )');
  } else {
    lines.push(`  lsof -ti:${busy.map((b) => b.port).join(',')} | xargs kill -9`);
  }
  lines.push('');
  console.error(lines.join('\n'));
  process.exit(1);
}
