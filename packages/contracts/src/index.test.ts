import { describe, expect, it } from 'vitest';
import { healthSchema } from './index.js';
describe('health contract', () => {
  it('accepts a valid response', () => {
    expect(
      healthSchema.parse({
        status: 'ok',
        service: 'macrointel-api',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      }).status,
    ).toBe('ok');
  });
  it('rejects a false health status and invalid timestamp', () => {
    expect(
      healthSchema.safeParse({
        status: 'healthy',
        service: 'macrointel-api',
        version: '0.1.0',
        timestamp: 'yesterday',
      }).success,
    ).toBe(false);
  });
});
