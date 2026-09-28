import { Router } from 'express';
import {
  latestMacroObservationResponseSchema,
  macroCategorySchema,
  macroSeriesHistoryResponseSchema,
  macroSeriesListResponseSchema,
  upcomingEventsResponseSchema,
} from '@macrointel/contracts';
import { EconomicEvent } from './models/economic-event.model.js';
import { MacroSeries } from './models/macro-series.model.js';
import { MacroObservation } from './models/macro-observation.model.js';
import z from 'zod';

export const macroRouter: Router = Router();

const seriesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  country: z.string().trim().length(2).optional(),
  category: macroCategorySchema.optional(),
});

const upcomingEventsQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

macroRouter.get('/series', async (req, res) => {
  const queryResult = seriesListQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    res.status(400).json({ error: 'Invalid series query parameters' });
    return;
  }

  const { page, limit, country, category } = queryResult.data;
  const skip = (page - 1) * limit;

  const filter: {
    isActive: boolean;
    country?: string;
    category?: string;
  } = {
    isActive: true,
  };

  if (country) {
    filter.country = country.toUpperCase();
  }
  if (category) {
    filter.category = category;
  }

  const [series, total] = await Promise.all([
    MacroSeries.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    MacroSeries.countDocuments(filter),
  ]);

  const response = macroSeriesListResponseSchema.parse({
    items: series.map((item) => ({
      providerSeriesId: item.providerSeriesId,
      name: item.name,
      shortName: item.shortName,
      country: item.country,
      category: item.category,
      frequency: item.frequency,
      unit: item.unit,
    })),
    page,
    limit,
    total,
  });

  res.json(response);
});

macroRouter.get('/series/:providerSeriesId/latest', async (req, res) => {
  const series = await MacroSeries.findOne({
    provider: 'fred',
    providerSeriesId: req.params.providerSeriesId,
  });

  if (!series) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }

  const observation = await MacroObservation.findOne({
    seriesId: series._id,
    isLatestVintage: true,
  }).sort({ observedAt: -1, vintageAt: -1 });

  if (!observation) {
    res.status(404).json({ error: 'Observation not found' });
    return;
  }

  const response = latestMacroObservationResponseSchema.parse({
    providerSeriesId: series.providerSeriesId,
    name: series.name,
    unit: series.unit,
    value: observation.value,
    observedAt: observation.observedAt.toISOString(),
    vintageAt: observation.vintageAt.toISOString(),
  });
  res.json(response);
});

macroRouter.get('/series/:providerSeriesId/as-of', async (req, res) => {
  const dateResult = z.iso.datetime().safeParse(req.query.date);

  if (!dateResult.success) {
    res
      .status(400)
      .json({ error: 'A valid ISO date query parameter is required' });
    return;
  }

  const series = await MacroSeries.findOne({
    provider: 'fred',
    providerSeriesId: req.params.providerSeriesId,
  });

  if (!series) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }

  const observation = await MacroObservation.findOne({
    seriesId: series._id,
    vintageAt: {
      $lte: new Date(dateResult.data),
    },
  }).sort({ observedAt: -1, vintageAt: -1 });

  if (!observation) {
    res.status(404).json({
      error: 'No observation existed at the requested date',
    });
    return;
  }

  res.json({
    providerSeriesId: series.providerSeriesId,
    name: series.name,
    unit: series.unit,
    value: observation.value,
    observedAt: observation.observedAt.toISOString(),
    vintageAt: observation.vintageAt.toISOString(),
  });
});

macroRouter.get('/series/:providerSeriesId/history', async (req, res) => {
  const providerSeriesId = req.params.providerSeriesId;
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(60)
    .safeParse(req.query.limit);

  if (!limit.success) {
    res.status(400).json({ error: 'Invalid history limit' });
    return;
  }

  const series = await MacroSeries.findOne({
    provider: 'fred',
    providerSeriesId,
  });

  if (!series) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }
  const observations = await MacroObservation.find({
    seriesId: series._id,
    isLatestVintage: true,
  })
    .sort({ observedAt: -1 })
    .limit(limit.data);

  const chronologicalObservations = observations.reverse();

  const items = chronologicalObservations.map((observation) => ({
    value: observation.value,
    observedAt: observation.observedAt.toISOString(),
    vintageAt: observation.vintageAt.toISOString(),
  }));

  const response = macroSeriesHistoryResponseSchema.parse({
    providerSeriesId: series.providerSeriesId,
    name: series.name,
    unit: series.unit,
    items,
  });

  res.status(200).json(response);
});

macroRouter.get('/events/upcoming', async (_req, res) => {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const events = await EconomicEvent.find({
    provider: 'fred',
    status: 'scheduled',
    $or: [
      { dateOnly: true, scheduledAt: { $gte: today } },
      { dateOnly: { $ne: true }, scheduledAt: { $gte: now } },
    ],
  }).sort({ scheduledAt: 1 });

  const seenReleases = new Set<string>();
  const distinctElements = events.filter((event) => {
    const seperatorIndex = event.providerEventId.indexOf(':');
    const releaseKey = event.providerEventId.slice(0, seperatorIndex);

    if (seenReleases.has(releaseKey)) {
      return false;
    }
    seenReleases.add(releaseKey);
    return true;
  });

  const upcomingEvents = distinctElements.slice(0, 10);

  const response = upcomingEventsResponseSchema.parse({
    events: upcomingEvents.map((event) => ({
      id: event._id.toString(),
      provider: event.provider,
      name: event.name,
      country: event.country,
      currency: event.currency,
      category: event.category,
      importance: event.importance ?? null,
      scheduledAt: event.scheduledAt.toISOString(),
      dateOnly: event.dateOnly,
      forecast: event.forecast,
      previous: event.previous,
      unit: event.unit,
      sourceUrl: event.sourceUrl ?? null,
    })),
  });
  res.json(response);
});

macroRouter.get('/events', async (req, res) => {
  const queryResult = upcomingEventsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: 'Invalid from and to query paramaters' });
    return;
  }

  const { from, to } = queryResult.data;

  if (to < from) {
    res.status(400).json({
      error: 'to date cannot be less than from date',
    });
    return;
  }
  const startDate = new Date(`${from}T00:00:00.000Z`);

  const endDate = new Date(`${to}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const upcomingEvents = await EconomicEvent.find({
    status: 'scheduled',
    provider: 'fred',
    scheduledAt: {
      $gte: startDate,
      $lt: endDate,
    },
  }).sort({ scheduledAt: 1 });

  const response = upcomingEventsResponseSchema.parse({
    events: upcomingEvents.map((event) => ({
      id: event._id.toString(),
      provider: event.provider,
      name: event.name,
      country: event.country,
      currency: event.currency,
      category: event.category,
      importance: event.importance ?? null,
      scheduledAt: event.scheduledAt.toISOString(),
      dateOnly: event.dateOnly,
      forecast: event.forecast,
      previous: event.previous,
      unit: event.unit,
      sourceUrl: event.sourceUrl ?? null,
    })),
  });

  res.status(200).json(response);
});
