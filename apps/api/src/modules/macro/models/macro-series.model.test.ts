import { describe, expect, it } from 'vitest';
import { MacroSeries } from './macro-series.model.js';

describe('MacroSeries', () => {
  it('accepts a valid macro series', async () => {
    const macroSeries = new MacroSeries({
      provider: 'fred',
      providerSeriesId: 'abc-xyz-123',
      name: 'Non-Farm Payroll',
      shortName: 'NFP',
      country: 'us',
      currency: 'USD',
      category: 'employment',
      frequency: 'monthly',
      unit: 'index',
      seasonalAdjustment: 'seasonally-adjusted',

      sourceUrl: 'https://fred-endpoint.com',
      providerUpdatedAt: new Date('2026-09-15T12:00:00Z'),
    });

    await expect(macroSeries.validate()).resolves.toBeUndefined();
    expect(macroSeries.provider).toBe('fred');
    expect(macroSeries.providerSeriesId).toBe('abc-xyz-123');
    expect(macroSeries.name).toBe('Non-Farm Payroll');
    expect(macroSeries.shortName).toBe('NFP');
    expect(macroSeries.country).toBe('US');
    expect(macroSeries.currency).toBe('USD');
    expect(macroSeries.category).toBe('employment');
    expect(macroSeries.frequency).toBe('monthly');
    expect(macroSeries.unit).toBe('index');
    expect(macroSeries.seasonalAdjustment).toBe('seasonally-adjusted');
    expect(macroSeries.isActive).toBe(true);
    expect(macroSeries.sourceUrl).toBe('https://fred-endpoint.com');
  });

  it('rejects an unsupported category', async () => {
    const macroSeries2 = new MacroSeries({
      provider: 'fred',
      providerSeriesId: 'abc-xyz-123',
      name: 'Non-Farm Payroll',
      shortName: 'NFP',
      country: 'us',
      currency: 'USD',
      category: 'politics',
      frequency: 'monthly',
      unit: 'index',
      seasonalAdjustment: 'seasonally-adjusted',

      sourceUrl: 'https://fred-endpoint.com',
      providerUpdatedAt: new Date('2026-09-15T12:00:00Z'),
    });
    await expect(macroSeries2.validate()).rejects.toMatchObject({
      errors: {
        category: expect.anything(),
      },
    });
  });
});
