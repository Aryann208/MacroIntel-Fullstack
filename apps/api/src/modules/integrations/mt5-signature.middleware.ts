import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const maxAgeMs = 10_000;

export const requireMt5Signature: RequestHandler = (req, res, next) => {
  const secret = process.env.MT5_CONNECTOR_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'MT5 connector is not configured' });
    return;
  }

  const timestamp = req.get('x-mt5-timestamp') ?? '';
  const signature = req.get('x-mt5-signature') ?? '';
  const rawBody = res.locals.mt5RawBody;
  const timestampMs = Number(timestamp) * 1000;

  if (
    !/^\d+$/.test(timestamp) ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !Buffer.isBuffer(rawBody) ||
    !Number.isSafeInteger(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > maxAgeMs
  ) {
    res.status(401).json({ error: 'Invalid connector signature' });
    return;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}\n`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(signature, 'hex');

  if (!timingSafeEqual(expected, received)) {
    res.status(401).json({ error: 'Invalid connector signature' });
    return;
  }

  next();
};
