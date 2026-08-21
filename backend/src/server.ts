import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Hardware Hub API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

/**
 * Without this, a port collision throws an opaque stack trace while the older
 * process keeps serving — so a restart looks like it worked, but stale config
 * (an un-reloaded .env, for one) is still what answers requests.
 */
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      [
        '',
        `Port ${env.PORT} is already in use — another server is still running.`,
        'This process did NOT start, so the old one (with its old environment)',
        'is what you are still talking to. Stop it first:',
        '',
        `  Windows:      netstat -ano | findstr :${env.PORT}`,
        '                taskkill /PID <pid> /T /F',
        `  macOS/Linux:  lsof -ti:${env.PORT} | xargs kill -9`,
        '',
      ].join('\n'),
    );
  } else {
    console.error('Server failed to start:', error);
  }
  process.exit(1);
});

/** Close HTTP and DB handles cleanly so Render restarts don't leak connections. */
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Don't hang forever on a stuck keep-alive connection.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
