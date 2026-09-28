import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchFredReleaseDates,
  fetchFredSeriesRelease,
} from './fred.client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FRED calendar client', () => {
  it('validates a numeric release ID and returns the release without its wrapper', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ releases: [{ id: 10, name: 'Consumer Price Index' }] }),
      ),
    );

    await expect(
      fetchFredSeriesRelease('CPIAUCSL', 'test-key'),
    ).resolves.toEqual({
      id: 10,
      name: 'Consumer Price Index',
    });
  });

  it('requests unpublished dates and returns a date array, including an empty schedule', async () => {
    const dates = [{ release_id: 10, date: '2026-10-14' }];
    const fetchMock = vi.fn(async (_url: URL) =>
      Response.json({ release_dates: dates }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchFredReleaseDates(10, 'test-key')).resolves.toEqual(dates);
    const requestedUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestedUrl?.searchParams.get('release_id')).toBe('10');
    expect(
      requestedUrl?.searchParams.get('include_release_dates_with_no_data'),
    ).toBe('true');

    fetchMock.mockResolvedValueOnce(Response.json({ release_dates: [] }));
    await expect(fetchFredReleaseDates(10, 'test-key')).resolves.toEqual([]);
  });
});
