import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import pino from 'pino';
import { z } from 'zod';
const parsed = z
  .object({
    REDIS_URL: z
      .url()
      .refine(
        (v) => ['redis:', 'rediss:'].includes(new URL(v).protocol),
        'Use redis:// or rediss://',
      )
      .default('redis://127.0.0.1:6379'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .safeParse(process.env);
if (!parsed.success)
  throw new Error(
    'Invalid worker environment:\n' +
      parsed.error.issues
        .map((i) => i.path.join('.') + ': ' + i.message)
        .join('\n'),
  );
const logger = pino({ level: parsed.data.LOG_LEVEL });
const url = new URL(parsed.data.REDIS_URL);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  db: Number(url.pathname.slice(1) || 0),
  ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
};
const queue = new Queue('system-smoke', { connection });
const startupId = randomUUID();
const worker = new Worker(
  'system-smoke',
  async (job) => {
    if (job.name !== 'startup-smoke') throw new Error('Unsupported job');
    logger.info({ jobId: job.id }, 'Smoke job processed');
    return { processed: true };
  },
  { connection, concurrency: 1 },
);
worker.on('ready', () => logger.info('Worker ready'));
worker.on('completed', (job) =>
  logger.info({ jobId: job.id }, 'Job completed'),
);
worker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, errorType: error.name }, 'Job failed'),
);
worker.on('error', (error) =>
  logger.error({ errorType: error.name }, 'Worker connection error'),
);
queue.on('error', (error) =>
  logger.error({ errorType: error.name }, 'Queue connection error'),
);
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Worker shutting down');
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  try {
    await worker.close();
    await queue.close();
    clearTimeout(deadline);
    logger.info('Worker stopped');
  } catch {
    process.exitCode = 1;
  }
}
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
try {
  await queue.add(
    'startup-smoke',
    { startupId },
    {
      jobId: startupId,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
  logger.info({ jobId: startupId }, 'Startup smoke job queued');
} catch {
  logger.error('Smoke enqueue failed');
  process.exitCode = 1;
  await shutdown('startup-failure');
}
