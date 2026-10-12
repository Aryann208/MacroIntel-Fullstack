import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { watchlistChangesResponseSchema } from '@macrointel/contracts';

const database = vi.hoisted(() => ({
  findUser: vi.fn(),
  updateUser: vi.fn(),
  findSeries: vi.fn(),
  sortSeries: vi.fn(),
  findObservations: vi.fn(),
  sortObservations: vi.fn(),
}));

vi.mock('./modules/auth/user.model.js', () => ({
  User: {
    findById: database.findUser,
    updateOne: database.updateUser,
  },
}));
vi.mock('./modules/macro/models/macro-series.model.js', () => ({
  category: [
    'inflation',
    'employment',
    'growth',
    'rates',
    'housing',
    'sentiment',
  ],
  MacroSeries: { find: database.findSeries },
}));
vi.mock('./modules/macro/models/macro-observation.model.js', () => ({
  MacroObservation: { find: database.findObservations },
}));

import { createApp } from './app.js';

const secret = 'watchlist-changes-test-secret';
const token = jwt.sign({ sub: 'user-id' }, secret);
const app = createApp({
  origin: 'http://localhost:3000',
  logger: pino({ level: 'silent' }),
  checkDependencies: async () => ({
    status: 'ok',
    dependencies: { mongodb: 'up' },
    timestamp: new Date().toISOString(),
  }),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('JWT_SECRET', secret);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
  database.findSeries.mockReturnValue({ sort: database.sortSeries });
  database.findObservations.mockReturnValue({
    sort: database.sortObservations,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('watchlist changes', () => {
  it('starts a first-visit baseline without showing old imports or changing state on GET', async () => {
    database.findUser.mockResolvedValue({
      _id: 'user-id',
      watchlist: [],
      lastSeenChangesAt: undefined,
    });

    const response = await request(app)
      .get('/api/v1/watchlist/changes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(watchlistChangesResponseSchema.parse(response.body)).toEqual({
      items: [],
      asOf: '2026-10-09T10:00:00.000Z',
      needsBaseline: true,
    });
    expect(database.updateUser).not.toHaveBeenCalled();

    await request(app)
      .post('/api/v1/watchlist/changes/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ asOf: response.body.asOf })
      .expect(204);

    expect(database.updateUser).toHaveBeenCalledWith(
      { _id: 'user-id', lastSeenChangesAt: { $exists: false } },
      { $set: { lastSeenChangesAt: new Date(response.body.asOf) } },
    );
  });

  it('shows the newest imported change, even when it revises an older period', async () => {
    const cursor = new Date('2026-10-09T09:00:00.000Z');
    database.findUser.mockResolvedValue({
      _id: 'user-id',
      watchlist: ['cpi-id'],
      lastSeenChangesAt: cursor,
    });
    database.sortSeries.mockResolvedValue([
      {
        _id: 'cpi-id',
        providerSeriesId: 'CPIAUCSL',
        name: 'CPI',
        unit: 'Index',
      },
    ]);
    database.sortObservations.mockResolvedValue([
      {
        seriesId: { equals: (id: string) => id === 'cpi-id' },
        value: 312,
        observedAt: new Date('2026-07-01T00:00:00.000Z'),
        ingestedAt: new Date('2026-10-09T09:30:00.000Z'),
      },
      {
        seriesId: { equals: (id: string) => id === 'cpi-id' },
        value: 314,
        observedAt: new Date('2026-08-01T00:00:00.000Z'),
        ingestedAt: new Date('2026-10-09T09:10:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/v1/watchlist/changes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      providerSeriesId: 'CPIAUCSL',
      value: 312,
      observedAt: '2026-07-01T00:00:00.000Z',
    });
    expect(database.findObservations).toHaveBeenCalledWith({
      seriesId: { $in: ['cpi-id'] },
      isLatestVintage: true,
      ingestedAt: {
        $gt: cursor,
        $lte: new Date('2026-10-09T10:00:00.000Z'),
      },
    });
    expect(database.sortObservations).toHaveBeenCalledWith({
      ingestedAt: -1,
      _id: -1,
    });
    expect(database.updateUser).not.toHaveBeenCalled();
  });

  it('acknowledges only the returned boundary and rejects future timestamps', async () => {
    database.findUser.mockResolvedValue({
      _id: 'user-id',
      lastSeenChangesAt: new Date('2026-10-09T09:00:00.000Z'),
    });

    await request(app)
      .post('/api/v1/watchlist/changes/seen')
      .set('Authorization', `Bearer ${token}`)
      .send({ asOf: '2026-10-09T09:45:00.000Z' })
      .expect(204);

    expect(database.updateUser).toHaveBeenCalledWith(
      { _id: 'user-id' },
      {
        $max: {
          lastSeenChangesAt: new Date('2026-10-09T09:45:00.000Z'),
        },
      },
    );

    await request(app)
      .post('/api/v1/watchlist/changes/seen')
      .set('Authorization', `Bearer ${token}`)
      .send({ asOf: '2026-10-09T11:00:00.000Z' })
      .expect(400);
    expect(database.updateUser).toHaveBeenCalledTimes(1);
  });
});
