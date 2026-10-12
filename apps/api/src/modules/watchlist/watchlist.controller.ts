import type { Request, Response } from 'express';
import { User } from '../auth/user.model.js';

import { MacroSeries } from '../macro/models/macro-series.model.js';
import {
  acknowledgeWatchlistChangesSchema,
  watchlistChangesResponseSchema,
  watchlistResponseSchema,
} from '@macrointel/contracts';
import { MacroObservation } from '../macro/models/macro-observation.model.js';

export async function getWatchlist(_req: Request, res: Response) {
  const user = await User.findById(res.locals.userId);

  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  const savedSeries = await MacroSeries.find({
    _id: { $in: user.watchlist },
    isActive: true,
  }).sort({ name: 1 });

  const savedSeriesIds = savedSeries.map((series) => series._id);

  const observations = await MacroObservation.find({
    seriesId: { $in: savedSeriesIds },
    isLatestVintage: true,
  }).sort({ observedAt: -1 });

  const items = savedSeries.map((series) => {
    const observation = observations.find((item) =>
      item.seriesId.equals(series._id),
    );

    return {
      providerSeriesId: series.providerSeriesId,
      name: series.name,
      shortName: series.shortName,
      country: series.country,
      category: series.category,
      frequency: series.frequency,
      unit: series.unit,
      latestObservation: observation
        ? {
            value: observation.value,
            observedAt: observation.observedAt.toISOString(),
            vintageAt: observation.vintageAt.toISOString(),
          }
        : null,
    };
  });

  const response = watchlistResponseSchema.parse({ items });
  res.json(response);
}

export async function getWatchlistChanges(_req: Request, res: Response) {
  const user = await User.findById(res.locals.userId);

  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  // Capture the upper boundary before querying. A later import stays unread.
  const asOf = new Date();

  if (!user.lastSeenChangesAt) {
    const response = watchlistChangesResponseSchema.parse({
      items: [],
      asOf: asOf.toISOString(),
      needsBaseline: true,
    });
    res.json(response);
    return;
  }

  const savedSeries = await MacroSeries.find({
    _id: { $in: user.watchlist },
    isActive: true,
  }).sort({ name: 1 });

  const observations = await MacroObservation.find({
    seriesId: { $in: savedSeries.map((series) => series._id) },
    isLatestVintage: true,
    ingestedAt: { $gt: user.lastSeenChangesAt, $lte: asOf },
  }).sort({ ingestedAt: -1, _id: -1 });

  const items = savedSeries.flatMap((series) => {
    const observation = observations.find((item) =>
      item.seriesId.equals(series._id),
    );

    if (!observation) {
      return [];
    }

    return [
      {
        providerSeriesId: series.providerSeriesId,
        name: series.name,
        unit: series.unit,
        value: observation.value,
        observedAt: observation.observedAt.toISOString(),
        ingestedAt: observation.ingestedAt.toISOString(),
      },
    ];
  });

  const response = watchlistChangesResponseSchema.parse({
    items,
    asOf: asOf.toISOString(),
    needsBaseline: false,
  });
  res.json(response);
}

function parseAcknowledgement(req: Request, res: Response) {
  const input = acknowledgeWatchlistChangesSchema.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({ error: 'A valid asOf timestamp is required' });
    return null;
  }

  const asOf = new Date(input.data.asOf);
  if (asOf > new Date()) {
    res.status(400).json({ error: 'asOf cannot be in the future' });
    return null;
  }

  return asOf;
}

export async function startWatchlistChanges(req: Request, res: Response) {
  const asOf = parseAcknowledgement(req, res);
  if (!asOf) return;

  const user = await User.findById(res.locals.userId);
  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  // Only the first request wins if the user opens two tabs at once.
  await User.updateOne(
    { _id: user._id, lastSeenChangesAt: { $exists: false } },
    { $set: { lastSeenChangesAt: asOf } },
  );
  res.status(204).send();
}

export async function markWatchlistChangesSeen(req: Request, res: Response) {
  const asOf = parseAcknowledgement(req, res);
  if (!asOf) return;

  const user = await User.findById(res.locals.userId);
  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }
  if (!user.lastSeenChangesAt) {
    res.status(409).json({ error: 'Start change tracking first' });
    return;
  }

  // Never move the cursor backwards when requests arrive out of order.
  await User.updateOne(
    { _id: user._id },
    { $max: { lastSeenChangesAt: asOf } },
  );
  res.status(204).send();
}

export async function addToWatchlist(req: Request, res: Response) {
  const providerSeriesId = req.params.providerSeriesId;
  const series = await MacroSeries.findOne({
    providerSeriesId,
    isActive: true,
  });
  if (!series) {
    res.status(404).json({ error: 'Series does not exit or is inactive' });
    return;
  }
  const user = await User.findByIdAndUpdate(
    res.locals.userId,
    {
      $addToSet: {
        watchlist: series._id,
      },
    },
    { new: true },
  );

  if (!user) {
    res.status(401).json({ error: 'User does not exist' });
    return;
  }
  res.status(204).send();
}

export async function removeFromWatchlist(req: Request, res: Response) {
  const providerSeriesId = req.params.providerSeriesId;
  const series = await MacroSeries.findOne({
    providerSeriesId,
  });

  if (!series) {
    res.status(404).json({ error: 'Series does not exist' });
    return;
  }

  const user = await User.findByIdAndUpdate(res.locals.userId, {
    $pull: {
      watchlist: series._id,
    },
  });

  if (!user) {
    res.status(401).json({ error: 'User does not exist' });
    return;
  }

  res.status(204).send();
}
