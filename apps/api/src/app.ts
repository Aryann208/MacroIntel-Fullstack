import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Logger } from 'pino';
import {
  healthSchema,
  type DependencyHealthResponse,
} from '@macrointel/contracts';
export function createApp(options: {
  origin: string;
  logger: Logger;
  checkDependencies: () => Promise<DependencyHealthResponse>;
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const supplied = req.get('x-request-id');
    const requestId =
      supplied && /^[a-zA-Z0-9_-]{1,128}$/.test(supplied)
        ? supplied
        : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const start = performance.now();
    res.on('finish', () =>
      options.logger.info(
        {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Math.round(performance.now() - start),
        },
        'request completed',
      ),
    );
    next();
  });
  app.use(helmet());
  app.use(cors({ origin: options.origin }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/v1/health', (_req, res) =>
    res.json(
      healthSchema.parse({
        status: 'ok',
        service: 'macrointel-api',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      }),
    ),
  );
  app.get('/api/v1/health/dependencies', async (_req, res) => {
    const result = await options.checkDependencies();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
  });
  app.use((_req, res) =>
    res
      .status(404)
      .json({ error: 'Not found', requestId: res.locals.requestId }),
  );
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const badBody =
      error instanceof SyntaxError && 'status' in error && error.status === 400;
    options.logger.error(
      {
        requestId: res.locals.requestId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'request failed',
    );
    res.status(badBody ? 400 : 500).json({
      error: badBody ? 'Invalid JSON body' : 'Internal server error',
      requestId: res.locals.requestId,
    });
  };
  app.use(errors);
  return app;
}
