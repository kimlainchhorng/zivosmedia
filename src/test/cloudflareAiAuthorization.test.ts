import { afterEach, describe, expect, it, vi } from "vitest";

import cloudflareWorker, { AiQuota } from "../../cloudflare/worker";

const USER_ID = "0f20ab0e-099e-4d64-824d-206952d72c38";
const AUTH_URL = "https://slirphzzwcogdbkeicff.supabase.co/auth/v1/user";
const PROVIDER_URL = "https://api.deepseek.com/chat/completions";
const TEST_PUBLISHABLE_KEY = ["sb", "publishable", "main", "test"].join("_");
const TEST_SECRET_KEY = ["sb", "secret", "do", "not", "use"].join("_");

type WorkerEnv = Parameters<typeof cloudflareWorker.fetch>[1];

function quotaNamespace(
  decision: { allowed: boolean; remaining: number; resetAt: number } = {
    allowed: true,
    remaining: 39,
    resetAt: Date.now() + 600_000,
  },
) {
  const idFromName = vi.fn((name: string) => ({ name }));
  const fetch = vi.fn(async () =>
    Response.json(decision, { status: decision.allowed ? 200 : 429 }),
  );
  const get = vi.fn(() => ({ fetch }));
  return { namespace: { idFromName, get }, idFromName, get, fetch };
}

function workerEnv(overrides: Record<string, unknown> = {}) {
  const quota = quotaNamespace();
  return {
    env: {
      ASSETS: { fetch: async () => new Response("asset") },
      ZIVO_MEDIA: {},
      DEEPSEEK_API_KEY: "provider-secret",
      SUPABASE_URL: "https://slirphzzwcogdbkeicff.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: TEST_PUBLISHABLE_KEY,
      AI_QUOTA: quota.namespace,
      ...overrides,
    } as unknown as WorkerEnv,
    quota,
  };
}

function aiRequest(
  path = "/api/ai/chat",
  token?: string,
  ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
) {
  const headers = new Headers({
    "content-type": "application/json",
    origin: "https://zivosmedia.com",
    "cf-connecting-ip": ip,
  });
  if (token) headers.set("authorization", `Bearer ${token}`);

  return new Request(`https://zivosmedia.com${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: "deepseek",
      stream: false,
      messages: [{ role: "user", content: "Help me plan one trip." }],
    }),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Cloudflare paid AI authorization boundary", () => {
  it.each(["/api/ai/chat", "/api/deepseek/chat"])(
    "rejects an unauthenticated call to %s before any paid provider request",
    async (path) => {
      const upstream = vi.fn();
      vi.stubGlobal("fetch", upstream);
      const { env, quota } = workerEnv();

      const response = await cloudflareWorker.fetch(aiRequest(path), env);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: "Authentication required",
      });
      expect(upstream).not.toHaveBeenCalled();
      expect(quota.idFromName).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid access token before quota or provider use", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(AUTH_URL);
      return Response.json({ message: "invalid JWT" }, { status: 401 });
    });
    vi.stubGlobal("fetch", upstream);
    const { env, quota } = workerEnv();

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "invalid-token"),
      env,
    );

    expect(response.status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(quota.idFromName).not.toHaveBeenCalled();
  });

  it("authenticates a legitimate user, consumes their durable quota, then calls the provider", async () => {
    const calls: string[] = [];
    const upstream = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push(url);
        if (url === AUTH_URL) {
          expect(new Headers(init?.headers).get("apikey")).toBe(
            TEST_PUBLISHABLE_KEY,
          );
          expect(new Headers(init?.headers).get("authorization")).toBe(
            "Bearer signed-user-token",
          );
          return Response.json({ id: USER_ID }, { status: 200 });
        }
        if (url === PROVIDER_URL) {
          expect(new Headers(init?.headers).get("authorization")).toBe(
            "Bearer provider-secret",
          );
          return Response.json({
            choices: [{ message: { content: "Your trip is ready." } }],
          });
        }
        throw new Error(`Unexpected upstream request: ${url}`);
      },
    );
    vi.stubGlobal("fetch", upstream);
    const { env, quota } = workerEnv();

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "signed-user-token"),
      env,
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([AUTH_URL, PROVIDER_URL]);
    expect(quota.idFromName).toHaveBeenCalledWith(USER_ID);
    expect(quota.fetch).toHaveBeenCalledTimes(1);
    expect(response.headers.get("x-ratelimit-limit")).toBe("40");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("39");
    await expect(response.json()).resolves.toMatchObject({
      choices: [{ message: { content: "Your trip is ready." } }],
    });
  });

  it("fails closed before provider use when durable quota cannot be proven", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === AUTH_URL) return Response.json({ id: USER_ID });
      throw new Error(`Provider must not be called: ${url}`);
    });
    vi.stubGlobal("fetch", upstream);
    const { env } = workerEnv({ AI_QUOTA: undefined });

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "signed-user-token"),
      env,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("returns 429 without provider use when the durable user quota is exhausted", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === AUTH_URL) return Response.json({ id: USER_ID });
      throw new Error(`Provider must not be called: ${url}`);
    });
    vi.stubGlobal("fetch", upstream);
    const denied = quotaNamespace({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const { env } = workerEnv({ AI_QUOTA: denied.namespace });

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "signed-user-token"),
      env,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the durable quota reply is inconsistent", async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === AUTH_URL) return Response.json({ id: USER_ID });
      throw new Error(`Provider must not be called: ${url}`);
    });
    vi.stubGlobal("fetch", upstream);
    const malformedQuota = {
      idFromName: vi.fn(() => ({ name: USER_ID })),
      get: vi.fn(() => ({
        fetch: async () =>
          Response.json(
            { allowed: true, remaining: 39, resetAt: Date.now() + 60_000 },
            { status: 429 },
          ),
      })),
    };
    const { env } = workerEnv({ AI_QUOTA: malformedQuota });

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "signed-user-token"),
      env,
    );

    expect(response.status).toBe(503);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it.each([
    TEST_SECRET_KEY,
    `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
  ])(
    "rejects the privileged credential %s in the publishable-key slot",
    async (credential) => {
      const upstream = vi.fn();
      vi.stubGlobal("fetch", upstream);
      const { env } = workerEnv({ SUPABASE_PUBLISHABLE_KEY: credential });

      const response = await cloudflareWorker.fetch(
        aiRequest("/api/ai/chat", "signed-user-token"),
        env,
      );

      expect(response.status).toBe(503);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the configured auth URL is not the main ZIVO project", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const { env } = workerEnv({
      SUPABASE_URL: "https://xbllvmpomorawkcrtbcq.supabase.co",
    });

    const response = await cloudflareWorker.fetch(
      aiRequest("/api/ai/chat", "signed-user-token"),
      env,
    );

    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe("AiQuota durable object", () => {
  it("persists the 40-request window and denies the 41st request", async () => {
    const values = new Map<string, unknown>();
    const storage = {
      get: async <T>(key: string) => values.get(key) as T | undefined,
      put: async <T>(key: string, value: T) => {
        values.set(key, value);
      },
      transaction: async <T>(
        callback: (transaction: {
          get<U>(key: string): Promise<U | undefined>;
          put<U>(key: string, value: U): Promise<void>;
        }) => Promise<T>,
      ) => callback(storage),
    };
    const object = new AiQuota({ storage } as never, {} as WorkerEnv);

    for (let index = 0; index < 40; index += 1) {
      const response = await object.fetch(
        new Request("https://ai-quota.internal/consume", { method: "POST" }),
      );
      expect(response.status).toBe(200);
    }

    const denied = await object.fetch(
      new Request("https://ai-quota.internal/consume", { method: "POST" }),
    );
    expect(denied.status).toBe(429);
    await expect(denied.json()).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(values.get("active-window")).toMatchObject({ count: 40 });
  });
});
