import { Router } from 'express';
import {
  latestMacroObservationResponseSchema,
  macroCategorySchema,
  macroSeriesListResponseSchema,
  upcomingEventsResponseSchema,
} from '@macrointel/contracts';
import { EconomicEvent } from './models/economic-event.model.js';
import { MacroSeries } from './models/macro-series.model.js';
import { MacroObservation } from './models/macro-observation.model.js';
import z from 'zod';

export const macroRouter = Router();

const seriesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  country: z.string().trim().length(2).optional(),
  category: macroCategorySchema.optional(),
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

macroRouter.get('/events/upcoming', async (_req, res) => {
  const events = await EconomicEvent.find({
    status: 'scheduled',
    scheduledAt: { $gte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .limit(10);

  const response = upcomingEventsResponseSchema.parse({
    events: events.map((event) => ({
      id: event._id.toString(),
      name: event.name,
      country: event.country,
      currency: event.currency,
      category: event.category,
      importance: event.importance,
      scheduledAt: event.scheduledAt.toISOString(),
      forecast: event.forecast,
      previous: event.previous,
      unit: event.unit,
    })),
  });
  res.json(response);
});
