import pino from 'pino';
import { createApp } from './app.js';
import { parseEnv } from './env.js';
import { createDependencies } from './dependencies.js';
const env = parseEnv(process.env);
const logger = pino({ level: env.LOG_LEVEL });
const dependencies = createDependencies(env);
const server = createApp({
  origin: env.WEB_ORIGIN,
  logger,
  checkDependencies: dependencies.check,
}).listen(env.API_PORT, () =>
  logger.info({ port: env.API_PORT }, 'API listening'),
);
server.on('error', (error) => {
  logger.error(
    { code: 'code' in error ? error.code : 'UNKNOWN' },
    'HTTP server failed',
  );
  void dependencies.close().finally(() => {
    process.exitCode = 1;
  });
});
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'API shutting down');
  const deadline = setTimeout(() => {
    logger.error('Shutdown timed out');
    process.exit(1);
  }, 10000);
  deadline.unref();
  server.close(() => {
    void dependencies
      .close()
      .then(() => {
        clearTimeout(deadline);
        logger.info('API stopped');
      })
      .catch(() => {
        process.exitCode = 1;
      });
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
