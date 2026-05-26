/**
 * Smoke test — runs CORS + invalid-body assertions across all hardened
 * edge functions in one pass. Use this for fast regression detection after
 * deploys. Per-function tests cover happy paths and function-specific edges.
 */
import { assertCors, assertValidationError, callFn, preflight } from "./test-utils.ts";

const HARDENED_FUNCTIONS = [
  "public-signup",
  "send-otp-email",
  "send-otp-sms",
  "verify-otp-code",
  "verify-otp-sms",
];

for (const fn of HARDENED_FUNCTIONS) {
  Deno.test(`[smoke] ${fn} — OPTIONS preflight returns CORS headers`, async () => {
    const res = await preflight(fn);
    assertCors(res);
  });

  Deno.test(`[smoke] ${fn} — empty body returns 400 with field errors`, async () => {
    const res = await callFn(fn, { body: {} });
    assertValidationError(res);
  });

  Deno.test(`[smoke] ${fn} — invalid JSON returns 400`, async () => {
    const res = await fetch(
      `${Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://hizivo.com",
          "Authorization": `Bearer ${Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")}`,
          "apikey": Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: "not-json{",
      },
    );
    const text = await res.text();
    if (res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}: ${text.slice(0, 200)}`);
    }
  });
}
