import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { User } from '../auth/user.model.js';

import { MacroSeries } from '../macro/models/macro-series.model.js';
import { watchlistResponseSchema } from '@macrointel/contracts';

export const watchlistRouter = Router();

watchlistRouter.get('/', requireAuth, async (_req, res) => {
  const user = await User.findById(res.locals.userId);

  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }
  const watchlistArray = await MacroSeries.find({
    _id: { $in: user.watchlist },
    isActive: true,
  }).sort({ name: 1 });
  const responseBody = {
    items: watchlistArray.map((watchlist) => ({
      providerSeriesId: watchlist.providerSeriesId,
      name: watchlist.name,
      shortName: watchlist.shortName,
      country: watchlist.country,
      category: watchlist.category,
      frequency: watchlist.frequency,
      unit: watchlist.unit,
    })),
  };

  const response = watchlistResponseSchema.parse(responseBody);

  res.status(200).json(response);
});
