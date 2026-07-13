import { describe, expect, it } from "vitest";

import cloudflareWorker from "../../cloudflare/worker";
import worker from "../../public/_worker.js";

const env = {
  ASSETS: {
    fetch: async () =>
      new Response("ok", {
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/html; charset=utf-8",
        },
      }),
  },
};

const cloudflareEnv = {
  ...env,
  ZIVO_MEDIA: {},
};

const zivosmediaIndexHtml = `<!doctype html>
<html lang="en">
  <head>
    <title>ZIVO - Free Super-App</title>
    <meta name="description" content="All-in-one free app for travel, social, shop, jobs, and creators." />
    <meta name="keywords" content="ZIVO, super app, social network" />
    <meta name="application-name" content="ZIVO" />
    <meta name="apple-mobile-web-app-title" content="ZIVO" />
    <meta name="apple-itunes-app" content="app-id=6759480121, app-argument=https://zivosmedia.com" />
    <meta name="theme-color" content="#0D0D0F" />
    <link rel="canonical" href="https://zivosmedia.com/" />
    <meta property="og:title" content="ZIVO" />
    <meta property="og:url" content="https://zivosmedia.com/" />
    <meta property="og:image" content="https://zivosmedia.com/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://zivosmedia.com/og-image.png" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"ZIVO","url":"https://zivosmedia.com"}</script>
  </head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>`;

const cloudflareHtmlEnv = {
  ...cloudflareEnv,
  ASSETS: {
    fetch: async () =>
      new Response(zivosmediaIndexHtml, {
        headers: {
          "content-length": String(zivosmediaIndexHtml.length),
          "content-type": "text/html; charset=utf-8",
        },
      }),
  },
};

type TestHtmlElement = {
  append(content: string, options?: { html?: boolean }): void;
  remove(): void;
};

type TestHtmlHandler = {
  element(element: TestHtmlElement): void | Promise<void>;
};

function testTagAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[2] || match?.[3] || match?.[4] || "").toLowerCase();
}

function removeHtmlForSelector(html: string, selector: string) {
  if (selector === "title") {
    return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "");
  }
  if (selector === 'link[rel="canonical"]') {
    return html.replace(/<link\b[^>]*>/gi, (tag) =>
      testTagAttribute(tag, "rel") === "canonical" ? "" : tag,
    );
  }
  if (selector === 'link[rel="alternate"][hreflang]') {
    return html.replace(/<link\b[^>]*>/gi, (tag) =>
      testTagAttribute(tag, "rel") === "alternate" && testTagAttribute(tag, "hreflang") ? "" : tag,
    );
  }
  if (selector === 'script[type="application/ld+json"]') {
    return html.replace(
      /<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
  }

  const metaName = selector.match(/^meta\[name="([^"]+)"\]$/i)?.[1]?.toLowerCase();
  if (metaName) {
    return html.replace(/<meta\b[^>]*>/gi, (tag) => (testTagAttribute(tag, "name") === metaName ? "" : tag));
  }

  const metaProperty = selector.match(/^meta\[property="([^"]+)"\]$/i)?.[1]?.toLowerCase();
  if (metaProperty) {
    return html.replace(/<meta\b[^>]*>/gi, (tag) =>
      testTagAttribute(tag, "property") === metaProperty ? "" : tag,
    );
  }

  return html;
}

class TestHTMLRewriter {
  private handlers: { selector: string; handler: TestHtmlHandler }[] = [];

  on(selector: string, handler: TestHtmlHandler) {
    this.handlers.push({ selector, handler });
    return this;
  }

  async transform(response: Response) {
    let html = await response.text();

    for (const { selector, handler } of this.handlers) {
      await handler.element({
        append(content) {
          if (selector !== "head") return;
          html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${content}\n</head>`) : `${html}\n${content}`;
        },
        remove() {
          html = removeHtmlForSelector(html, selector);
        },
      });
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }
}

(globalThis as typeof globalThis & { HTMLRewriter: typeof TestHTMLRewriter }).HTMLRewriter = TestHTMLRewriter;

function request(path: string, init: RequestInit = {}) {
  const host = String(init.headers?.["host"] ?? "zivosmedia.com");
  return new Request(`https://${host}${path}`, {
    ...init,
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      ...(init.headers ?? {}),
    },
  });
}

describe("Cloudflare Pages edge guard", () => {
  it("passes the static Review runtime contract through the Cloudflare asset binding", async () => {
    const contract = {
      schemaVersion: "zivo-ecosystem-runtime/v1",
      productId: "media",
      buildSha: "0123456789abcdef0123456789abcdef01234567",
      reviewMode: true,
      gitDirty: false,
      inboundContracts: [{ id: "chat.paid-media-authority", version: "v1", from: "chat" }],
      outboundContracts: [{ id: "media.identity", version: "v1", to: "chat" }],
    };
    const assetEnv = {
      ...cloudflareEnv,
      ASSETS: {
        fetch: async (assetRequest: Request) => {
          expect(new URL(assetRequest.url).pathname).toBe("/.well-known/zivo-ecosystem-contract.json");
          return new Response(JSON.stringify(contract), {
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        },
      },
    };

    const response = await cloudflareWorker.fetch(
      request("/.well-known/zivo-ecosystem-contract.json"),
      assetEnv as any,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual(contract);
  });

  it("overrides wildcard asset CORS with the current allowed site origin", async () => {
    const response = await worker.fetch(request("/", { headers: { Origin: "https://evil.example" } }), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://zivosmedia.com");
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("routes CSP reports to the matching production Supabase project", async () => {
    const media = await worker.fetch(request("/"), env);
    const software = await worker.fetch(request("/", { headers: { host: "zivosoftware.com" } }), env);
    const chat = await worker.fetch(request("/chat", { headers: { host: "zivoschat.com" } }), env);

    expect(media.headers.get("content-security-policy")).toContain(
      "report-uri https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report",
    );
    expect(software.headers.get("content-security-policy")).toContain(
      "report-uri https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report",
    );
    expect(chat.headers.get("content-security-policy")).toContain(
      "report-uri https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report",
    );
  });

  it("reflects allowed partner origins without allowing arbitrary origins", async () => {
    const allowed = await worker.fetch(
      request("/", { headers: { Origin: "https://zivosoftware.com" } }),
      env,
    );
    const rejected = await worker.fetch(
      request("/", { headers: { Origin: "https://evil.example" } }),
      env,
    );

    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://zivosoftware.com");
    expect(allowed.headers.get("vary")).toBe("Origin");
    expect(rejected.headers.get("access-control-allow-origin")).toBe("https://zivosmedia.com");
  });

  it("allows the dedicated chat domain and redirects its root to /chat", async () => {
    const cors = await worker.fetch(
      request("/chat", { headers: { host: "zivoschat.com", Origin: "https://zivoschat.com" } }),
      env,
    );
    const root = await worker.fetch(request("/", { headers: { host: "zivoschat.com" } }), env);

    expect(cors.headers.get("access-control-allow-origin")).toBe("https://zivoschat.com");
    expect(root.status).toBe(302);
    expect(root.headers.get("location")).toBe("https://zivoschat.com/chat");
    expect(root.headers.get("content-security-policy")).toContain(
      "report-uri https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report",
    );
  });

  it("keeps Software admin store URLs on the Software dashboard host", async () => {
    const storePath =
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair";
    const pagesResponse = await worker.fetch(
      request(storePath, { headers: { host: "zivosoftware.com" } }),
      env,
    );
    const cloudflareResponse = await cloudflareWorker.fetch(
      request(storePath, { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );

    expect(pagesResponse.status).toBe(200);
    expect(pagesResponse.headers.get("location")).toBeNull();
    expect(cloudflareResponse.status).toBe(200);
    expect(cloudflareResponse.headers.get("location")).toBeNull();
    expect(cloudflareResponse.headers.get("content-security-policy")).toContain(
      "report-uri https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report",
    );
  });

  it("redirects the legacy Software business dashboard route to the auto repair dashboard", async () => {
    const pagesResponse = await worker.fetch(
      request("/business/dashboard", { headers: { host: "zivosoftware.com" } }),
      env,
    );
    const cloudflareResponse = await cloudflareWorker.fetch(
      request("/business/dashboard", { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );

    expect(pagesResponse.status).toBe(302);
    expect(pagesResponse.headers.get("location")).toBe(
      "https://zivosoftware.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
    expect(cloudflareResponse.status).toBe(302);
    expect(cloudflareResponse.headers.get("location")).toBe(
      "https://zivosoftware.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
  });

  it("normalizes Software auth redirects to the auto repair dashboard before app login", async () => {
    const login = await worker.fetch(
      request("/login?redirect=%2Fbusiness", { headers: { host: "zivosoftware.com" } }),
      env,
    );
    const loginDashboard = await cloudflareWorker.fetch(
      request("/login?redirect=%2Fbusiness%2Fdashboard", { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );
    const accountLogin = await worker.fetch(
      request("/login?redirect=%2Faccount", { headers: { host: "zivosoftware.com" } }),
      env,
    );

    const expected =
      "https://zivosoftware.com/login?redirect=%2Fadmin%2Fstores%2Fa914b90d-c249-4794-ba5e-3fdac0deed44%3Ftab%3Dar-dashboard%26category%3Dauto-repair";
    expect(login.status).toBe(302);
    expect(login.headers.get("location")).toBe(expected);
    expect(loginDashboard.status).toBe(302);
    expect(loginDashboard.headers.get("location")).toBe(expected);
    expect(accountLogin.status).toBe(200);
  });

  it("rewrites static HTML SEO for public Zivo Travel routes before React runs", async () => {
    const response = await cloudflareWorker.fetch(
      request("/flights", { headers: { host: "zivostravel.com" } }),
      cloudflareHtmlEnv as any,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-security-policy")).toContain(
      "report-uri https://xbllvmpomorawkcrtbcq.supabase.co/functions/v1/csp-report",
    );
    expect(html).toContain("<title>Zivo Travel Flights | Search and Book Flights</title>");
    expect(html).toContain('content="Search flights, compare fares, and book secure trips through Zivo Travel."');
    expect(html).toContain('rel="canonical" href="https://zivostravel.com/flights"');
    expect(html).toContain('property="og:image" content="https://zivostravel.com/og-zivo-travel.jpg"');
    expect(html).toContain('"name":"Zivo Travel"');
    expect(html).not.toContain("https://zivosmedia.com/og-image.png");
    expect(html).not.toContain('app-argument=https://zivosmedia.com');
  });

  it("marks private or result Zivo Travel HTML as noindex", async () => {
    const response = await cloudflareWorker.fetch(
      request("/flights/results?from=PNH", { headers: { host: "zivostravel.com" } }),
      cloudflareHtmlEnv as any,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('name="robots" content="noindex,nofollow"');
    expect(html).toContain('rel="canonical" href="https://zivostravel.com/flights/results"');
  });

  it("serves a deeper public Zivo Travel sitemap without private funnels", async () => {
    const response = await cloudflareWorker.fetch(
      request("/sitemap.xml", { headers: { host: "zivostravel.com" } }),
      cloudflareEnv as any,
    );
    const xml = await response.text();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(locs.length).toBeGreaterThan(80);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs.every((loc) => loc.startsWith("https://zivostravel.com/"))).toBe(true);
    expect(xml).toContain("<loc>https://zivostravel.com/flights/phnom-penh-to-bangkok</loc>");
    expect(xml).toContain("<loc>https://zivostravel.com/flights/new-york-to-paris</loc>");
    expect(xml).toContain("<loc>https://zivostravel.com/flights/to/siem-reap</loc>");
    expect(xml).toContain("<loc>https://zivostravel.com/flights/cities/bangkok</loc>");
    expect(xml).toContain("<loc>https://zivostravel.com/destinations/siem-reap/hotels</loc>");
    expect(xml).toContain("<loc>https://zivostravel.com/destinations/siem-reap/activities</loc>");
    expect(xml).not.toContain("https://zivostravel.com/wallet");
    expect(xml).not.toContain("https://zivostravel.com/payment-methods");
    expect(xml).not.toContain("https://zivostravel.com/my-trips");
    expect(xml).not.toContain("https://zivostravel.com/flights/results");
    expect(xml).not.toContain("https://zivostravel.com/travel/checkout");
  });

  it("does not rewrite zivosmedia HTML into travel metadata", async () => {
    const response = await cloudflareWorker.fetch(request("/", { headers: { host: "zivosmedia.com" } }), cloudflareHtmlEnv as any);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<title>ZIVO - Free Super-App</title>");
    expect(html).toContain('href="https://zivosmedia.com/"');
    expect(html).not.toContain("Zivo Travel Flights");
  });

  it("blocks common secret and scanner paths before hitting static assets", async () => {
    const response = await worker.fetch(request("/.env"), env);

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("rate limits repeated login traffic by client IP", async () => {
    let response = new Response(null);
    for (let i = 0; i < 81; i += 1) {
      response = await worker.fetch(request("/login", { headers: { "cf-connecting-ip": "203.0.113.81" } }), env);
    }

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests" });
  });

  it("keeps the deployed Cloudflare Worker source protected too", async () => {
    const scanner = await cloudflareWorker.fetch(request("/.git/config"), cloudflareEnv as any);

    expect(scanner.status).toBe(403);
    expect(scanner.headers.get("cache-control")).toBe("no-store");
    expect(scanner.headers.get("content-security-policy")).toContain("https://static.cloudflareinsights.com");

    let response = new Response(null);
    for (let i = 0; i < 81; i += 1) {
      response = await cloudflareWorker.fetch(
        request("/login", { headers: { "cf-connecting-ip": "203.0.113.82" } }),
        cloudflareEnv as any,
      );
    }

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests" });
  });
});
