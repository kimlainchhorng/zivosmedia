import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

type CapturedRoute = {
  matcher:
    | RegExp
    | ((input: {
        request: { destination: string; mode: string };
        url: URL;
      }) => boolean);
  strategy: { kind: string } | ((...args: unknown[]) => unknown);
};

const captureServiceWorkerRoutes = () => {
  const routes: CapturedRoute[] = [];
  class Strategy {
    kind: string;

    constructor(kind: string) {
      this.kind = kind;
    }
  }

  const makeStrategy = (kind: string) =>
    class extends Strategy {
      constructor() {
        super(kind);
      }
    };

  const sandbox = {
    URL,
    URLSearchParams,
    console: { log: () => {}, debug: () => {} },
    encodeURIComponent,
    importScripts: () => {},
    caches: { delete: async () => true, keys: async () => [] },
    clients: {},
    self: {
      __WB_MANIFEST: [],
      location: { origin: "https://zivosmedia.com" },
      addEventListener: () => {},
      skipWaiting: () => {},
    },
    workbox: {
      cacheableResponse: { CacheableResponsePlugin: class {} },
      core: { cacheNames: { precache: "precache" } },
      expiration: { ExpirationPlugin: class {} },
      precaching: {
        createHandlerBoundToURL: () => () => undefined,
        precacheAndRoute: () => {},
      },
      routing: {
        registerRoute: (
          matcher: CapturedRoute["matcher"],
          strategy: CapturedRoute["strategy"],
        ) => routes.push({ matcher, strategy }),
      },
      strategies: {
        CacheFirst: makeStrategy("CacheFirst"),
        NetworkOnly: makeStrategy("NetworkOnly"),
        StaleWhileRevalidate: makeStrategy("StaleWhileRevalidate"),
      },
    },
  };

  runInNewContext(read("src/sw.js"), sandbox);
  return routes;
};

const strategyFor = (routes: CapturedRoute[], rawUrl: string) => {
  const url = new URL(rawUrl);
  const request = { destination: "image", mode: "cors" };

  for (const route of routes) {
    const matches =
      typeof route.matcher === "function"
        ? route.matcher({ request, url })
        : route.matcher.test(rawUrl);
    if (matches && typeof route.strategy !== "function") {
      return route.strategy.kind;
    }
  }

  return null;
};

describe("PWA private cache isolation", () => {
  it("keeps authenticated Supabase traffic network-only while caching public media", () => {
    const serviceWorker = read("src/sw.js");

    expect(serviceWorker).toContain(
      "url.pathname.includes('/storage/v1/object/public/')",
    );
    expect(serviceWorker).toContain("cacheName: 'supabase-storage-cache'");
    expect(serviceWorker).toContain(
      "new workbox.strategies.StaleWhileRevalidate",
    );
    expect(serviceWorker).toContain("url.origin === self.location.origin");

    const privateSupabaseRoute = serviceWorker.slice(
      serviceWorker.indexOf(
        "Authenticated Supabase API/auth/functions traffic",
      ),
      serviceWorker.indexOf(
        "// =============================================\n// PUSH",
      ),
    );
    expect(privateSupabaseRoute).toContain(
      "!url.pathname.includes('/storage/v1/object/public/')",
    );
    expect(privateSupabaseRoute).toContain(
      "new workbox.strategies.NetworkOnly()",
    );
    expect(privateSupabaseRoute).not.toContain("NetworkFirst");
  });

  it("rejects private API and signed-media cache bypasses while preserving public media", () => {
    const routes = captureServiceWorkerRoutes();
    const project = "https://slirphzzwcogdbkeicff.supabase.co";

    for (const privateUrl of [
      `${project}/rest/v1/profiles?select=*`,
      `${project}/auth/v1/user`,
      `${project}/functions/v1/private-report`,
      `${project}/storage/v1/object/sign/private/user.jpg?token=secret`,
    ]) {
      expect(strategyFor(routes, privateUrl)).toBe("NetworkOnly");
    }

    expect(
      strategyFor(
        routes,
        `${project}/storage/v1/object/public/avatars/user.jpg`,
      ),
    ).toBe("StaleWhileRevalidate");
    expect(
      strategyFor(routes, "https://zivosmedia.com/pwa-icons/icon-192x192.png"),
    ).toBe("CacheFirst");
  });

  it("deletes the legacy private cache on activation, account switch, and logout", () => {
    const serviceWorker = read("src/sw.js");
    const auth = read("src/contexts/AuthContext.tsx");

    expect(serviceWorker).toContain("PRIVATE_RUNTIME_CACHES = ['api-cache']");
    expect(serviceWorker).toContain(".then(clearPrivateRuntimeCaches)");
    expect(serviceWorker).toContain("type === 'CLEAR_PRIVATE_CACHES'");
    expect(serviceWorker).not.toMatch(/keepCaches = \[[\s\S]*?'api-cache'/);

    expect(auth).toContain(
      'PRIVATE_SERVICE_WORKER_CACHE_NAMES = ["api-cache"]',
    );
    expect(auth).toContain('type: "CLEAR_PRIVATE_CACHES"');
    expect(auth).toContain("if (userChanged) {");
    expect(auth).toContain("void clearPrivateServiceWorkerCaches();");
    expect(auth).toContain("await clearPrivateServiceWorkerCaches();");
  });
});
