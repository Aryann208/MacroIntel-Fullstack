import mongoose from 'mongoose';
import { dependencyHealthSchema } from '@macrointel/contracts';
import type { ApiEnv } from './env.js';

export function createDependencies(env: ApiEnv) {
  async function connect() {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: env.DEPENDENCY_TIMEOUT_MS,
    });
  }

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

  async function check() {
    const mongodb = await checkMongo();

    return dependencyHealthSchema.parse({
      status: mongodb === 'up' ? 'ok' : 'degraded',
      dependencies: { mongodb },
      timestamp: new Date().toISOString(),
    });
  }

  async function close() {
    await mongoose.disconnect();
  }

  return { connect, check, close };
}
