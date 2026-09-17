import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { healthSchema } from '@macrointel/contracts';
import { createApp } from './app.js';

const app = createApp({
  origin: 'http://localhost:3000',
  logger: pino({ level: 'silent' }),
  checkDependencies: async () => ({
    status: 'degraded',
    dependencies: { mongodb: 'down', redis: 'up', qdrant: 'down' },
    timestamp: new Date().toISOString(),
  }),
});

describe('health endpoints', () => {
  it('returns the API health contract', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(healthSchema.safeParse(response.body).success).toBe(true);
  });

  it('reports each dependency', async () => {
    const response = await request(app)
      .get('/api/v1/health/dependencies')
      .expect(503);

    expect(response.body.dependencies).toEqual({
      mongodb: 'down',
      redis: 'up',
      qdrant: 'down',
    });
  });
});
