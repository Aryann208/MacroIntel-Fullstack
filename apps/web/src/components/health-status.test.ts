import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HealthStatusView } from './health-status';
describe('health UI states', () => {
  it('announces loading', () => {
    expect(
      renderToStaticMarkup(
        createElement(HealthStatusView, { state: 'loading' }),
      ),
    ).toContain('Connecting to API');
  });
  it('shows API identity on success', () => {
    const html = renderToStaticMarkup(
      createElement(HealthStatusView, {
        state: 'success',
        data: {
          status: 'ok',
          service: 'macrointel-api',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    expect(html).toContain('API operational');
    expect(html).toContain('macrointel-api');
  });
  it('offers recovery on failure', () => {
    const html = renderToStaticMarkup(
      createElement(HealthStatusView, { state: 'error', retry: () => {} }),
    );
    expect(html).toContain('API unavailable');
    expect(html).toContain('Retry');
    expect(html).toContain('role="status"');
  });
});
