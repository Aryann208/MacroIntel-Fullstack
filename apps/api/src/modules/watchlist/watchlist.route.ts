import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  addToWatchlist,
  getWatchlist,
  getWatchlistChanges,
  markWatchlistChangesSeen,
  removeFromWatchlist,
  startWatchlistChanges,
} from './watchlist.controller.js';

export const watchlistRouter: Router = Router();

watchlistRouter.get('/', requireAuth, getWatchlist);
watchlistRouter.get('/changes', requireAuth, getWatchlistChanges);
watchlistRouter.post('/changes/start', requireAuth, startWatchlistChanges);
watchlistRouter.post('/changes/seen', requireAuth, markWatchlistChangesSeen);

watchlistRouter.post('/:providerSeriesId', requireAuth, addToWatchlist);

watchlistRouter.delete('/:providerSeriesId', requireAuth, removeFromWatchlist);
