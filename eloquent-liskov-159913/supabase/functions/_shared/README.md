# Edge Function Shared Dependencies

All Supabase Edge Functions in this project share a single source of truth for
external dependencies via `_shared/deps.ts` (and `_shared/stripe.ts` for Stripe).

## Bundling rules

1. **Always import `createClient` from `_shared/deps.ts`** — never inline
   `npm:@supabase/supabase-js` or `https://esm.sh/@supabase/...` in a function.
2. **Use `npm:` specifiers, never `esm.sh`, for npm packages.** Supabase's
   deploy-time bundler has a hard 10-second fetch timeout (not configurable).
   `esm.sh` frequently exceeds that and breaks deploys.
3. **Pin exact versions.** No `@2`, no `@latest`. Drift between deploys is the
   #1 cause of "it worked yesterday" failures.

## Local verification

Before pushing a function change, run a Deno type-check from the repo root:

```bash
deno check supabase/functions/**/*.ts
```

This catches missing imports, bad version pins, and module-resolution errors
without going through a full Supabase deploy round-trip. (Requires Deno
installed locally; Lovable does not run this automatically.)

## Canary function

`supabase/functions/ping-canary` deploys with only the shared `createClient`
import. If a deploy mysteriously fails for a larger function, deploy
`ping-canary` first to confirm the shared deps module bundles cleanly. If
`ping-canary` fails too, the issue is in `_shared/deps.ts` itself.

(Note: Supabase rejects function slugs starting with `_`, so the canary lives
under `ping-canary` even though it's logically a `_shared` sibling.)

Invoke it to confirm runtime is up:

```bash
curl -i "$SUPABASE_URL/functions/v1/ping-canary" -H "Authorization: Bearer $ANON_KEY"
```

Expected response:

```json
{ "ok": true, "sdk": "@supabase/supabase-js@2.49.1", "sdk_loaded": true, "timestamp": "..." }
```
