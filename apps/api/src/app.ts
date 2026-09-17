import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Logger } from 'pino';
import {
  healthSchema,
  type DependencyHealthResponse,
} from '@macrointel/contracts';
import { macroRouter } from './modules/macro/macro.route.js';
import { authRouter } from './modules/auth/auth.route.js';
import { watchlistRouter } from './modules/watchlist/watchlist.route.js';

export function createApp(options: {
  origin: string;
  logger: Logger;
  checkDependencies: () => Promise<DependencyHealthResponse>;
}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: options.origin }));
  app.use(express.json());

  app.use((req, res, next) => {
    const requestId = randomUUID();
    const startedAt = Date.now();

    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      options.logger.info({
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  });

  app.get('/api/v1/health', (_req, res) => {
    const health = healthSchema.parse({
      status: 'ok',
      service: 'macrointel-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });

    res.json(health);
  });

  app.get('/api/v1/health/dependencies', async (_req, res) => {
    const result = await options.checkDependencies();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/macro', macroRouter);
  app.use('/api/v1/watchlist', watchlistRouter);
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not found',
      requestId: res.locals.requestId,
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({
        error: 'Invalid JSON body',
        requestId: res.locals.requestId,
      });
      return;
    }
    options.logger.error({ error, requestId: res.locals.requestId });
    res.status(500).json({
      error: 'Internal server error',
      requestId: res.locals.requestId,
    });
  };

  app.use(errorHandler);
  return app;
}
