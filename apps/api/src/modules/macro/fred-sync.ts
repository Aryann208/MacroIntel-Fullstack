import {
  fetchFredObservations,
  fetchFredReleaseDates,
  fetchFredSeries,
  fetchFredSeriesRelease,
} from './fred.client.js';
import { EconomicEvent } from './models/economic-event.model.js';
import { MacroObservation } from './models/macro-observation.model.js';
import { MacroSeries } from './models/macro-series.model.js';

type SeriesConfig = {
  id: string;
  shortName: string;
  category: 'inflation' | 'employment' | 'rates' | 'growth';
  country: string;
  currency: string;
};

const SERIES_CATALOG: SeriesConfig[] = [
  {
    id: 'CPIAUCSL',
    shortName: 'CPI',
    category: 'inflation',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'UNRATE',
    shortName: 'Unemployment',
    category: 'employment',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'FEDFUNDS',
    shortName: 'Fed Funds',
    category: 'rates',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'GDPC1',
    shortName: 'Real GDP',
    category: 'growth',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'PCEPI',
    shortName: 'PCE Price Index',
    category: 'inflation',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'PAYEMS',
    shortName: 'Nonfarm Employment',
    category: 'employment',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'DGS10',
    shortName: '10-Year Treasury Yield',
    category: 'rates',
    country: 'US',
    currency: 'USD',
  },
  {
    id: 'INDPRO',
    shortName: 'Industrial Production',
    category: 'growth',
    country: 'US',
    currency: 'USD',
  },
];

function normalizeFrequency(value: string) {
  switch (value) {
    case 'Daily':
      return 'daily';
    case 'Weekly':
      return 'weekly';
    case 'Monthly':
      return 'monthly';
    case 'Quarterly':
      return 'quarterly';
    case 'Annual':
      return 'annual';
    default:
      throw new Error(`Unsupported FRED frequency: ${value}`);
  }
}

function normalizeSeasonalAdjustment(value: string) {
  if (value.startsWith('Seasonally Adjusted')) {
    return 'seasonally-adjusted';
  }

  if (value === 'Not Seasonally Adjusted') {
    return 'not-seasonally-adjusted';
  }

  return 'unknown';
}

function parseFredTimestamp(value: string) {
  const normalized = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid FRED timestamp: ${value}`);
  }

  return date;
}

function parseFredDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid FRED date: ${value}`);
  }

  return date;
}

async function ingestSeries(config: SeriesConfig, apiKey: string) {
  const [fredSeries, fredObservations] = await Promise.all([
    fetchFredSeries(config.id, apiKey),
    fetchFredObservations(config.id, apiKey),
  ]);

  const validObservations = fredObservations.filter((observation) => {
    const value = observation.value.trim();
    return value !== '' && value !== '.' && Number.isFinite(Number(value));
  });

  if (validObservations.length === 0) {
    throw new Error(`FRED returned no numeric observations for ${config.id}`);
  }

  const providerUpdatedAt = parseFredTimestamp(fredSeries.last_updated);

  const series = await MacroSeries.findOneAndUpdate(
    {
      provider: 'fred',
      providerSeriesId: fredSeries.id,
    },
    {
      $set: {
        name: fredSeries.title,
        shortName: config.shortName,
        country: config.country,
        currency: config.currency,
        category: config.category,
        frequency: normalizeFrequency(fredSeries.frequency),
        unit: fredSeries.units,
        seasonalAdjustment: normalizeSeasonalAdjustment(
          fredSeries.seasonal_adjustment,
        ),
        isActive: true,
        sourceUrl: `https://fred.stlouisfed.org/series/${fredSeries.id}`,
        providerUpdatedAt,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );

  let changedCount = 0;

  for (const fredObservation of validObservations) {
    const observedAt = parseFredDate(fredObservation.date);
    const value = Number(fredObservation.value);

    const currentObservation = await MacroObservation.findOne({
      seriesId: series._id,
      observedAt,
      isLatestVintage: true,
    });

    // FRED's real-time start can change even when the published value has not.
    if (currentObservation?.value === value) {
      continue;
    }

    const vintageAt = parseFredDate(fredObservation.realtime_start);
    const savedObservation = await MacroObservation.findOneAndUpdate(
      {
        seriesId: series._id,
        observedAt,
        vintageAt,
      },
      {
        $set: {
          value,
          isLatestVintage: true,
          provider: 'fred',
          providerUpdatedAt,
          ingestedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
      },
    );

    await MacroObservation.updateMany(
      {
        seriesId: series._id,
        observedAt,
        _id: { $ne: savedObservation._id },
        isLatestVintage: true,
      },
      {
        $set: { isLatestVintage: false },
      },
    );

    changedCount += 1;
  }

  console.log(
    `Ingested ${fredSeries.id}: ${validObservations.length} valid observations, ${changedCount} new or changed`,
  );
}

export async function syncFredCalendar(apiKey: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayString = today.toISOString().slice(0, 10);

  const series = await MacroSeries.find({
    provider: 'fred',
    isActive: true,
    providerSeriesId: { $in: SERIES_CATALOG.map((config) => config.id) },
  }).sort({ providerSeriesId: 1 });

  // Wait for the unique provider/event index before writing calendar entries.
  await EconomicEvent.init();

  const syncedReleaseIds: number[] = [];
  let eventCount = 0;

  for (const item of series) {
    const release = await fetchFredSeriesRelease(item.providerSeriesId, apiKey);

    // Several indicators can belong to the same publication.
    if (syncedReleaseIds.includes(release.id)) {
      continue;
    }

    const releaseDates = await fetchFredReleaseDates(release.id, apiKey);
    const upcomingDates = releaseDates.filter(
      (entry) => entry.date >= todayString,
    );
    const eventIds: string[] = [];

    for (const entry of upcomingDates) {
      const providerEventId = `release-${release.id}:${entry.date}`;
      eventIds.push(providerEventId);

      await EconomicEvent.findOneAndUpdate(
        { provider: 'fred', providerEventId },
        {
          $set: {
            seriesId: item._id,
            name: release.name,
            country: item.country,
            currency: item.currency,
            category: item.category,
            importance: null,
            scheduledAt: parseFredDate(entry.date),
            dateOnly: true,
            status: 'scheduled',
            actual: null,
            forecast: null,
            previous: null,
            revisedPrevious: null,
            releasedAt: null,
            unit: item.unit,
            sourceUrl: `https://fred.stlouisfed.org/release?rid=${release.id}`,
          },
        },
        { upsert: true, runValidators: true },
      );
    }

    // Refresh only this release's future calendar entries if its schedule changes.
    await EconomicEvent.deleteMany({
      provider: 'fred',
      dateOnly: true,
      scheduledAt: { $gte: today },
      providerEventId: {
        $regex: `^release-${release.id}:`,
        $nin: eventIds,
      },
    });

    syncedReleaseIds.push(release.id);
    eventCount += upcomingDates.length;
    console.log(
      `Synced ${release.name}: ${upcomingDates.length} scheduled dates`,
    );
  }

  return eventCount;
}

export async function syncFred(apiKey: string) {
  for (const config of SERIES_CATALOG) {
    await ingestSeries(config, apiKey);
  }

  await syncFredCalendar(apiKey);
}
