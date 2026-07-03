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
});
