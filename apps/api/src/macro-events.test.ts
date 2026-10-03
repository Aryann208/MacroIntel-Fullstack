import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { upcomingEventsResponseSchema } from '@macrointel/contracts';

const database = vi.hoisted(() => ({
  findEvents: vi.fn(),
  sortEvents: vi.fn(),
}));

vi.mock('./modules/macro/models/economic-event.model.js', () => ({
  EconomicEvent: { find: database.findEvents },
}));

import { createApp } from './app.js';

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T14:00:00Z'));
  database.findEvents.mockReturnValue({ sort: database.sortEvents });
  database.sortEvents.mockResolvedValue([
    {
      _id: 'event-id',
      provider: 'fred',
      providerEventId: 'release-10:2026-09-28',
      name: 'Consumer Price Index',
      country: 'US',
      currency: 'USD',
      category: 'inflation',
      importance: null,
      scheduledAt: new Date('2026-09-28T00:00:00Z'),
      dateOnly: true,
      forecast: null,
      previous: null,
      unit: 'index',
      sourceUrl: 'https://fred.stlouisfed.org/release?rid=10',
    },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('upcoming FRED events endpoint', () => {
  it('returns unknown fields as null and queries from today for date-only events', async () => {
    const app = createApp({
      origin: 'http://localhost:3000',
      logger: pino({ level: 'silent' }),
      checkDependencies: async () => ({
        status: 'ok',
        dependencies: { mongodb: 'up' },
        timestamp: new Date().toISOString(),
      }),
    });

    const response = await request(app)
      .get('/api/v1/macro/events/upcoming')
      .expect(200);

    const parsed = upcomingEventsResponseSchema.parse(response.body);
    expect(parsed.events[0]).toMatchObject({
      provider: 'fred',
      dateOnly: true,
      importance: null,
      forecast: null,
    });
    expect(database.findEvents).toHaveBeenCalledWith({
      provider: 'fred',
      status: 'scheduled',
      $or: [
        {
          dateOnly: true,
          scheduledAt: { $gte: new Date('2026-09-28T00:00:00Z') },
        },
        {
          dateOnly: { $ne: true },
          scheduledAt: { $gte: new Date('2026-09-28T14:00:00Z') },
        },
      ],
    });
  });
});
