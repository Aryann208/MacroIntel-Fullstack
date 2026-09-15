import { describe, it, expect } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { healthSchema } from '@macrointel/contracts';
import { createApp } from './app.js';
import { parseEnv } from './env.js';
const app = createApp({
  origin: 'http://localhost:3000',
  logger: pino({ level: 'silent' }),
  checkDependencies: async () => ({
    status: 'degraded',
    dependencies: { mongodb: 'down', redis: 'up', qdrant: 'down' },
    timestamp: new Date().toISOString(),
  }),
});
describe('HTTP foundation', () => {
  it('returns shared contract, CORS and request ID', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(healthSchema.safeParse(res.body).success).toBe(true);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
  it('reports individual dependency failures', async () => {
    const res = await request(app)
      .get('/api/v1/health/dependencies')
      .expect(503);
    expect(res.body.dependencies).toEqual({
      mongodb: 'down',
      redis: 'up',
      qdrant: 'down',
    });
  });
  it('handles not-found and malformed JSON', async () => {
    await request(app).get('/missing').expect(404);
    await request(app)
      .post('/missing')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
  });
  it('fails fast on invalid environment', () => {
    expect(() => parseEnv({ API_PORT: 'invalid' })).toThrow('API_PORT');
  });
});

it('sanitizes unexpected errors and retains request correlation', async () => {
  const failing = createApp({
    origin: 'http://localhost:3000',
    logger: pino({ level: 'silent' }),
    checkDependencies: async () => {
      throw new Error('private internal details');
    },
  });
  const res = await request(failing)
    .get('/api/v1/health/dependencies')
    .set('x-request-id', 'interview-smoke')
    .expect(500);
  expect(res.body).toEqual({
    error: 'Internal server error',
    requestId: 'interview-smoke',
  });
  expect(JSON.stringify(res.body)).not.toContain('private internal details');
});
it('does not grant another browser origin access', async () => {
  const res = await request(app)
    .get('/api/v1/health')
    .set('Origin', 'http://localhost:9999')
    .expect(200);
  expect(res.headers['access-control-allow-origin']).not.toBe(
    'http://localhost:9999',
  );
});
