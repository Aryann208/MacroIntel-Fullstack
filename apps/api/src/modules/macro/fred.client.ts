import z from 'zod';

const fredSeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  frequency: z.string(),
  units: z.string(),
  seasonal_adjustment: z.string(),
  last_updated: z.string().min(1),
});
const fredObservationSchema = z.object({
  date: z.iso.date(),
  value: z.string(),
  realtime_start: z.iso.date(),
  realtime_end: z.iso.date(),
});
const fredReleaseSchema = z.object({
  id: z.number(),
  name: z.string(),
});
const fredReleaseDateSchema = z.object({
  release_id: z.number(),
  date: z.iso.date(),
});

const fredSeriesResponseSchema = z.object({
  seriess: z.array(fredSeriesSchema).min(1),
});

const fredObservationResponseSchema = z.object({
  observations: z.array(fredObservationSchema).min(1),
});

const fredReleaseResponseSchema = z.object({
  releases: z.array(fredReleaseSchema),
});

const fredReleaseDateResponseSchema = z.object({
  release_dates: z.array(fredReleaseDateSchema),
});

export async function fetchFredSeries(seriesId: string, apiKey: string) {
  const url = new URL('https://api.stlouisfed.org/fred/series');

  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    throw new Error(`Fetching FRED Series failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const validatedData = fredSeriesResponseSchema.parse(data);
  const firstSeries = validatedData.seriess[0];
  if (!firstSeries) {
    throw new Error(`FRED returned no metadata for series ${seriesId}`);
  }
  return firstSeries;
}

export async function fetchFredObservations(seriesId: string, apiKey: string) {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
  const startDate = fiveYearsAgo.toISOString().slice(0, 10);
  url.searchParams.set('observation_start', startDate);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '5000');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    throw new Error(
      `Fetching FRED Series Observation failed with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = fredObservationResponseSchema.parse(data);
  return validatedData.observations;
}

export async function fetchFredSeriesRelease(seriesId: string, apiKey: string) {
  const url = new URL('https://api.stlouisfed.org/fred/series/release');
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(
      `Fetching FRED releases failed with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = fredReleaseResponseSchema.parse(data);
  const release = validatedData.releases[0];

  if (!release) {
    throw new Error(`FRED returned no release for ${seriesId}`);
  }

  return release;
}

export async function fetchFredReleaseDates(releaseId: number, apiKey: string) {
  const url = new URL('https://api.stlouisfed.org/fred/release/dates');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('release_id', String(releaseId));
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '10000');
  url.searchParams.set('include_release_dates_with_no_data', 'true');
  url.searchParams.set('file_type', 'json');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(
      `Fetching FRED Series Observation failed with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = fredReleaseDateResponseSchema.parse(data);
  return validatedData.release_dates;
}
