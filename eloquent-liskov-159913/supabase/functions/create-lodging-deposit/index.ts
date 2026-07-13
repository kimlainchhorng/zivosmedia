/**
 * create-lodging-deposit
 * Creates (or reuses) a Stripe Checkout Session to authorise / charge a lodging deposit.
 *
 * Hardening (idempotency + dedup):
 *  - Row-level lock via lodge_reservations.payment_lock_token + payment_lock_expires_at:
 *      if an unexpired token exists belonging to another caller → 423 Locked.
 *  - dedup_key persisted to lodging_deposit_retry_attempts (unique). Conflict → reused result.
 *  - Stripe Idempotency-Key derived from (reservation_id, deposit_cents, mode, payment_status,
 *    client_attempt_id) — duplicate POSTs return the same Checkout Session.
 *  - Re-reads payment_status under the lock and bails out if the row already settled.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

interface Body {
  reservation_id: string;
  store_id: string;
  deposit_cents: number;
  mode?: "deposit" | "full";
  client_attempt_id?: string;
  /** When 'embedded', returns client_secret for inline Stripe Embedded Checkout instead of a redirect URL. */
  ui_mode?: "hosted" | "embedded";
  /** Same-origin app URL used after hosted checkout or redirect-based embedded methods. */
  return_url?: string;
  /** Same-origin app URL used if hosted checkout is canceled. */
  cancel_url?: string;
  /** When true, force-mints a new Checkout Session (used when an embedded client_secret expires). */
  force_new?: boolean;
}

const TERMINAL_PAYMENT_STATES = new Set([
  "authorized",
  "captured",
  "paid",
  "refund_pending",
  "refunded",
]);

const ROW_LOCK_TTL_SECONDS = 60;
const EMBEDDED_CARD_REDIRECT_ON_COMPLETION = "never";

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const randomToken = () => crypto.randomUUID().replace(/-/g, "");

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.reservation_id || !body?.store_id) {
      return new Response(JSON.stringify({ error: "reservation_id and store_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const depositCents = Math.max(50, Math.round(Number(body.deposit_cents) || 0));
    const mode: "deposit" | "full" = body.mode === "full" ? "full" : "deposit";
    const clientAttemptId = (body.client_attempt_id || "default").slice(0, 64);
    const uiMode: "hosted" | "embedded" = body.ui_mode === "embedded" ? "embedded" : "hosted";
    const forceNew = body.force_new === true;

    const admin = createClient(supabaseUrl, serviceKey);
    const myLockToken = randomToken();

    // ---- Re-load reservation ----
    const { data: reservation, error: resErr } = await admin
      .from("lodge_reservations")
      .select(
        "id, number, guest_name, guest_email, room_id, check_in, check_out, total_cents, payment_status, stripe_session_id, stripe_payment_intent_id, payment_lock_token, payment_lock_expires_at",
      )
      .eq("id", body.reservation_id)
      .maybeSingle();
    if (resErr) throw resErr;
    if (!reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const r = reservation as any;

    // ---- Helper: build a 423 Locked payload with attribution ----
    const buildLockedResponse = async (lockExpiresIso: string | null, fallbackSeconds: number) => {
      const lockExpMs = lockExpiresIso ? new Date(lockExpiresIso).getTime() : Date.now() + fallbackSeconds * 1000;
      const retryAfter = Math.max(1, Math.ceil((lockExpMs - Date.now()) / 1000)) || fallbackSeconds;
      // Look up the most recent in-progress attempt for attribution
      let lockAttemptId: string | null = null;
      let lockStartedAt: string | null = null;
      let lockOwnerHint: "self" | "other" = "other";
      let lockAdminHint: string | null = null;
      try {
        const { data: attempt } = await admin
          .from("lodging_deposit_retry_attempts")
          .select("id, started_at, client_attempt_id, admin_id")
          .eq("reservation_id", body.reservation_id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (attempt) {
          lockAttemptId = (attempt as any).id;
          lockStartedAt = (attempt as any).started_at;
          if ((attempt as any).client_attempt_id && (attempt as any).client_attempt_id === clientAttemptId) {
            lockOwnerHint = "self";
          }
          const aId = (attempt as any).admin_id as string | null;
          if (aId) lockAdminHint = aId.slice(-4);
        }
      } catch (_) { /* attribution is best-effort */ }

      return new Response(
        JSON.stringify({
          error: "retry_in_progress",
          retry_after_seconds: retryAfter,
          locked_since: lockExpiresIso,
          lock_owner_hint: lockOwnerHint,
          lock_attempt_id: lockAttemptId,
          lock_started_at: lockStartedAt,
          lock_admin_hint: lockAdminHint,
        }),
        {
          status: 423,
          headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(retryAfter) },
        },
      );
    };

    // ---- Row-level lock check ----
    const lockExpires = r.payment_lock_expires_at ? new Date(r.payment_lock_expires_at).getTime() : 0;
    const now = Date.now();
    if (r.payment_lock_token && lockExpires > now) {
      // Allow force_new to break a stale lock owned by the same client (e.g. expired
      // embedded client_secret retry). Verify ownership by matching the most recent
      // in-progress attempt's client_attempt_id.
      let canBreakLock = false;
      if (forceNew) {
        const { data: lastAttempt } = await admin
          .from("lodging_deposit_retry_attempts")
          .select("client_attempt_id, admin_id")
          .eq("reservation_id", body.reservation_id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const sameClient = (lastAttempt as any)?.client_attempt_id === clientAttemptId;
        const sameUser = user?.id && (lastAttempt as any)?.admin_id === user.id;
        canBreakLock = sameClient || sameUser || !lastAttempt;
      }
      if (!canBreakLock) {
        return await buildLockedResponse(r.payment_lock_expires_at, Math.ceil((lockExpires - now) / 1000));
      }
      // Mark the prior in-progress attempt as superseded so it doesn't re-appear in attribution.
      await admin
        .from("lodging_deposit_retry_attempts")
        .update({ completed_at: new Date().toISOString(), result: "superseded" })
        .eq("reservation_id", body.reservation_id)
        .is("completed_at", null);
      // Clear the stale lock so the optimistic acquire below succeeds.
      await admin
        .from("lodge_reservations")
        .update({ payment_lock_token: null, payment_lock_expires_at: null })
        .eq("id", body.reservation_id);
    }

    // Acquire the row lock (best-effort optimistic — only set if still unlocked)
    {
      const { error: lockSetErr } = await admin
        .from("lodge_reservations")
        .update({
          payment_lock_token: myLockToken,
          payment_lock_expires_at: new Date(now + ROW_LOCK_TTL_SECONDS * 1000).toISOString(),
        })
        .eq("id", body.reservation_id)
        .or(`payment_lock_token.is.null,payment_lock_expires_at.lt.${new Date(now).toISOString()}`);
      if (lockSetErr) {
        console.warn("[create-lodging-deposit] lock acquire warn", lockSetErr.message);
      }
    }

    // Re-fetch to confirm we own the lock; if not, somebody else just grabbed it.
    {
      const { data: confirm } = await admin
        .from("lodge_reservations")
        .select("payment_lock_token, payment_lock_expires_at")
        .eq("id", body.reservation_id)
        .maybeSingle();
      if ((confirm as any)?.payment_lock_token !== myLockToken) {
        return await buildLockedResponse((confirm as any)?.payment_lock_expires_at ?? null, 5);
      }
    }

    // Refuse to re-mint if already in a terminal/successful state.
    const currentStatus = r.payment_status as string | null;
    if (currentStatus && TERMINAL_PAYMENT_STATES.has(currentStatus)) {
      return new Response(
        JSON.stringify({
          already_paid: true,
          status: currentStatus,
          message: `Payment is already ${currentStatus.replace("_", " ")} — no new charge needed.`,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ---- Dedup-key check (cross-tab + redelivery) ----
    // Include uiMode + (when forced) a fresh suffix so a retried embedded session doesn't collide.
    const forceSuffix = forceNew ? `|force_${Date.now()}` : "";
    const dedupKey = `${body.reservation_id}|${r.stripe_payment_intent_id || "none"}|${clientAttemptId}|${depositCents}|${mode}|${uiMode}${forceSuffix}`;
    const { data: dedupRow } = await admin
      .from("lodging_deposit_retry_attempts")
      .insert({
        dedup_key: dedupKey,
        reservation_id: body.reservation_id,
        result: "in_progress",
        client_attempt_id: clientAttemptId,
        admin_id: user?.id ?? null,
      })
      .select("id")
      .maybeSingle();

    if (!dedupRow) {
      // Conflict — fetch the prior attempt's cached URL / client_secret
      const { data: prior } = await admin
        .from("lodging_deposit_retry_attempts")
        .select("checkout_url, stripe_session_id")
        .eq("dedup_key", dedupKey)
        .maybeSingle();
      if ((prior as any)?.stripe_session_id && uiMode === "embedded") {
        // Re-retrieve session to get fresh client_secret (it expires).
        try {
          const stripeTmp = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          const existing = await stripeTmp.checkout.sessions.retrieve((prior as any).stripe_session_id);
          if (
            existing.status === "open"
            && (existing as any).ui_mode === "embedded"
            && (existing as any).client_secret
            && (existing as any).redirect_on_completion === EMBEDDED_CARD_REDIRECT_ON_COMPLETION
          ) {
            return new Response(
              JSON.stringify({
                client_secret: (existing as any).client_secret,
                session_id: existing.id,
                ui_mode: "embedded",
                redirect_on_completion: (existing as any).redirect_on_completion,
                reused: true,
              }),
              { headers: { ...cors, "Content-Type": "application/json" } },
            );
          }
        } catch (_) { /* fall through to mint a new one */ }
      } else if ((prior as any)?.checkout_url) {
        return new Response(
          JSON.stringify({
            url: (prior as any).checkout_url,
            session_id: (prior as any).stripe_session_id,
            ui_mode: "hosted",
            reused: true,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }
    const dedupRowId = (dedupRow as any)?.id || null;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reuse open Checkout Session — unless caller explicitly asked for a fresh one.
    const existingSessionId = forceNew ? null : (r.stripe_session_id as string | null);
    if (existingSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(existingSessionId);
        if (existing.status === "open") {
          // Embedded sessions don't have .url — they expose .client_secret instead.
          const existingUiMode = (existing as any).ui_mode as "hosted" | "embedded" | undefined;
          if (
            uiMode === "embedded"
            && existingUiMode === "embedded"
            && (existing as any).client_secret
            && (existing as any).redirect_on_completion === EMBEDDED_CARD_REDIRECT_ON_COMPLETION
          ) {
            if (dedupRowId) {
              await admin
                .from("lodging_deposit_retry_attempts")
                .update({
                  completed_at: new Date().toISOString(),
                  result: "reused_session",
                  stripe_session_id: existing.id,
                })
                .eq("id", dedupRowId);
            }
            return new Response(
              JSON.stringify({
                client_secret: (existing as any).client_secret,
                session_id: existing.id,
                ui_mode: "embedded",
                redirect_on_completion: (existing as any).redirect_on_completion,
                reused: true,
              }),
              { headers: { ...cors, "Content-Type": "application/json" } },
            );
          }
          if (uiMode === "hosted" && existing.url) {
            if (dedupRowId) {
              await admin
                .from("lodging_deposit_retry_attempts")
                .update({
                  completed_at: new Date().toISOString(),
                  result: "reused_session",
                  checkout_url: existing.url,
                  stripe_session_id: existing.id,
                })
                .eq("id", dedupRowId);
            }
            return new Response(
              JSON.stringify({ url: existing.url, session_id: existing.id, ui_mode: "hosted", reused: true }),
              { headers: { ...cors, "Content-Type": "application/json" } },
            );
          }
        }
      } catch (_) { /* fall through */ }
    }

    let customerId: string | undefined;
    const email = user?.email || r.guest_email || undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://hizivo.com";
    const defaultReturnUrl =
      `${origin}/hotel/${body.store_id}/booking-confirmed?reservation_id=${body.reservation_id}&payment=1&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl =
      `${origin}/hotel/${body.store_id}/book?payment=cancelled&reservation_id=${body.reservation_id}`;
    const toSameOriginUrl = (value: unknown, fallback: string) => {
      if (typeof value !== "string" || !value.trim()) return fallback;
      const raw = value.trim();
      const candidate = raw.startsWith("/") ? `${origin}${raw}` : raw;
      return candidate.startsWith(`${origin}/`) ? candidate : fallback;
    };
    const returnUrl = toSameOriginUrl(body.return_url, defaultReturnUrl);
    const cancelUrl = toSameOriginUrl(body.cancel_url, defaultCancelUrl);
    const productName =
      mode === "deposit"
        ? `Refundable hold – Reservation ${r.number}`
        : `Reservation ${r.number}`;

    // Stable Stripe Idempotency-Key — same inputs (incl. client_attempt_id + uiMode) → same Session.
    const attemptHash = await sha256Hex(
      `${body.reservation_id}|${depositCents}|${mode}|${currentStatus ?? "null"}|${clientAttemptId}|${uiMode}${forceSuffix}`,
    );
    const idempotencyKey = `lodge_dep_${body.reservation_id}_${attemptHash.slice(0, 16)}`;

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description:
                mode === "deposit"
                  ? "Authorised hold on your card. Captured only if damage or no-show occurs."
                  : "Full payment for your stay.",
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        capture_method: mode === "deposit" ? "manual" : "automatic",
        metadata: {
          reservation_id: body.reservation_id,
          store_id: body.store_id,
          mode,
        },
      },
      metadata: {
        reservation_id: body.reservation_id,
        store_id: body.store_id,
        mode,
      },
      client_reference_id: body.reservation_id,
    };

    if (uiMode === "embedded") {
      sessionParams.ui_mode = "embedded";
      // This checkout entry point is explicitly card payment. Restrict the
      // embedded session to card so Stripe never needs to leave the ZIVO app.
      sessionParams.payment_method_types = ["card"];
      sessionParams.redirect_on_completion = EMBEDDED_CARD_REDIRECT_ON_COMPLETION;
    } else {
      sessionParams.success_url = returnUrl;
      sessionParams.cancel_url = cancelUrl;
    }

    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    await admin
      .from("lodge_reservations")
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        deposit_cents: depositCents,
        payment_provider: "stripe",
        payment_status: mode === "deposit" ? "authorized" : "pending",
        last_payment_error: null,
        // Lock auto-expires; release proactively now that we've handed off to Stripe.
        payment_lock_token: null,
        payment_lock_expires_at: null,
      })
      .eq("id", body.reservation_id);

    if (dedupRowId) {
      await admin
        .from("lodging_deposit_retry_attempts")
        .update({
          completed_at: new Date().toISOString(),
          result: "created_session",
          checkout_url: session.url ?? null,
          stripe_session_id: session.id,
        })
        .eq("id", dedupRowId);
    }

    if (uiMode === "embedded") {
      return new Response(
        JSON.stringify({
          client_secret: (session as any).client_secret,
          session_id: session.id,
          ui_mode: "embedded",
          redirect_on_completion: (session as any).redirect_on_completion,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, ui_mode: "hosted" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-lodging-deposit] Error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
