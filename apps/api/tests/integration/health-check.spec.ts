import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('GET /', () => {
  it('renders the API control dashboard', async () => {
    const app = createApp();
    const res = await app.request('/');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('BetterMe API Control');
    expect(html).toContain('/api/health');
    expect(html).toContain('/api/pay');
  });
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const app = createApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /api/ready', () => {
  it('checks database readiness', async () => {
    const app = createApp();
    const res = await app.request('/api/ready');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
    expect(typeof body.latency_ms).toBe('number');
  });

  it('returns 503 when readiness checks fail', async () => {
    const app = createApp({
      readinessCheck: async () => {
        throw new Error('database unavailable');
      },
    });
    const res = await app.request('/api/ready');
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks.database).toBe('error');
    expect(typeof body.latency_ms).toBe('number');
  });
});
