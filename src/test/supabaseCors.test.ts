import { describe, expect, it } from "vitest";
import { isOriginAllowed, strictCorsHeaders } from "../../supabase/functions/_shared/cors.ts";

describe("Supabase strict CORS origin allowlist", () => {
  it("allows local development and production ZIVO origins", () => {
    expect(isOriginAllowed("http://192.168.1.72:8083")).toBe(true);
    expect(isOriginAllowed("http://localhost:8083")).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:8083")).toBe(true);
    expect(isOriginAllowed("https://myzivo.com")).toBe(true);
    expect(isOriginAllowed("https://www.myzivo.com")).toBe(true);
    expect(isOriginAllowed("https://app.myzivo.com")).toBe(true);
  });

  it("rejects unknown public origins and non-http protocols", () => {
    expect(isOriginAllowed("https://evil.example")).toBe(false);
    expect(isOriginAllowed("ftp://192.168.1.72")).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
  });

  it("builds strict CORS headers only for allowed origins", () => {
    const allowed = strictCorsHeaders(
      new Request("https://example.test", {
        headers: { origin: "http://192.168.1.72:8083" },
      }),
    );
    expect(allowed).toEqual(
      expect.objectContaining({
        "Access-Control-Allow-Origin": "http://192.168.1.72:8083",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      }),
    );

    const rejected = strictCorsHeaders(
      new Request("https://example.test", {
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(rejected).toBeNull();
  });
});
