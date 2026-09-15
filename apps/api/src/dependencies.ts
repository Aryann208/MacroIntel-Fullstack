import { MongoClient } from 'mongodb';
import { Redis } from 'ioredis';
import {
  dependencyHealthSchema,
  type DependencyHealthResponse,
} from '@macrointel/contracts';
import type { ApiEnv } from './env.js';
export function createDependencies(env: ApiEnv) {
  const timeout = env.DEPENDENCY_TIMEOUT_MS;
  const mongo = new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: timeout,
    connectTimeoutMS: timeout,
    socketTimeoutMS: timeout,
  });
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: timeout,
    commandTimeout: timeout,
    retryStrategy: () => null,
    maxRetriesPerRequest: 0,
  });
  redis.on('error', () => {
    /* Health response reports failure without exposing credentials. */
  });
  let redisConnecting: Promise<void> | undefined;
  async function checkRedis() {
    if (redis.status !== 'ready') {
      redisConnecting ??= redis.connect().finally(() => {
        redisConnecting = undefined;
      });
      await redisConnecting;
    }
    return redis.ping();
  }
  async function status(check: () => Promise<unknown>): Promise<'up' | 'down'> {
    try {
      await check();
      return 'up';
    } catch {
      return 'down';
    }
  }
  return {
    async check(): Promise<DependencyHealthResponse> {
      const [mongodb, redisStatus, qdrant] = await Promise.all([
        status(() => mongo.db().command({ ping: 1 }, { timeoutMS: timeout })),
        status(checkRedis),
        status(async () => {
          const res = await fetch(new URL('/healthz', env.QDRANT_URL), {
            signal: AbortSignal.timeout(timeout),
          });
          if (!res.ok) throw new Error('Qdrant unavailable');
        }),
      ]);
      return dependencyHealthSchema.parse({
        status: [mongodb, redisStatus, qdrant].every((v) => v === 'up')
          ? 'ok'
          : 'degraded',
        dependencies: { mongodb, redis: redisStatus, qdrant },
        timestamp: new Date().toISOString(),
      });
    },
    async close() {
      redis.disconnect();
      await mongo.close();
    },
  };
}
