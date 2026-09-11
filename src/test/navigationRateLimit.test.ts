import { describe, expect, it } from 'vitest';
import worker from '../../cloudflare/worker';
import { isBuildAssetRead, navigationRateLimitResponse } from '../../cloudflare/navigation-rate-limit';

describe('page rate limit recovery', () => {
  it.each(['en', 'km'])('returns a usable %s wallet page with HTTP 429 and no raw JSON', async lang => {
    const url = new URL(`https://zivosmedia.com/wallet?lang=${lang}&data=%3Cscript%3E`);
    const response = navigationRateLimitResponse(new Request(url, { headers: { accept: 'text/html' } }), url, 30);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const html = await response.text();
    expect(html).toContain(`<html lang="${lang}">`);
    expect(html).toContain(lang === 'km' ? '<h1>កាបូប</h1>' : '<h1>Wallet</h1>');
    expect(html).toContain('<a href="">');
    expect(html).not.toContain('{"error"');
    expect(html).not.toContain('<script>');
  });
  it('preserves JSON status and retry metadata for API calls', async () => {
    const url = new URL('https://zivosmedia.com/api/ai/chat');
    const response = navigationRateLimitResponse(new Request(url, { method: 'POST', headers: { accept: 'text/html' } }), url, 60);
    expect(response.status).toBe(429);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ error: 'Too many requests' });
  });
  it('allows 650 build downloads without consuming the page budget; API quota remains active', async () => {
    const env = { ASSETS: { fetch: async () => new Response('asset', { headers: { 'content-type': 'application/javascript' } }) }, ZIVO_MEDIA: {} } as unknown as Parameters<typeof worker.fetch>[1];
    const headers = { 'cf-connecting-ip': '203.0.113.253' };
    for (let i = 0; i < 650; i++) {
      const response = await worker.fetch(new Request('https://zivosmedia.com/assets/app-fixture.js', { headers }), env);
      expect(response.status).toBe(200);
    }
    const url = new URL('https://zivosmedia.com/api/ai/chat');
    expect(isBuildAssetRead(new Request(url), url)).toBe(false);
    let response: Response | undefined;
    for (let i = 0; i < 601; i++) response = await worker.fetch(new Request(url, { method: 'POST', headers }), env);
    expect(response?.status).toBe(429);
    const wallet = await worker.fetch(new Request('https://zivosmedia.com/wallet', { headers: { ...headers, accept: 'text/html' } }), env);
    expect(wallet.status).toBe(429);
    expect(await wallet.text()).toContain('<h1>Wallet</h1>');
  });
});
