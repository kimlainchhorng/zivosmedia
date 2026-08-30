import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `withSecurity` attaches CORS headers on every path it returns from —
 * forbidden origin, preflight, method-not-allowed, rate limit, bot block,
 * thrown error. It did not attach them on the one path that matters most: the
 * handler's own response.
 *
 * A handler that builds its Response by hand —
 *
 *     new Response(JSON.stringify({ error: "..." }), {
 *       status: 400,
 *       headers: { "Content-Type": "application/json" },   // <- no CORS
 *     })
 *
 * — therefore came back to the browser with no Access-Control-Allow-Origin at
 * all. The browser refuses to read that response and throws a bare
 * `TypeError: Failed to fetch`, so the user gets "network error" instead of
 * "Invalid support ticket id", and the caller cannot tell a validation failure
 * from the server being down.
 *
 * Found 2026-08-30 by calling twenty freshly-deployed functions from the
 * running app with a real session. Seventeen answered with their own
 * validation error. Three — support-ticket-manage, support-ticket-submit and
 * concierge-message-submit — threw "Failed to fetch", every time, while curl
 * saw a perfectly good 400. The difference was not the network: those three
 * were the ones that hand-built their early returns instead of using
 * ok()/err() from _shared/respond.ts.
 *
 * Two fixes went in: the three handlers now use err(), and withSecurity
 * applies CORS to the handler's response like it does to every other. This
 * test pins the second one, because it is the one that protects functions
 * nobody has looked at yet.
 */

const wrapper = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/withSecurity.ts"),
  "utf8",
);

describe("withSecurity attaches CORS to the handler's own response", () => {
  it("calls applyCorsHeaders on the handler success path", () => {
    // The block that runs the handler, from `const res = await handler(...)`
    // up to its `return res`.
    const block = /const res = await handler\(req, ctx\);([\s\S]*?)return res;/.exec(wrapper)?.[1];
    expect(block, "the handler-invocation block moved; update this test").toBeDefined();
    expect(
      block,
      "A handler that hand-builds its Response gets no Access-Control-Allow-Origin, " +
        "and the browser reports it as `TypeError: Failed to fetch` rather than as " +
        "the status and message the function actually returned.",
    ).toContain("applyCorsHeaders(res, corsHeaders)");
  });

  it("still applies CORS on the paths that already had it", () => {
    // If a refactor ever drops these, the same class of bug returns on the
    // error paths instead. Counting is crude but it is the cheap guard.
    const calls = wrapper.match(/applyCorsHeaders\(res, corsHeaders\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(8);
  });

  it("keeps the three repaired handlers on err() rather than a bare Response", () => {
    for (const fn of [
      "support-ticket-manage",
      "support-ticket-submit",
      "concierge-message-submit",
    ]) {
      const src = readFileSync(
        resolve(process.cwd(), "supabase/functions", fn, "index.ts"),
        "utf8",
      );
      const handBuilt = src.match(
        /new Response\(JSON\.stringify\([\s\S]{0,160}?headers: \{ "Content-Type": "application\/json" \},/g,
      );
      expect(
        handBuilt,
        `${fn} builds a Response with only Content-Type again. Use err(req, msg, status) ` +
          `from _shared/respond.ts so CORS headers come with it.`,
      ).toBeNull();
    }
  });
});
