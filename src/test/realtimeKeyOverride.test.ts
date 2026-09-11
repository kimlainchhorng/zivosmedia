import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Realtime can be pointed at a different key from REST.
 *
 * This exists because the same wrong diagnosis has been filed four times: that
 * the Realtime tenant rejects `sb_publishable_…` and needs the legacy anon JWT,
 * on the evidence that a plain GET to /realtime/v1/websocket answers
 * `error code: 1101` for our key and 401 for others.
 *
 * That reads backwards. 1101 is Cloudflare reporting the request PASSED the
 * apikey gate and then reached the socket handler with no `Upgrade` header — the
 * signature of a valid key. The keys answering a clean 401 are the rejected
 * ones. A real handshake settles it, and `npm run qa:realtime-handshake` runs
 * one: the publishable key reaches OPEN and joins a channel with status "ok".
 *
 * So the override defaults to off. It exists so the swap can be made by setting
 * one env var and rebuilding, rather than by editing client code under time
 * pressure — and so that whoever reaches for it reads why first.
 */
const CLIENT = resolve(__dirname, "..", "integrations", "supabase", "client.ts");

describe("Realtime key override", () => {
  const source = readFileSync(CLIENT, "utf8");

  it("reads the override from a dedicated env var", () => {
    expect(source).toContain("import.meta.env.VITE_SUPABASE_REALTIME_KEY");
  });

  it("falls back to each client's own key rather than one shared key", () => {
    // authSupabase and dataSupabase can address different projects, so a single
    // hard-coded realtime key would send one of them the wrong credential.
    expect(source).toContain("realtimeOptionsFor(EFFECTIVE_AUTH_SUPABASE_KEY)");
    expect(source).toContain("realtimeOptionsFor(EFFECTIVE_DATA_SUPABASE_KEY)");
  });

  it("leaves REST untouched", () => {
    // The override must reach the realtime options only. If it ever appears in
    // the createClient key argument, REST starts using it too.
    const createClientCalls = [...source.matchAll(/createClient<Database>\(([^;]*?)\{/gs)].map((m) => m[1]);
    expect(createClientCalls.length).toBeGreaterThan(0);
    for (const call of createClientCalls) {
      expect(call).not.toContain("REALTIME_KEY_OVERRIDE");
      expect(call).not.toContain("VITE_SUPABASE_REALTIME_KEY");
    }
  });

  it("is documented in .env.example as optional and normally empty", () => {
    const env = readFileSync(resolve(__dirname, "..", "..", ".env.example"), "utf8");
    expect(env).toMatch(/^VITE_SUPABASE_REALTIME_KEY=$/m);
  });
});
