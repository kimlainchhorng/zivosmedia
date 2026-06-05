import { describe, expect, it } from "vitest";

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
});
