import { expect, it } from "vitest";
import { hasMediaPublicSeo, mediaPublicSeoHtml } from "../../cloudflare/media-public-seo";
import { rewriteMediaLocale } from "../../cloudflare/worker";

const shell = `<html lang="en"><head><title>Old title</title><meta name="description" content="Old description"><link rel="canonical" href="https://zivosmedia.com/feed"><meta property="og:title" content="Old title"><meta http-equiv="Content-Security-Policy" content="default-src 'self'"><script type="application/ld+json">{"@type":"Organization"}</script><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>`;
it.each(["/", "/flights", "/hotels"])("serves localized metadata without executing JavaScript at %s", async path => {
  const request = new Request(`https://zivosmedia.com${path}?lang=km`);
  const response = await rewriteMediaLocale(request, new URL(request.url), new Response(shell, { headers: { "content-type": "text/html", etag: "old" } }));
  const html = await response.text();
  expect(html).toContain('lang="km"');
  expect(html).toMatch(/[\u1780-\u17ff]/);
  expect(html).toContain(`rel="canonical" href="https://zivosmedia.com${path}"`);
  expect(html.match(/<title>/g)).toHaveLength(1);
  expect(html.match(/hreflang=/g)).toHaveLength(3);
  expect(html).toContain('content="km_KH"');
  expect(html).not.toContain("Old title");
  expect(html).toContain('src="/assets/app.js"');
  expect(html).toContain("Content-Security-Policy");
  expect(html).toContain('"@type":"Organization"');
  expect(html).toContain('name="zivo-country" content="KH"');
  expect(response.headers.get("etag")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it.each(["https://zivostravel.com/", "https://zivosmedia.com/constructor", "https://zivosmedia.com/nope", "https://zivosmedia.com/?p=share", "https://zivosmedia.com/?code=callback"])("preserves unrelated routes and callbacks: %s", raw => {
  const url = new URL(raw);
  expect(hasMediaPublicSeo(url)).toBe(false);
  expect(mediaPublicSeoHtml(shell, url)).toBe(shell);
});
it("never reflects arbitrary language input into HTML", () => {
  const html = mediaPublicSeoHtml(shell, new URL("https://zivosmedia.com/?lang=%22%3E%3Cscript%3Ealert(1)%3C/script%3E"));
  expect(html).toContain('lang="en"');
  expect(html).not.toContain("alert(1)");
});
it("does not replace error-page metadata", async () => {
  const request = new Request("https://zivosmedia.com/hotels?lang=km");
  const response = await rewriteMediaLocale(request, new URL(request.url), new Response(shell, { status: 503, headers: { "content-type": "text/html" } }));
  expect(response.status).toBe(503);
  expect(await response.text()).toContain("Old title");
});

it('serves the requested prerendered language through the Worker and fails closed for a missing build artifact', async () => {
  const { default: worker } = await import('../../cloudflare/worker');
  const requests: string[] = [];
  const env = { ZIVO_MEDIA: {}, ASSETS: { fetch: async (request: Request) => {
    requests.push(new URL(request.url).pathname);
    return new Response(shell.replace('<div id="root"></div>', '<div id="root"><h1>កម្មវិធីតែមួយសម្រាប់កម្ពុជា</h1></div>'), { headers: { 'content-type': 'text/plain' } });
  } } };
  const result = await worker.fetch(new Request('https://zivosmedia.com/?lang=km'), env as never);
  expect(requests).toEqual(['/_prerender/home.km.txt']);
  expect(result.status).toBe(200);
  expect(result.headers.get('content-type')).toContain('text/html');
  expect(await result.text()).toContain('<h1>កម្មវិធីតែមួយសម្រាប់កម្ពុជា</h1>');
  env.ASSETS.fetch = async () => new Response(shell, { headers: { 'content-type': 'text/html' } });
  const unavailable = await worker.fetch(new Request('https://zivosmedia.com/'), env as never);
  expect(unavailable.status).toBe(503);
  const internal = await worker.fetch(new Request('https://zivosmedia.com/_prerender/home.en.txt'), env as never);
  expect(internal.status).toBe(404);
});

it("preserves startup and styles when rewriting commented prerendered HTML twice", () => {
  const url = new URL("https://zivosmedia.com/");
  const commented = shell.replace('<div id="root"></div>', '<div id="root">© <!-- -->2026<!-- --> ZIVO</div>').replace("</head>", '<!-- Match the main <title> for previews. --><script defer src="/public-home-boot.js"></script><link data-zivo-deferred-style rel="stylesheet" data-href="/assets/index.css"></head>');
  const first = mediaPublicSeoHtml(commented, url);
  const second = mediaPublicSeoHtml(first, url);
  expect(second.replace(/>\s+</g, "><")).toBe(first.replace(/>\s+</g, "><"));
  expect(second).toContain('© <!-- -->2026<!-- --> ZIVO');
  expect(second).toContain('src="/public-home-boot.js"');
  expect(second).toContain('data-href="/assets/index.css"');
  expect(second.match(/<title>/g)).toHaveLength(1);
  expect(second).toContain('rel="canonical" href="https://zivosmedia.com/"');
});
