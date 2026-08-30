import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

/**
 * resolveMapsKey memoises at module scope, so every case re-imports the module
 * to get a clean cache.
 */
const freshResolve = async () => {
  vi.resetModules();
  const mod = await import("./mapsKey");
  return mod.resolveMapsKey;
};

beforeEach(() => {
  invoke.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveMapsKey", () => {
  it("caches an authoritative key and stops calling the edge function", async () => {
    invoke.mockResolvedValue({ data: { key: "AIza-real" }, error: null });
    const resolveMapsKey = await freshResolve();

    expect(await resolveMapsKey()).toBe("AIza-real");
    expect(await resolveMapsKey()).toBe("AIza-real");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("caches an authoritative empty key (maps simply not configured)", async () => {
    invoke.mockResolvedValue({ data: { key: "" }, error: null });
    const resolveMapsKey = await freshResolve();

    expect(await resolveMapsKey()).toBe("");
    expect(await resolveMapsKey()).toBe("");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  // Regression, ported from ZIVO-CHAT (c98f886). supabase-js RETURNS { error }
  // rather than throwing, so a cold-start 5xx or a moment offline used to be
  // written straight into the cache as "no key" -- and because the cache is
  // checked first and never cleared, every map in the app stayed a grey
  // placeholder until a full reload. In the Capacitor shell that can be days.
  it("does not cache a transient failure as 'no key'", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "503" } });
    const resolveMapsKey = await freshResolve();

    expect(await resolveMapsKey()).toBe("");

    // Past the back-off, a healthy edge function must be believed again.
    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base + 31_000);
    invoke.mockResolvedValue({ data: { key: "AIza-recovered" }, error: null });

    expect(await resolveMapsKey()).toBe("AIza-recovered");
  });

  it("does not cache a thrown network error either", async () => {
    invoke.mockRejectedValueOnce(new Error("network down"));
    const resolveMapsKey = await freshResolve();

    expect(await resolveMapsKey()).toBe("");

    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base + 31_000);
    invoke.mockResolvedValue({ data: { key: "AIza-recovered" }, error: null });

    expect(await resolveMapsKey()).toBe("AIza-recovered");
  });

  it("backs off briefly so a flaky function is not re-hit by every mount", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "503" } });
    const resolveMapsKey = await freshResolve();

    expect(await resolveMapsKey()).toBe("");
    const callsAfterFirst = invoke.mock.calls.length;

    // Within the cool-down window: answered locally, no second round trip.
    expect(await resolveMapsKey()).toBe("");
    expect(invoke).toHaveBeenCalledTimes(callsAfterFirst);
  });
});
