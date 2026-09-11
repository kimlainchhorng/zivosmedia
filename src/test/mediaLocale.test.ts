import { expect, it } from 'vitest';
import { rewriteMediaLocale } from '../../cloudflare/worker';
const html = () => new Response('<html><head></head><body>Page</body></html>', {headers: {'content-type':'text/html','cache-control':'public, max-age=3600'}});
it.each(['KH', 'US', 'SG'])('injects edge country %s without shared HTML caching', async country => {
  const request = new Request('https://zivosmedia.com/hotels');
  Object.defineProperty(request, 'cf', {value: {country}});
  const response = await rewriteMediaLocale(request, new URL(request.url), html());
  expect(await response.text()).toContain(`name="zivo-country" content="${country}"`);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('defaults to Cambodia when edge information is absent', async () => {
  const request = new Request('https://zivosmedia.com/');
  expect(await (await rewriteMediaLocale(request, new URL(request.url), html())).text()).toContain('content="KH"');
});
it('leaves sibling hosts untouched', async () => {
  const request = new Request('https://zivostravel.com/'); const original = html();
  expect(await rewriteMediaLocale(request, new URL(request.url), original)).toBe(original);
});
