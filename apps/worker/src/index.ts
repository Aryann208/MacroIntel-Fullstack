import { Queue, Worker } from 'bullmq';
import pino from 'pino';
import mongoose from 'mongoose';
import { syncFred } from '@macrointel/api/fred-sync';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/macrointel';
const fredApiKey = process.env.FRED_API_KEY;

if (!fredApiKey) {
  throw new Error('FRED_API_KEY is required for the FRED worker');
}

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const url = new URL(redisUrl);
await mongoose.connect(mongoUri);
logger.info('Worker connected to MongoDB');
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username || undefined,
  password: url.password || undefined,
};

const queue = new Queue('fred-sync', { connection });
const worker = new Worker(
  'fred-sync',
  async (job) => {
    logger.info({ jobId: job.id }, 'Fred sync started');
    await syncFred(fredApiKey as string);
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

await queue.upsertJobScheduler(
  'fred-sync-schedule',
  { every: 60 * 60 * 1000 },
  {
    name: 'sync-fred',
    data: {},
    opts: {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'fixed', delay: 5000 },
    },
  },
);
let isShuttingDown = false;

logger.info('FRED sync schedule registered');

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Worker shutting down');

  try {
    await worker.close();
    await queue.close();
    await mongoose.disconnect();
    logger.info('Worker stopped');
  } catch (error) {
    logger.error({ error }, 'Failed to close worker');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
