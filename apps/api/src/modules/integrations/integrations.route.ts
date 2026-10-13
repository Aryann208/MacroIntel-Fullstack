import {
  type HistoricalPosition,
  mt5HistoryUploadResponseSchema,
  sharedSnapshotResponse,
  sharedSnapshotResponseSchema,
} from '@macrointel/contracts';
import { Router } from 'express';
import { Account } from './models/account.model.js';
import { HistoricalTrades } from './models/historicalTrades.model.js';
import { directionEnum, outcomeEnum } from '../../utils/types.js';

let latestSnapshot: sharedSnapshotResponse | null = null;
const historicalPositionsPageSize = 10;
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
  const fromValue = req.query.from;
  const toValue = req.query.to;
  const magicNumberFilter = req.query.magicNumber;
  const symbolFilter = req.query.symbol;
  const directionFilter = req.query.direction;
  const outcomeFilter = req.query.outcome;
  const cursorValue = req.query.cursor;
  let cursorClosedAt: string | undefined;
  let cursorPositionId: string | undefined;

  if (cursorValue !== undefined) {
    if (typeof cursorValue !== 'string') {
      return res.status(400).json({ error: 'Invalid cursor' });
    }

    const cursorParts = cursorValue.split('~');
    const closedAt = cursorParts[0];
    const positionId = cursorParts[1];

    if (
      cursorParts.length !== 2 ||
      !closedAt ||
      !positionId ||
      Number.isNaN(Date.parse(closedAt))
    ) {
      return res.status(400).json({ error: 'Invalid cursor' });
    }

    cursorClosedAt = closedAt;
    cursorPositionId = positionId;
  }
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

  let filteredPositions = positions;

  //filtering by magic numbers
  if (magicNumberFilter !== undefined) {
    if (Number.isNaN(Number(magicNumberFilter))) {
      return res.status(400).json({ error: 'Invalid magic number' });
    }
    filteredPositions = filteredPositions.filter(
      (position) => position.magic === Number(magicNumberFilter),
    );
  }
  // Filtering by symbol
  if (symbolFilter !== undefined) {
    if (typeof symbolFilter !== 'string') {
      return res.status(400).json({ error: 'Invalid symbol' });
    }
    filteredPositions = filteredPositions.filter(
      (position) => position.symbol === symbolFilter,
    );
  }
  // Filtering by direction
  if (directionFilter !== undefined) {
    if (
      typeof directionFilter !== 'string' ||
      !directionEnum.includes(String(directionFilter))
    ) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    filteredPositions = filteredPositions.filter(
      (position) => position.side === directionFilter,
    );
  }
  // Filtering by symbol
  if (outcomeFilter !== undefined) {
    if (
      typeof outcomeFilter !== 'string' ||
      !outcomeEnum.includes(String(outcomeFilter))
    ) {
      return res.status(400).json({ error: 'Invalid outcome' });
    }
    filteredPositions = filteredPositions.filter((position) => {
      if (outcomeFilter === 'profit') return position.grossProfit > 0;
      else if (outcomeFilter === 'loss') return position.grossProfit < 0;
    });
  }
  // Filtering by date
  if (fromValue !== undefined || toValue !== undefined) {
    if (typeof fromValue !== 'string' || typeof toValue !== 'string') {
      return res
        .status(400)
        .json({ error: 'from and to must be provided together' });
    }
    const fromMs = new Date(fromValue).getTime();
    const toMs = new Date(toValue).getTime();

    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    filteredPositions = filteredPositions.filter((position) => {
      const closedAtMs = new Date(position.closedAt).getTime();
      return closedAtMs >= fromMs && closedAtMs < toMs;
    });
  }
  filteredPositions.sort(
    (firstPosition, secondPosition) =>
      secondPosition.closedAt.localeCompare(firstPosition.closedAt) ||
      secondPosition.positionId.localeCompare(firstPosition.positionId),
  );

  let winningPositions = 0;
  let losingPositions = 0;
  let breakevenPositions = 0;
  let totalProfit = 0;
  let winningProfit = 0;
  let losingProfit = 0;
  const profitByDay = new Map<string, number>();

  for (const position of filteredPositions) {
    totalProfit += position.grossProfit;
    if (position.grossProfit > 0) {
      winningPositions += 1;
      winningProfit += position.grossProfit;
    } else if (position.grossProfit < 0) {
      losingPositions += 1;
      losingProfit += position.grossProfit;
    } else {
      breakevenPositions += 1;
    }

    const closedDate = position.closedAt.slice(0, 10);
    const currentDayProfit = profitByDay.get(closedDate) ?? 0;
    profitByDay.set(closedDate, currentDayProfit + position.grossProfit);
  }

  const decidedPositions = winningPositions + losingPositions;
  const lossAmount = Math.abs(losingProfit);
  let cumulativeProfit = 0;
  const dailyPerformance = Array.from(profitByDay.entries())
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([date, profit]) => {
      cumulativeProfit += profit;
      return { date, profit, cumulativeProfit };
    });

  const metrics = {
    totalPositions: filteredPositions.length,
    winningPositions,
    losingPositions,
    breakevenPositions,
    winRatePct:
      decidedPositions === 0
        ? null
        : (winningPositions / decidedPositions) * 100,
    totalProfit,
    averageWin:
      winningPositions === 0 ? null : winningProfit / winningPositions,
    averageLoss:
      losingPositions === 0 ? null : losingProfit / losingPositions,
    profitFactor: lossAmount === 0 ? null : winningProfit / lossAmount,
  };

  let positionsAfterCursor = filteredPositions;
  if (cursorClosedAt !== undefined && cursorPositionId !== undefined) {
    const afterClosedAt = cursorClosedAt;
    const afterPositionId = cursorPositionId;
    positionsAfterCursor = filteredPositions.filter(
      (position) =>
        position.closedAt.localeCompare(afterClosedAt) < 0 ||
        (position.closedAt === afterClosedAt &&
          position.positionId.localeCompare(afterPositionId) < 0),
    );
  }

  const pageWithExtraPosition = positionsAfterCursor.slice(
    0,
    historicalPositionsPageSize + 1,
  );
  const hasMore = pageWithExtraPosition.length > historicalPositionsPageSize;
  const pagePositions = pageWithExtraPosition.slice(
    0,
    historicalPositionsPageSize,
  );
  const lastPosition = pagePositions[pagePositions.length - 1];
  const nextCursor =
    hasMore && lastPosition
      ? `${lastPosition.closedAt}~${lastPosition.positionId}`
      : null;

  return res.status(200).json({
    positions: pagePositions,
    metrics,
    dailyPerformance,
    historySyncedAt: account.historySyncedAt?.toISOString() ?? null,
    hasMore,
    nextCursor,
  });
});
