import {
  type HistoricalPosition,
  mt5HistoryUploadResponseSchema,
  sharedSnapshotResponse,
  sharedSnapshotResponseSchema,
} from '@macrointel/contracts';
import { Router } from 'express';
import { Account } from './models/account.model.js';
import { HistoricalTrades } from './models/historicalTrades.model.js';

let latestSnapshot: sharedSnapshotResponse | null = null;
export const integrationsRouter: Router = Router();

integrationsRouter.post('/mt5/snapshot', (req, res) => {
  const result = sharedSnapshotResponseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid Snapshot' });
  }

  latestSnapshot = result.data;

  return res.sendStatus(204);
});

integrationsRouter.get('/mt5/snapshot', (req, res) => {
  if (latestSnapshot === null)
    return res.status(503).json({ error: 'No snapshot received yet' });
  const currentTime = new Date();
  const dataFetchedTime = new Date(latestSnapshot.capturedAt);
  if (currentTime.valueOf() - dataFetchedTime.valueOf() > 3000) {
    return res.status(503).json({ error: 'Snapshot is stale' });
  }
  return res.json(latestSnapshot);
});

integrationsRouter.post('/mt5/getHistory', async (req, res) => {
  const result = await mt5HistoryUploadResponseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Error retrieving historial deals' });
  }
  let account = await Account.findOne({
    login: result.data.account.login,
    server: result.data.account.server,
  });
  if (!account) {
    account = await Account.create({
      login: result.data.account.login,
      server: result.data.account.server,
    });
  }
  for (const deal of result.data.deals) {
    await HistoricalTrades.findOneAndUpdate(
      {
        accountId: account._id,
        ticket: deal.ticket,
      },
      { $set: { ...deal, accountId: account._id } },
      { upsert: true, runValidators: true },
    );
  }
  account.historySyncedAt = new Date(result.data.capturedAt);
  await account.save();

  return res.status(200).json(result.data);
});

integrationsRouter.get('/mt5/getHistory', async (req, res) => {
  const { login, server } = req.query;

  if (typeof login !== 'string' || typeof server !== 'string') {
    return res.status(400).json({ error: 'login and server are required' });
  }
  const account = await Account.findOne({ login, server });
  if (!account) {
    return res.status(400).json({ error: 'Account not found' });
  }
  const deals = await HistoricalTrades.find({
    accountId: account._id,
  }).sort({ occurredAt: 1 });

  const dealsByPosition = new Map<string, typeof deals>();

  for (const deal of deals) {
    const positionDeals = dealsByPosition.get(deal.positionId);
    if (positionDeals) {
      positionDeals.push(deal);
    } else {
      dealsByPosition.set(deal.positionId, [deal]);
    }
  }
  const positions: HistoricalPosition[] = [];
  for (const [positionId, positionDeals] of dealsByPosition) {
    const openingDeals = positionDeals.filter((deal) => deal.entry === 'in');
    const closingDeals = positionDeals.filter(
      (deal) => deal.entry === 'out' || deal.entry === 'outBy',
    );

    const openedVolume = openingDeals.reduce(
      (total, deal) => total + deal.volume,
      0.0,
    );
    const closedVolume = closingDeals.reduce(
      (total, deal) => total + deal.volume,
      0.0,
    );
    if (Math.abs(openedVolume - closedVolume) > 0.00001) {
      continue;
    }
    const openPriceVolume = openingDeals.reduce(
      (total, deal) => total + deal.price * deal.volume,
      0,
    );
    const closePriceVolume = closingDeals.reduce(
      (total, deal) => total + deal.price * deal.volume,
      0,
    );
    const firstOpen = openingDeals[0];
    const lastClose = closingDeals[closingDeals.length - 1];
    if (!firstOpen || !lastClose) {
      continue;
    }
    positions.push({
      positionId,
      magic: firstOpen.magic ?? undefined,
      symbol: firstOpen.symbol,
      side: firstOpen.side,
      volume: openedVolume,
      openedAt: firstOpen.occurredAt.toISOString(),
      openPrice: openPriceVolume / openedVolume,
      closedAt: lastClose.occurredAt.toISOString(),
      closedPrice: closePriceVolume / closedVolume,
      grossProfit: positionDeals.reduce(
        (total, deal) => total + deal.profit,
        0,
      ),
    });
  }

  return res.status(200).json({
    positions,
    historySyncedAt: account.historySyncedAt?.toISOString() ?? null,
  });
});
