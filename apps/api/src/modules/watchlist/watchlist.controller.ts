import type { Request, Response } from 'express';
import { User } from '../auth/user.model.js';

import { MacroSeries } from '../macro/models/macro-series.model.js';
import { watchlistResponseSchema } from '@macrointel/contracts';
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
