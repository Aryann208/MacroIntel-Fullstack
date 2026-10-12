import { z } from 'zod';

export const positionSideEnum = ['buy', 'sell'] as const;

export const positionResponseSchema = z.object({
  ticket: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(positionSideEnum),
  volume: z.number(),
  priceOpen: z.number(),
  priceCurrent: z.number(),
  profit: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  openedAt: z.iso.datetime(),
});

export const accountResponseSchema = z.object({
  login: z.string(),
  server: z.string(),
  company: z.string(),
  currency: z.string(),
  balance: z.number(),
  equity: z.number(),
  margin: z.number(),
  freeMargin: z.number(),
});

export const sharedSnapshotResponseSchema = z.object({
  capturedAt: z.iso.datetime(),
  schemaVersion: z.literal(1),
  account: accountResponseSchema,
  positions: z.array(positionResponseSchema),
});

export const historicalDealEntryEnum = ['in', 'out', 'inout', 'outBy'] as const;

export const historicalDealResponseSchema = z.object({
  ticket: z.string().min(1),
  orderTicket: z.string().min(1),
  positionId: z.string().min(1),
  magic: z.number().int().optional(),
  symbol: z.string().min(1),
  side: z.enum(positionSideEnum),
  entry: z.enum(historicalDealEntryEnum),
  volume: z.number(),
  price: z.number(),
  profit: z.number(),
  occurredAt: z.iso.datetime(),
});
export const historicalPositionResponseSchema = z.object({
  positionId: z.string().min(1),
  magic: z.number().int().nullable().optional(),
  symbol: z.string().min(1),
  side: z.enum(positionSideEnum),
  volume: z.number(),
  openedAt: z.iso.datetime(),
  openPrice: z.number(),
  closedAt: z.iso.datetime(),
  closedPrice: z.number(),
  grossProfit: z.number(),
});

export const historicalPositionsResponseSchema = z.object({
  positions: z.array(historicalPositionResponseSchema),
  historySyncedAt: z.iso.datetime().nullable(),
});

export const mt5HistoryUploadResponseSchema = z.object({
  schemaVersion: z.literal(1),
  capturedAt: z.iso.datetime(),
  account: z.object({
    login: z.string(),
    server: z.string(),
  }),
  deals: z.array(historicalDealResponseSchema),
});

export type sharedSnapshotResponse = z.infer<
  typeof sharedSnapshotResponseSchema
>;
export type HistoricalDeal = z.infer<typeof historicalDealResponseSchema>;
export type HistoricalPosition = z.infer<typeof historicalPositionResponseSchema>;
export type Mt5HistoryUpload = z.infer<typeof mt5HistoryUploadResponseSchema>;
export type HistoricalPositions = z.infer<typeof historicalPositionsResponseSchema>;
