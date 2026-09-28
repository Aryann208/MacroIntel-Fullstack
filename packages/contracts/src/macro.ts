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
  provider: z.string(),
  name: z.string(),
  country: z.string(),
  currency: z.string(),
  category: macroCategorySchema,
  importance: z.enum(['low', 'medium', 'high']).nullable(),
  scheduledAt: z.iso.datetime(),
  dateOnly: z.boolean(),
  forecast: z.number().nullable(),
  previous: z.number().nullable(),
  unit: z.string(),
  sourceUrl: z.url().nullable(),
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

export const macroSeriesListResponseSchema = z.object({
  items: z.array(macroSeriesListItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export type MacroSeriesListResponse = z.infer<
  typeof macroSeriesListResponseSchema
>;

export const watchlistObservationSchema = z.object({
  value: z.number(),
  observedAt: z.iso.datetime(),
  vintageAt: z.iso.datetime(),
});

export const watchlistItemSchema = macroSeriesListItemSchema.extend({
  latestObservation: watchlistObservationSchema.nullable(),
});

export const watchlistResponseSchema = z.object({
  items: z.array(watchlistItemSchema),
});

export type WatchlistResponse = z.infer<typeof watchlistResponseSchema>;

export const macroSeriesHistoryResponseSchema = z.object({
  providerSeriesId: z.string(),
  name: z.string(),
  unit: z.string(),
  items: z.array(watchlistObservationSchema),
});
export type MacroSeriesHistoryResponse = z.infer<
  typeof macroSeriesHistoryResponseSchema
>;
