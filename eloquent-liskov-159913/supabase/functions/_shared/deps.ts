/**
 * Centralized Dependency Versions for Edge Functions
 *
 * BUNDLING RULES (read before editing):
 * 1. ALWAYS import the Supabase SDK from this file — never inline it in a function.
 * 2. ALWAYS use `npm:` specifiers for npm packages. NEVER use `https://esm.sh/...`
 *    for npm packages — esm.sh fetches during deploy and Supabase's bundler has a
 *    hard 10-second fetch timeout that is NOT user-configurable. esm.sh frequently
 *    times out and breaks deploys (e.g. create-lodging-deposit, Apr 2026).
 * 3. ALWAYS pin EXACT versions (e.g. `@supabase/supabase-js@2.49.1`). No floating
 *    `@2` or `@latest` — those re-resolve on every deploy and cause drift.
 * 4. For Stripe, import separately to avoid bundling it in non-Stripe functions:
 *      import Stripe from "../_shared/stripe.ts";
 * 5. Local verification before deploy:
 *      deno check supabase/functions/**\/*.ts
 *    See supabase/functions/_shared/README.md.
 */

export { serve } from "https://deno.land/std@0.224.0/http/server.ts";
export { createClient } from "npm:@supabase/supabase-js@2.106.0";
