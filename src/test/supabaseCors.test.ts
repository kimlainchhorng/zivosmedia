import { describe, expect, it } from "vitest";
import { isOriginAllowed, strictCorsHeaders } from "../../supabase/functions/_shared/cors.ts";

describe("Supabase strict CORS origin allowlist", () => {
  it("allows local development and production ZIVO origins", () => {
    expect(isOriginAllowed("http://192.168.1.72:8083")).toBe(true);
    expect(isOriginAllowed("http://localhost:8083")).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:8083")).toBe(true);
    expect(isOriginAllowed("https://zivosmedia.com")).toBe(true);
    expect(isOriginAllowed("https://www.zivosmedia.com")).toBe(true);
    expect(isOriginAllowed("https://app.zivosmedia.com")).toBe(true);
    expect(isOriginAllowed("https://zivoschat.com")).toBe(true);
    expect(isOriginAllowed("https://www.zivoschat.com")).toBe(true);
    expect(isOriginAllowed("https://app.zivoschat.com")).toBe(true);
    expect(isOriginAllowed("https://zivosoftware.com")).toBe(true);
    expect(isOriginAllowed("https://www.zivosoftware.com")).toBe(true);
    expect(isOriginAllowed("https://app.zivosoftware.com")).toBe(true);
  });

  it("rejects unknown public origins and non-http protocols", () => {
    expect(isOriginAllowed("https://evil.example")).toBe(false);
    expect(isOriginAllowed("ftp://192.168.1.72")).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
    // Retired myzivo.com origins must no longer be allowed.
    expect(isOriginAllowed("https://myzivo.com")).toBe(false);
    expect(isOriginAllowed("https://app.myzivo.com")).toBe(false);
  });

  it("builds strict CORS headers only for allowed origins", () => {
    const allowed = strictCorsHeaders(
      new Request("https://example.test", {
        headers: { origin: "https://zivosoftware.com" },
      }),
    );
    expect(allowed).toEqual(
      expect.objectContaining({
        "Access-Control-Allow-Origin": "https://zivosoftware.com",
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
