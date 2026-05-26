/**
 * Shared JWT verification helper for edge functions.
 *
 * Usage:
 *   const { userId, claims, supabase } = await requireUser(req);
 *
 * Throws UnauthorizedError on missing/invalid Authorization header. Combine with
 * `withErrorHandling` from ./errors.ts to translate into a 401 response.
 */
import { createClient, type SupabaseClient } from "./deps.ts";
import { HttpError, UnauthorizedError } from "./errors.ts";
import { isUserBlocked } from "./threatIntel.ts";

export interface AuthContext {
  userId: string;
  claims: Record<string, unknown>;
  supabase: SupabaseClient;
  token: string;
}

export async function requireUser(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError("Empty bearer token");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Server misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing");
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Use getClaims when available (fast — no extra DB round-trip).
  const anyAuth = supabase.auth as unknown as {
    getClaims?: (
      jwt: string,
    ) => Promise<{ data: { claims?: Record<string, unknown> } | null; error: unknown }>;
  };

  if (typeof anyAuth.getClaims === "function") {
    const { data, error } = await anyAuth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims || typeof claims.sub !== "string") {
      throw new UnauthorizedError("Invalid or expired token");
    }
    return { userId: claims.sub as string, claims, supabase, token };
  }

  // Fallback for older SDKs.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  return {
    userId: data.user.id,
    claims: { sub: data.user.id, email: data.user.email },
    supabase,
    token,
  };
}

/**
 * Returns a service-role client that bypasses RLS. Only use after `requireUser`
 * has authenticated the caller, or in clearly-public-safe contexts.
 */
export function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server misconfigured: service role credentials missing");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Enforce that the caller's session is at AAL2 (i.e. they have completed an
 * MFA challenge in this session). Throws UnauthorizedError otherwise.
 *
 * Use on sensitive endpoints: payouts, withdrawals, account deletion, admin ops,
 * profile-PII edits. JWTs at AAL1 (password-only) are rejected with a hint that
 * the caller should issue an `mfa.challenge()` and re-call.
 *
 * Reference: Supabase JWT custom claim `aal` ∈ {"aal1","aal2","aal3"}
 */
export function requireAal2(claims: Record<string, unknown>): void {
  const aal = typeof claims.aal === "string" ? claims.aal : null;
  if (aal !== "aal2" && aal !== "aal3") {
    const err = new UnauthorizedError("Step-up MFA required");
    (err as unknown as { code: string }).code = "mfa_required";
    throw err;
  }
}

/**
 * Throws HttpError(403) if the authenticated user is on the user_blocklist.
 *
 * Reuse this anywhere a handler has resolved a userId — it short-circuits
 * suspended/compromised accounts before they can do any further work. The
 * lookup is cheap (in-isolate cache, ~60s TTL) and fails open on RPC error.
 */
export async function requireUserNotBlocked(userId: string): Promise<void> {
  if (await isUserBlocked(userId)) {
    throw new HttpError(403, "Account suspended", { code: "user_blocked" });
  }
}

/**
 * Convenience: authenticate, enforce user-blocklist, AND enforce AAL2 in one
 * call. The blocklist check runs before AAL2 so a suspended account can't
 * progress to MFA prompts.
 */
export async function requireUserMfa(req: Request): Promise<AuthContext> {
  const ctx = await requireUser(req);
  await requireUserNotBlocked(ctx.userId);
  requireAal2(ctx.claims);
  return ctx;
}
