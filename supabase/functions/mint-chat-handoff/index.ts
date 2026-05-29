/**
 * mint-chat-handoff — issues a single-use login token so a signed-in ZIVO user
 * can "Continue with ZIVO" into ZIVO Chat without re-entering credentials.
 *
 * Security model:
 *  - Caller MUST present a valid ZIVO session JWT (Authorization: Bearer …;
 *    verify_jwt is also enabled at the platform level).
 *  - The email is derived from that JWT via getUser() — NEVER from the request
 *    body — so a user can only mint a handoff for THEIR OWN account.
 *  - We return only `token_hash` from admin.generateLink({ type: "magiclink" }).
 *    The receiver (ZIVO Chat) redeems it with
 *      supabase.auth.verifyOtp({ token_hash, type: "magiclink" })
 *    to establish a session. That token is single-use and short-lived
 *    (GoTrue-managed), so — unlike a refresh token — it is safe to carry in a
 *    one-time redirect.
 *
 * Self-contained (no ../_shared imports) so it deploys cleanly as a single
 * file. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
 * injected by the Edge runtime.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  // 1) Identify the caller from THEIR JWT (not from the request body).
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  const email = userData?.user?.email;
  if (userErr || !email) return json({ error: "Invalid session" }, 401);

  // 2) Mint a single-use OTP for that exact email (service role).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    return json({ error: "Could not create handoff token" }, 500);
  }

  return json({ token_hash: tokenHash });
});
