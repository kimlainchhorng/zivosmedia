import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { isKnownMediaRoute, mediaCanonicalRedirect, mediaNotFound } from '../../cloudflare/media-route-policy';

it('keeps the Worker manifest synchronized with actual app routes', () => {
  expect(() => execFileSync(process.execPath, ['scripts/seo/generate-worker-routes.mjs', '--check'])).not.toThrow();
});
it.each(['/', '/feed', '/login', '/flights', '/hotels', '/eats/restaurant/example', '/legal/privacy', '/legal/automated-decisions'])('recognizes a supported deep link %s', path => {
  expect(isKnownMediaRoute(path)).toBe(true);
});
it.each(['/nope-404', '/legal/not-a-real-policy', '/assets/missing.js'])('returns real 404 for a fallback shell at %s', path => {
  const request = new Request('https://zivosmedia.com' + path);
  const response = mediaNotFound(request, new URL(request.url), new Response('<html>Not found</html>', { headers: { 'content-type': 'text/html' } }));
  expect(response.status).toBe(404);
  expect(response.headers.get('x-robots-tag')).toBe('noindex');
});
it('preserves supported assets, other domains and known SPA routes', () => {
  for (const [url, contentType] of [['https://zivosmedia.com/assets/real.js', 'text/javascript'], ['https://zivostravel.com/example', 'text/html'], ['https://zivosmedia.com/flights', 'text/html']]) {
    const request = new Request(url);
    expect(mediaNotFound(request, new URL(url), new Response('ok', { headers: { 'content-type': contentType } })).status).toBe(200);
  }
});
it('redirects www to apex with path and query preserved', () => {
  const result = mediaCanonicalRedirect(new URL('https://www.zivosmedia.com/hotels?lang=km&city=Siem+Reap'))!;
  expect(result.status).toBe(301);
  expect(result.headers.get('location')).toBe('https://zivosmedia.com/hotels?lang=km&city=Siem+Reap');
  expect(mediaCanonicalRedirect(new URL('https://www.zivostravel.com/'))).toBeNull();
});

it('applies 404 and canonical redirects through the production Worker', async () => {
  const { default: worker } = await import('../../cloudflare/worker');
  const env = { ASSETS:{fetch:async () => new Response('<html>Not found</html>',{headers:{'content-type':'text/html'}})}, ZIVO_MEDIA:{} };
  const missing = await worker.fetch(new Request('https://zivosmedia.com/nope-404'),env as never);
  expect(missing.status).toBe(404);
  expect(missing.headers.get('permissions-policy')).not.toMatch(/bluetooth|document-domain|interest-cohort/);
  const canonical = await worker.fetch(new Request('https://www.zivosmedia.com/flights?lang=km'),env as never);
  expect(canonical.status).toBe(301);
  expect(canonical.headers.get('location')).toBe('https://zivosmedia.com/flights?lang=km');
});
