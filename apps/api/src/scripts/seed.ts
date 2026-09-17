import mongoose from 'mongoose';
import { parseEnv } from '../env.js';
import { MacroSeries } from '../modules/macro/models/macro-series.model.js';
import { MacroObservation } from '../modules/macro/models/macro-observation.model.js';
import { EconomicEvent } from '../modules/macro/models/economic-event.model.js';

const env = parseEnv(process.env);

try {
  await mongoose.connect(env.MONGODB_URI);

  const series = await MacroSeries.findOneAndUpdate(
    {
      provider: 'fred',
      providerSeriesId: 'CPIAUCSL',
    },
    {
      $set: {
        name: 'Consumer Price Index',
        shortName: 'CPI',
        country: 'US',
        currency: 'USD',
        category: 'inflation',
        frequency: 'monthly',
        unit: 'index',
        seasonalAdjustment: 'seasonally-adjusted',
        isActive: true,
        sourceUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );

  const observation = await MacroObservation.findOneAndUpdate(
    {
      seriesId: series._id,
      observedAt: new Date('2026-08-01T00:00:00Z'),
      vintageAt: new Date('2026-09-10T12:00:00Z'),
    },
    {
      $set: {
        value: 322.1,
        isLatestVintage: false,
        provider: 'fred',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );
  const revisedObservation = await MacroObservation.findOneAndUpdate(
    {
      seriesId: series._id,
      observedAt: new Date('2026-08-01T00:00:00Z'),
      vintageAt: new Date('2026-09-15T12:00:00Z'),
    },
    {
      $set: {
        value: 322.3,
        isLatestVintage: true,
        provider: 'fred',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );

  const event = await EconomicEvent.findOneAndUpdate(
    {
      provider: 'manual',
      providerEventId: 'us-cpi-next',
    },
    {
      $set: {
        seriesId: series._id,
        name: 'US CPI Release',
        country: 'US',
        currency: 'USD',
        category: 'inflation',
        importance: 'high',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'scheduled',
        forecast: 323,
        previous: 322.3,
        unit: 'index',
        sourceUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL',
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  const unemploymentSeries = await MacroSeries.findOneAndUpdate(
    {
      provider: 'fred',
      providerSeriesId: 'UNRATE',
    },
    {
      $set: {
        name: 'Unemployment Rate',
        shortName: 'Unemployment',
        country: 'US',
        currency: 'USD',
        category: 'employment',
        frequency: 'monthly',
        unit: 'percent',
        seasonalAdjustment: 'seasonally-adjusted',
        isActive: true,
        sourceUrl: 'https://fred.stlouisfed.org/series/UNRATE',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );

  await MacroObservation.findOneAndUpdate(
    {
      seriesId: unemploymentSeries._id,
      observedAt: new Date('2026-08-01T00:00:00Z'),
      vintageAt: new Date('2026-09-05T12:00:00Z'),
    },
    {
      $set: {
        value: 4.3,
        isLatestVintage: true,
        provider: 'fred',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  );

  console.log(`Seeded series: ${unemploymentSeries.shortName}`);

  console.log(
    `Seeded series: ${series.shortName} with two observations : ${observation.vintageAt} and ${revisedObservation.vintageAt}`,
  );
  console.log(`Seeded upcoming event: ${event.name}`);
} catch (error) {
  console.error('Seed Failed', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
