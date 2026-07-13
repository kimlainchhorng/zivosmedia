import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = () => readFileSync(path.join(root, "src/sw.js"), "utf8");

type RequestLike = {
  destination: string;
  method: string;
  mode: string;
};

type MatchCallback = (options: { request: RequestLike; url: URL }) => boolean;

type CacheStrategy = {
  kind: string;
  options: Record<string, unknown>;
};

type CapturedRoute = {
  matcher: MatchCallback | { test(value: string): boolean };
  strategy: CacheStrategy | ((...args: unknown[]) => unknown);
};

type CapturedPlugin = {
  kind: string;
  options: Record<string, unknown>;
};

function loadServiceWorker() {
  const routes: CapturedRoute[] = [];
  const listeners = new Map<string, (event: { waitUntil(promise: Promise<unknown>): void }) => void>();
  const deletedCaches: string[] = [];

  class Strategy {
    constructor(
      readonly kind: string,
      readonly options: Record<string, unknown> = {},
    ) {}
  }

  class CacheFirst extends Strategy {
    constructor(options: Record<string, unknown>) {
      super("CacheFirst", options);
    }
  }

  class StaleWhileRevalidate extends Strategy {
    constructor(options: Record<string, unknown>) {
      super("StaleWhileRevalidate", options);
    }
  }

  class NetworkOnly extends Strategy {
    constructor(options: Record<string, unknown> = {}) {
      super("NetworkOnly", options);
    }

    async handle() {
      return undefined;
    }
  }

  class Plugin {
    constructor(
      readonly kind: string,
      readonly options: Record<string, unknown>,
    ) {}
  }

  class ExpirationPlugin extends Plugin {
    constructor(options: Record<string, unknown>) {
      super("ExpirationPlugin", options);
    }
  }

  class CacheableResponsePlugin extends Plugin {
    constructor(options: Record<string, unknown>) {
      super("CacheableResponsePlugin", options);
    }
  }

  const context = {
    importScripts: () => undefined,
    console: { debug: () => undefined, log: () => undefined },
    self: {
      __WB_MANIFEST: [],
      location: { origin: "https://zivosmedia.com" },
      addEventListener(name: string, listener: (event: { waitUntil(promise: Promise<unknown>): void }) => void) {
        listeners.set(name, listener);
      },
      skipWaiting: () => undefined,
    },
    workbox: {
      precaching: {
        createHandlerBoundToURL: () => () => undefined,
        precacheAndRoute: () => undefined,
      },
      routing: {
        registerRoute(matcher: CapturedRoute["matcher"], strategy: CapturedRoute["strategy"]) {
          routes.push({ matcher, strategy });
        },
      },
      strategies: { CacheFirst, NetworkOnly, StaleWhileRevalidate },
      expiration: { ExpirationPlugin },
      cacheableResponse: { CacheableResponsePlugin },
    },
    caches: {
      async delete(name: string) {
        deletedCaches.push(name);
        return true;
      },
      async keys() {
        return [
          "google-fonts-stylesheets",
          "immutable-static-assets-v2",
          "images-cache",
          "supabase-storage-cache",
          "api-cache",
        ];
      },
    },
    clients: { claim: async () => undefined },
  };

  runInNewContext(source(), context, { filename: "src/sw.js" });
  return { deletedCaches, listeners, routes };
}

const imageRequest = (overrides: Partial<RequestLike> = {}): RequestLike => ({
  destination: "image",
  method: "GET",
  mode: "cors",
  ...overrides,
});

function matches(route: CapturedRoute, href: string, request = imageRequest()) {
  if (typeof route.matcher === "function") {
    return route.matcher({ request, url: new URL(href) });
  }

  return route.matcher.test(href);
}

describe("service worker runtime cache policy", () => {
  it("allows only immutable same-origin Vite image assets into a runtime cache", () => {
    const { routes } = loadServiceWorker();
    const staticAssetsRoute = routes.find(
      (route) =>
        typeof route.strategy !== "function" &&
        route.strategy.kind === "CacheFirst" &&
        route.strategy.options.cacheName === "immutable-static-assets-v2",
    );

    expect(staticAssetsRoute).toBeDefined();
    const staticStrategy = staticAssetsRoute!.strategy;
    if (typeof staticStrategy === "function") throw new Error("expected the static assets cache strategy");

    expect(matches(staticAssetsRoute!, "https://zivosmedia.com/assets/car-hyundai-CrpZktac.jpg")).toBe(true);
    expect(matches(staticAssetsRoute!, "https://zivosmedia.com/assets/car-hyundai-CrpZktac.jpg?variant=small")).toBe(false);
    expect(matches(staticAssetsRoute!, "https://zivosmedia.com/api/wallet/receipt.png")).toBe(false);
    expect(matches(staticAssetsRoute!, "https://zivosmedia.com/assets/car-hyundai-CrpZktac.jpg", imageRequest({ destination: "" }))).toBe(false);
    expect(matches(staticAssetsRoute!, "https://cdn.example.com/assets/car-hyundai-CrpZktac.jpg")).toBe(false);

    const plugins = staticStrategy.options.plugins as CapturedPlugin[];
    const cacheableResponse = plugins.find((plugin) => plugin.kind === "CacheableResponsePlugin");
    expect(cacheableResponse?.options.statuses).toEqual([200]);
  });

  it("never matches Supabase auth, data, realtime, function, or storage URLs for runtime caching", () => {
    const { routes } = loadServiceWorker();
    const protectedUrls = [
      "https://abc.supabase.co/auth/v1/token",
      "https://abc.supabase.co/rest/v1/wallet_transactions",
      "https://abc.supabase.co/realtime/v1/websocket",
      "https://abc.supabase.co/functions/v1/create-wallet-topup",
      "https://abc.supabase.co/storage/v1/object/sign/private/receipt.png?token=one-time",
      "https://abc.supabase.co/storage/v1/object/authenticated/identity-documents/passport.png",
      "https://abc.supabase.co/storage/v1/object/public/avatars/customer.png",
    ];

    for (const href of protectedUrls) {
      expect(routes.some((route) => matches(route, href, imageRequest({ destination: "" })))).toBe(false);
    }

    const cacheNames = routes
      .filter((route): route is CapturedRoute & { strategy: CacheStrategy } => typeof route.strategy !== "function")
      .map((route) => route.strategy.options.cacheName);
    expect(cacheNames).not.toContain("api-cache");
    expect(cacheNames).not.toContain("supabase-storage-cache");
    expect(cacheNames).not.toContain("images-cache");
  });

  it("purges pre-fix broad runtime caches on activation while retaining the safe cache", async () => {
    const { deletedCaches, listeners } = loadServiceWorker();
    let activation: Promise<unknown> | undefined;

    listeners.get("activate")?.({
      waitUntil(promise) {
        activation = promise;
      },
    });

    await activation;
    expect(deletedCaches).toEqual(expect.arrayContaining(["images-cache", "supabase-storage-cache", "api-cache"]));
    expect(deletedCaches).not.toContain("immutable-static-assets-v2");
  });

  it("keeps the inject-manifest configuration free of a second broad runtime cache policy", () => {
    const viteConfig = readFileSync(path.join(root, "vite.config.ts"), "utf8");

    expect(viteConfig).toContain('strategies: "injectManifest"');
    expect(viteConfig).not.toContain("runtimeCaching");
    expect(viteConfig).not.toContain("images.unsplash.com");
  });
});
