import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  findSeries: vi.fn(),
  sortSeries: vi.fn(),
  initializeEvents: vi.fn(),
  upsertEvent: vi.fn(),
  deleteEvents: vi.fn(),
}));

const provider = vi.hoisted(() => ({
  fetchSeriesRelease: vi.fn(),
  fetchReleaseDates: vi.fn(),
}));

vi.mock('./fred.client.js', () => ({
  fetchFredSeries: vi.fn(),
  fetchFredObservations: vi.fn(),
  fetchFredSeriesRelease: provider.fetchSeriesRelease,
  fetchFredReleaseDates: provider.fetchReleaseDates,
}));

vi.mock('./models/macro-series.model.js', () => ({
  MacroSeries: { find: database.findSeries },
}));

vi.mock('./models/economic-event.model.js', () => ({
  EconomicEvent: {
    init: database.initializeEvents,
    findOneAndUpdate: database.upsertEvent,
    deleteMany: database.deleteEvents,
  },
}));

import { syncFredCalendar } from './fred-sync.js';

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T14:00:00Z'));
  vi.spyOn(console, 'log').mockImplementation(() => {});

  database.findSeries.mockReturnValue({ sort: database.sortSeries });
  database.sortSeries.mockResolvedValue([
    {
      _id: 'cpi-series',
      providerSeriesId: 'CPIAUCSL',
      country: 'US',
      currency: 'USD',
      category: 'inflation',
      unit: 'index',
    },
  ]);
  database.initializeEvents.mockResolvedValue(undefined);
  database.upsertEvent.mockResolvedValue(null);
  database.deleteEvents.mockResolvedValue({ deletedCount: 0 });
  provider.fetchSeriesRelease.mockResolvedValue({
    id: 10,
    name: 'Consumer Price Index',
  });
  provider.fetchReleaseDates.mockResolvedValue([
    { release_id: 10, date: '2026-09-27' },
    { release_id: 10, date: '2026-09-28' },
    { release_id: 10, date: '2026-10-14' },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FRED calendar ingestion', () => {
  it('keeps today and future dates and reuses their identities on a retry', async () => {
    expect(await syncFredCalendar('test-key')).toBe(2);

    const firstRunIds = database.upsertEvent.mock.calls.map(
      ([filter]) => filter.providerEventId,
    );
    expect(firstRunIds).toEqual([
      'release-10:2026-09-28',
      'release-10:2026-10-14',
    ]);
    expect(database.upsertEvent.mock.calls[0]?.[1].$set).toMatchObject({
      scheduledAt: new Date('2026-09-28T00:00:00Z'),
      dateOnly: true,
      importance: null,
      forecast: null,
    });

    database.upsertEvent.mockClear();
    await syncFredCalendar('test-key');
    const retryIds = database.upsertEvent.mock.calls.map(
      ([filter]) => filter.providerEventId,
    );
    expect(retryIds).toEqual(firstRunIds);

    expect(database.deleteEvents).toHaveBeenCalledWith({
      provider: 'fred',
      dateOnly: true,
      scheduledAt: { $gte: new Date('2026-09-28T00:00:00Z') },
      providerEventId: {
        $regex: '^release-10:',
        $nin: firstRunIds,
      },
    });
  });

  it('preserves the stored calendar when the provider request fails', async () => {
    provider.fetchReleaseDates.mockRejectedValueOnce(
      new Error('FRED unavailable'),
    );

    await expect(syncFredCalendar('test-key')).rejects.toThrow(
      'FRED unavailable',
    );
    expect(database.upsertEvent).not.toHaveBeenCalled();
    expect(database.deleteEvents).not.toHaveBeenCalled();
  });
});
