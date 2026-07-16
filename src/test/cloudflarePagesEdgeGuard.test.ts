import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import cloudflareWorker, { softwarePageMeta } from "../../cloudflare/worker";
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
      "/admin/stores/123e4567-e89b-42d3-a456-426614174000?tab=ar-dashboard&category=auto-repair";
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

  it("redirects the legacy Software business dashboard route through tenant resolution", async () => {
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
      "https://zivosoftware.com/business/new",
    );
    expect(cloudflareResponse.status).toBe(302);
    expect(cloudflareResponse.headers.get("location")).toBe(
      "https://zivosoftware.com/business/new",
    );
  });

  it("contains no fixed Software tenant in either Worker redirect implementation", () => {
    const root = process.cwd();
    const cloudflareSource = readFileSync(path.join(root, "cloudflare/worker.ts"), "utf8");
    const pagesSource = readFileSync(path.join(root, "public/_worker.js"), "utf8");

    expect(cloudflareSource).not.toContain("a914b90d-c249-4794-ba5e-3fdac0deed44");
    expect(pagesSource).not.toContain("a914b90d-c249-4794-ba5e-3fdac0deed44");
    expect(cloudflareSource).toContain('const SOFTWARE_TENANT_RESOLVER_PATH = "/business/new"');
    expect(pagesSource).toContain('const SOFTWARE_TENANT_RESOLVER_PATH = "/business/new"');
  });

  it("normalizes Software auth redirects to tenant resolution before app login", async () => {
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

    const expected = "https://zivosoftware.com/login?redirect=%2Fbusiness%2Fnew";
    expect(login.status).toBe(302);
    expect(login.headers.get("location")).toBe(expected);
    expect(loginDashboard.status).toBe(302);
    expect(loginDashboard.headers.get("location")).toBe(expected);
    expect(accountLogin.status).toBe(200);
  });

  it("rewrites direct ZIVO Software business HTML before React runs", async () => {
    const response = await cloudflareWorker.fetch(
      request("/business?utm_source=release", { headers: { host: "zivosoftware.com" } }),
      cloudflareHtmlEnv as any,
    );
    const html = await response.text();
    const description =
      "Business management software for customers, vehicles, appointments, inspections, estimates, repair orders, invoices, inventory, staff and reporting.";

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-security-policy")).toContain(
      "report-uri https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report",
    );
    expect(html).toContain('<title data-rh="true">ZIVO Software | Business Management Software</title>');
    expect(html).toContain(`<meta name="description" content="${description}" data-rh="true" />`);
    expect(html).toContain('<link rel="canonical" href="https://zivosoftware.com/business" data-rh="true" />');
    expect(html).toContain('<meta name="application-name" content="ZIVO Software" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="ZIVO Software" />');
    expect(html).toContain('<meta name="theme-color" content="#10b981" />');
    expect(html).toContain('<meta name="robots" content="index,follow,max-image-preview:large" />');
    expect(html).toContain('<meta property="og:title" content="ZIVO Software | Business Management Software" />');
    expect(html).toContain('<meta property="og:url" content="https://zivosoftware.com/business" />');
    expect(html).toContain('<meta property="og:image" content="https://zivosoftware.com/pwa-icons/icon-512x512.png" />');
    expect(html).toContain('<meta property="og:image:alt" content="ZIVO Software" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).not.toContain("https://zivosmedia.com/og-image.png");
    expect(html).not.toContain("https://zivosoftware.com/og-image.png");
    expect(html).not.toContain("app-argument=https://zivosmedia.com");
  });

  it("indexes only public ZIVO Software routes and noindexes private workspace routes", async () => {
    const publicMeta = softwarePageMeta(new URL("https://www.zivosoftware.com/business?plan=base"));
    const privatePaths = [
      "/login",
      "/signup",
      "/billing",
      "/account",
      "/admin/stores/example",
      "/dashboard",
      "/business/new",
      "/business/dashboard",
      "/business/software/example",
    ];

    expect(publicMeta).toEqual({
      title: "ZIVO Software | Business Management Software",
      description:
        "Business management software for customers, vehicles, appointments, inspections, estimates, repair orders, invoices, inventory, staff and reporting.",
      canonical: "https://zivosoftware.com/business",
      robots: "index,follow,max-image-preview:large",
    });

    for (const path of privatePaths) {
      expect(softwarePageMeta(new URL(`https://zivosoftware.com${path}`)).robots).toBe("noindex,nofollow");
    }

    const privateResponse = await cloudflareWorker.fetch(
      request("/login", { headers: { host: "zivosoftware.com" } }),
      cloudflareHtmlEnv as any,
    );
    expect(await privateResponse.text()).toContain('<meta name="robots" content="noindex,nofollow" />');
  });

  it("serves a Software-only web manifest for GET and HEAD", async () => {
    const response = await cloudflareWorker.fetch(
      request("/manifest.webmanifest", { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );
    const manifest = await response.json() as {
      name: string;
      short_name: string;
      description: string;
      start_url: string;
      theme_color: string;
      categories: string[];
      shortcuts: { name: string; short_name: string; url: string }[];
    };
    const shortcutText = manifest.shortcuts
      .flatMap(({ name, short_name, url }) => [name, short_name, url])
      .join(" ")
      .toLowerCase();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/manifest+json");
    expect(manifest.name).toBe("ZIVO Software");
    expect(manifest.short_name).toBe("ZIVO Software");
    expect(manifest.start_url).toBe("/business?utm_source=pwa");
    expect(manifest.theme_color).toBe("#10b981");
    expect(manifest.categories).toEqual(["business", "productivity"]);
    for (const forbidden of ["flights", "hotels", "cars", "reels", "social", "travel"]) {
      expect(shortcutText).not.toContain(forbidden);
    }

    const headResponse = await cloudflareWorker.fetch(
      request("/manifest.webmanifest", { method: "HEAD", headers: { host: "www.zivosoftware.com" } }),
      cloudflareEnv as any,
    );
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("content-type")).toContain("application/manifest+json");
    expect(await headResponse.text()).toBe("");
  });

  it("serves Software-only robots and sitemap documents", async () => {
    const robotsResponse = await cloudflareWorker.fetch(
      request("/robots.txt", { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );
    const sitemapResponse = await cloudflareWorker.fetch(
      request("/sitemap.xml", { headers: { host: "zivosoftware.com" } }),
      cloudflareEnv as any,
    );
    const robots = await robotsResponse.text();
    const sitemap = await sitemapResponse.text();

    expect(robotsResponse.headers.get("content-type")).toContain("text/plain");
    expect(robots).toContain("Sitemap: https://zivosoftware.com/sitemap.xml");
    expect(robots).toContain("Disallow: /business/dashboard");
    expect(robots).toContain("Disallow: /admin/");
    expect(sitemapResponse.headers.get("content-type")).toContain("application/xml");
    expect(sitemap).toContain("<loc>https://zivosoftware.com/business</loc>");
    expect(sitemap).toContain("<loc>https://zivosoftware.com/terms-of-service</loc>");
    expect(sitemap).toContain("<loc>https://zivosoftware.com/privacy-policy</loc>");
    expect(sitemap).not.toContain("/login");
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/flights");
    expect(sitemap).not.toContain("/reels");
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
