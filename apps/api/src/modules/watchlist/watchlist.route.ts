import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from './watchlist.controller.js';

export const watchlistRouter: Router = Router();

watchlistRouter.get('/', requireAuth, getWatchlist);

watchlistRouter.post('/:providerSeriesId', requireAuth, addToWatchlist);

watchlistRouter.delete('/:providerSeriesId', requireAuth, removeFromWatchlist);
