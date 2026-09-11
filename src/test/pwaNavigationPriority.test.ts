import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('uses fresh HTML for root/deep-link navigations and precache only when offline', async () => {
  const routes: { match: (options: { request: { mode: string; url: string }; url: URL }) => boolean; handler: unknown }[] = [];
  let offline = false;
  class NetworkOnly { async handle() { if (offline) throw new Error('offline'); return 'fresh HTML'; } }
  class Strategy {}
  const cached = () => 'cached HTML';
  runInNewContext(readFileSync('src/sw.js', 'utf8'), {
    console, URL, importScripts() {}, caches: {}, clients: {},
    self: { __WB_MANIFEST: [{ url: 'index.html', revision: 'old' }], location: { origin: 'https://zivosmedia.com' }, addEventListener() {} },
    workbox: {
      precaching: { precache() {}, createHandlerBoundToURL: () => cached, addRoute: () => routes.push({ match: ({ url }) => ['/', '/index.html'].includes(url.pathname), handler: cached }) },
      routing: { registerRoute: (match: unknown, handler: unknown) => { if (typeof match === 'function') routes.push({ match: match as typeof routes[number]['match'], handler }); } },
      strategies: { NetworkOnly, CacheFirst: Strategy, StaleWhileRevalidate: Strategy },
      expiration: { ExpirationPlugin: Strategy }, cacheableResponse: { CacheableResponsePlugin: Strategy },
    },
  });
  for (const path of ['/', '/index.html', '/feed']) {
    const url = new URL(path, 'https://zivosmedia.com');
    const options = { url, request: { mode: 'navigate', url: url.href } };
    const first = routes.find(route => route.match(options))!;
    expect(first.handler).not.toBe(cached);
    expect(await (first.handler as (options: unknown) => Promise<string>)(options)).toBe('fresh HTML');
    offline = true;
    expect(await (first.handler as (options: unknown) => Promise<string>)(options)).toBe('cached HTML');
    offline = false;
  }
});
