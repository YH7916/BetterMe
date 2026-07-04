import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('CORS', () => {
  it('adds Access-Control-Allow-Origin on API responses', async () => {
    const app = createApp();
    const res = await app.request('/api/health', { headers: { Origin: 'https://example.pages.dev' } });
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
  });
  it('answers OPTIONS preflight for a mutating route', async () => {
    const app = createApp();
    const res = await app.request('/api/assessments/x', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.pages.dev', 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'x-user-id' },
    });
    expect([200, 204]).toContain(res.status);
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('allows comma-separated production origins and rejects others', async () => {
    const previousOrigin = process.env.WEB_ORIGIN;
    try {
      process.env.WEB_ORIGIN = 'https://betterme-4j4.pages.dev, https://betterme.yesterhaze.codes';
      const app = createApp();

      const allowed = await app.request('/api/health', { headers: { Origin: 'https://betterme.yesterhaze.codes' } });
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://betterme.yesterhaze.codes');

      const rejected = await app.request('/api/health', { headers: { Origin: 'https://evil.example' } });
      expect(rejected.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      if (previousOrigin === undefined) {
        delete process.env.WEB_ORIGIN;
      } else {
        process.env.WEB_ORIGIN = previousOrigin;
      }
    }
  });
});
