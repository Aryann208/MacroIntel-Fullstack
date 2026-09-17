import { z } from 'zod';

export const macroCategorySchema = z.enum([
  'inflation',
  'employment',
  'growth',
  'rates',
  'housing',
  'sentiment',
]);

export const macroFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
]);

export const seasonalAdjustmentSchema = z.enum([
  'seasonally-adjusted',
  'not-seasonally-adjusted',
  'unknown',
]);

export const macroSeriesResponseSchema = z
  .object({
    id: z.string().min(1),
    provider: z.literal('fred'),
    providerSeriesId: z.string().min(1),
    name: z.string().min(1),
    shortName: z.string().min(1),
    country: z.string().min(1),
    currency: z.string().min(1),
    category: macroCategorySchema,
    frequency: macroFrequencySchema,
    unit: z.string().min(1),
    seasonalAdjustment: seasonalAdjustmentSchema,
    isActive: z.boolean(),
    sourceUrl: z.url(),
    providerUpdatedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type MacroSeriesResponse = z.infer<typeof macroSeriesResponseSchema>;

export const latestMacroObservationResponseSchema = z.object({
  providerSeriesId: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  value: z.number(),
  observedAt: z.iso.datetime(),
  vintageAt: z.iso.datetime(),
});

export type LatestMacroObservationResponse = z.infer<
  typeof latestMacroObservationResponseSchema
>;

export const upcomingEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  currency: z.string(),
  category: macroCategorySchema,
  importance: z.enum(['low', 'medium', 'high']),
  scheduledAt: z.iso.datetime(),
  forecast: z.number().nullable(),
  previous: z.number().nullable(),
  unit: z.string(),
});

export const upcomingEventsResponseSchema = z.object({
  events: z.array(upcomingEventSchema),
});

export type UpcomingEventsResponse = z.infer<
  typeof upcomingEventsResponseSchema
>;

export const macroSeriesListItemSchema = z.object({
  providerSeriesId: z.string(),
  name: z.string(),
  shortName: z.string(),
  country: z.string(),
  category: macroCategorySchema,
  frequency: macroFrequencySchema,
  unit: z.string(),
});

export type MacroSeriesListItem = z.infer<typeof macroSeriesListItemSchema>;

export const watchlistResponseSchema = z.object({
  items: z.array(macroSeriesListItemSchema),
});

export type WatchlistResponse = z.infer<typeof watchlistResponseSchema>;

export const macroSeriesListResponseSchema = z.object({
  items: z.array(macroSeriesListItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export type MacroSeriesListResponse = z.infer<
  typeof macroSeriesListResponseSchema
>;
