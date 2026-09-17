import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import pino from 'pino';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username || undefined,
  password: url.password || undefined,
};

const queue = new Queue('system-smoke', { connection });
const worker = new Worker(
  'system-smoke',
  async (job) => {
    logger.info({ jobId: job.id }, 'Smoke job processed');
  },
  { connection },
);

worker.on('ready', () => logger.info('Worker ready'));
worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});
worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Job failed');
});
worker.on('error', (error) => {
  logger.error({ error }, 'Worker error');
});
queue.on('error', (error) => {
  logger.error({ error }, 'Queue error');
});

const jobId = randomUUID();
await queue.add(
  'startup-smoke',
  {},
  {
    jobId,
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: true,
  },
);
logger.info({ jobId }, 'Startup smoke job queued');

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Worker shutting down');

  try {
    await worker.close();
    await queue.close();
    logger.info('Worker stopped');
  } catch (error) {
    logger.error({ error }, 'Failed to close worker');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
