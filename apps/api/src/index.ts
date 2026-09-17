import pino from 'pino';
import { createApp } from './app.js';
import { createDependencies } from './dependencies.js';
import { parseEnv } from './env.js';

const env = parseEnv(process.env);
const logger = pino({ level: env.LOG_LEVEL });
const dependencies = createDependencies(env);

try {
  await dependencies.connect();
  logger.info('MongoDB connected');
} catch (error) {
  logger.fatal({ error }, 'MongoDB connection failed');
  process.exit(1);
}
const app = createApp({
  origin: env.WEB_ORIGIN,
  logger,
  checkDependencies: dependencies.check,
});

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'API listening');
});

server.on('error', (error) => {
  logger.error({ error }, 'HTTP server failed');
});

let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'API shutting down');

  server.close(async () => {
    try {
      await dependencies.close();
      logger.info('API stopped');
    } catch (error) {
      logger.error({ error }, 'Failed to close API dependencies');
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
