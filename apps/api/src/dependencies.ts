import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { dependencyHealthSchema } from '@macrointel/contracts';
import type { ApiEnv } from './env.js';

export function createDependencies(env: ApiEnv) {
  async function connect() {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: env.DEPENDENCY_TIMEOUT_MS,
    });
  }

  const redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: env.DEPENDENCY_TIMEOUT_MS,
    commandTimeout: env.DEPENDENCY_TIMEOUT_MS,
    retryStrategy: () => null,
  });

  // ioredis emits an error event when Redis is unavailable. The health check
  // below reports that failure in the HTTP response.
  redisClient.on('error', () => {});

  async function checkMongo() {
    try {
      const database = mongoose.connection.db;
      if (!database) return 'down';
      await database.admin().ping();
      return 'up';
    } catch {
      return 'down';
    }
  }

  async function checkRedis() {
    try {
      if (redisClient.status === 'wait' || redisClient.status === 'end') {
        await redisClient.connect();
      }

      await redisClient.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }

  async function checkQdrant() {
    try {
      const response = await fetch(`${env.QDRANT_URL}/healthz`, {
        signal: AbortSignal.timeout(env.DEPENDENCY_TIMEOUT_MS),
      });

      return response.ok ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  async function check() {
    const [mongodb, redis, qdrant] = await Promise.all([
      checkMongo(),
      checkRedis(),
      checkQdrant(),
    ]);

    const allDependenciesAreUp =
      mongodb === 'up' && redis === 'up' && qdrant === 'up';

    return dependencyHealthSchema.parse({
      status: allDependenciesAreUp ? 'ok' : 'degraded',
      dependencies: { mongodb, redis, qdrant },
      timestamp: new Date().toISOString(),
    });
  }

  async function close() {
    redisClient.disconnect();
    await mongoose.disconnect();
  }

  return { connect, check, close };
}
