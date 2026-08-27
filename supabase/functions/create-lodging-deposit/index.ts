/**
 * create-lodging-deposit
 * Creates (or reuses) a Stripe Checkout Session to authorise / charge a lodging deposit.
 *
 * Hardening (idempotency + dedup):
 *  - Row-level lock via lodge_reservations.payment_lock_token + payment_lock_expires_at:
 *      if an unexpired token exists belonging to another caller → 423 Locked.
 *  - dedup_key persisted to lodging_deposit_retry_attempts (unique). Conflict → reused result.
 *  - Stripe Idempotency-Key derived from the server-authorized amount/mode plus the reservation,
 *    payment status, and client attempt — duplicate POSTs return the same Checkout Session.
 *  - Re-reads payment_status under the lock and bails out if the row already settled.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import {
  hasCurrentLodgingPaymentAuthorityMetadata,
  isAuthoritativeLodgingCheckoutSession,
  isAuthorizedLodgingPaymentCaller,
  LODGING_PAYMENT_AUTHORITY_VERSION,
  lodgingPaymentAttemptScope,
  resolveLodgingPaymentAuthority,
} from "../_shared/lodgingPaymentAuthority.ts";

interface Body {
  reservation_id: string;
  store_id: string;
  /** Legacy client assertion. The persisted reservation remains authoritative. */
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
const RESERVATION_PAYMENT_SELECT =
  "id, number, store_id, guest_id, guest_name, guest_email, guest_details, room_id, check_in, check_out, total_cents, deposit_cents, paid_cents, payment_status, stripe_session_id, stripe_payment_intent_id, payment_lock_token, payment_lock_expires_at";

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const randomToken = () => crypto.randomUUID().replace(/-/g, "");

Deno.serve(withSecurity("create-lodging-deposit", async (req, ctx) => {
  const cors = ctx.corsHeaders;
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

    const clientAttemptId = (body.client_attempt_id || "default").slice(0, 64);
    const uiMode: "hosted" | "embedded" = body.ui_mode === "embedded" ? "embedded" : "hosted";
    const forceNew = body.force_new === true;

    const admin = createClient(supabaseUrl, serviceKey);
    const myLockToken = randomToken();

    // ---- Re-load reservation ----
    const { data: reservation, error: resErr } = await admin
      .from("lodge_reservations")
      .select(RESERVATION_PAYMENT_SELECT)
      .eq("id", body.reservation_id)
      .maybeSingle();
    if (resErr) throw resErr;
    if (!reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let r = reservation as any;

    // The service-role client below bypasses RLS, so authorize before any
    // reservation lock, retry record, or Stripe side effect. Preserve the
    // existing global-admin retry surface; ordinary callers must own the stay.
    let ownsReservation = r.guest_id === user.id;
    let isGlobalAdmin = false;
    if (!ownsReservation) {
      const { data: adminRole, error: adminRoleError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (adminRoleError) throw adminRoleError;
      isGlobalAdmin = Boolean(adminRole);
    }
    if (!isAuthorizedLodgingPaymentCaller({
      reservationGuestId: r.guest_id,
      userId: user.id,
      isGlobalAdmin,
    })) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const paymentAuthorityResponse = (reason: string) => {
      const status = reason === "store_mismatch" ? 404 : reason === "requested_amount_invalid" ? 400 : 409;
      const error = reason === "store_mismatch"
        ? "Reservation not found"
        : reason === "legacy_deposit_requires_review"
          ? "An earlier card hold needs review before another deposit can be created. Contact support."
        : reason === "requested_amount_invalid"
          ? "A valid reservation amount is required"
          : "Reservation payment details changed. Refresh and try again.";
      return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    };

    let paymentAuthority = resolveLodgingPaymentAuthority({
      reservation: r,
      requestedStoreId: body.store_id,
      requestedMode: body.mode,
      requestedCents: body.deposit_cents,
    });
    if (!paymentAuthority.ok) return paymentAuthorityResponse(paymentAuthority.reason);
    let { mode, payableCents } = paymentAuthority;
    const isAuthoritativeCheckoutSession = (session: any) =>
      isAuthoritativeLodgingCheckoutSession({
        session,
        reservationId: r.id,
        storeId: r.store_id,
        mode,
        payableCents,
      });

    const releaseOwnedPaymentLock = async () => {
      await admin
        .from("lodge_reservations")
        .update({ payment_lock_token: null, payment_lock_expires_at: null })
        .eq("id", body.reservation_id)
        .eq("payment_lock_token", myLockToken);
    };
    const flagPaymentAuthorityReview = async () => {
      await admin
        .from("lodge_reservations")
        .update({
          payment_status: "failed",
          last_payment_error: "Stripe payment terms require review",
        })
        .eq("id", body.reservation_id)
        .eq("payment_lock_token", myLockToken)
        .in("payment_status", ["pending", "processing", "authorized"]);
    };

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
      // A refresh is not authority to steal an active lock. Returning 423 keeps
      // concurrent refreshes from minting multiple payable Checkout Sessions.
      return await buildLockedResponse(
        r.payment_lock_expires_at,
        Math.ceil((lockExpires - now) / 1000),
      );
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

    // Re-fetch the full payment boundary under our lock. This closes the window
    // where price, ownership, or payment state changes before Stripe creation.
    {
      const { data: confirm, error: confirmError } = await admin
        .from("lodge_reservations")
        .select(RESERVATION_PAYMENT_SELECT)
        .eq("id", body.reservation_id)
        .maybeSingle();
      if (confirmError) throw confirmError;
      if ((confirm as any)?.payment_lock_token !== myLockToken) {
        return await buildLockedResponse((confirm as any)?.payment_lock_expires_at ?? null, 5);
      }

      r = confirm as any;
      ownsReservation = r.guest_id === user.id;
      if (!isAuthorizedLodgingPaymentCaller({
        reservationGuestId: r.guest_id,
        userId: user.id,
        isGlobalAdmin,
      })) {
        await releaseOwnedPaymentLock();
        return new Response(JSON.stringify({ error: "Reservation not found" }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      paymentAuthority = resolveLodgingPaymentAuthority({
        reservation: r,
        requestedStoreId: body.store_id,
        requestedMode: body.mode,
        requestedCents: body.deposit_cents,
      });
      if (!paymentAuthority.ok) {
        await releaseOwnedPaymentLock();
        return paymentAuthorityResponse(paymentAuthority.reason);
      }
      ({ mode, payableCents } = paymentAuthority);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let reservationSession: any = null;
    if (r.stripe_session_id) {
      try {
        reservationSession = await stripe.checkout.sessions.retrieve(r.stripe_session_id);
      } catch (sessionLookupError: any) {
        const resourceMissing = sessionLookupError?.statusCode === 404
          || sessionLookupError?.code === "resource_missing"
          || sessionLookupError?.raw?.code === "resource_missing";
        if (!resourceMissing) {
          await releaseOwnedPaymentLock();
          return new Response(
            JSON.stringify({
              error: "The existing card session could not be verified. Please try again shortly.",
            }),
            { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
        if (mode === "deposit") {
          await flagPaymentAuthorityReview();
          await releaseOwnedPaymentLock();
          return paymentAuthorityResponse("legacy_deposit_requires_review");
        }
        // Stripe confirmed the old full-payment Session no longer exists, so
        // it cannot remain payable. Treat the local pointer as absent and let
        // the lock/CAS-protected replacement become the sole current Session.
        r.stripe_session_id = null;
      }

      // Older code allowed the browser to overwrite deposit_cents. A prior
      // unversioned deposit attempt therefore makes that snapshot untrusted
      // until an administrator audits and restores it.
      if (
        mode === "deposit"
        && !hasCurrentLodgingPaymentAuthorityMetadata(reservationSession?.metadata)
      ) {
        await flagPaymentAuthorityReview();
        await releaseOwnedPaymentLock();
        return paymentAuthorityResponse("legacy_deposit_requires_review");
      }
    }

    // A terminal row is only reusable when its persisted balance agrees with
    // server terms. Deposit authorization additionally requires v2 provenance,
    // which the check above established before trusting an old `authorized` row.
    const currentStatus = r.payment_status as string | null;
    if (currentStatus && TERMINAL_PAYMENT_STATES.has(currentStatus)) {
      const terminalAuthorityIsValid = currentStatus === "authorized"
        ? mode === "deposit" && isAuthoritativeCheckoutSession(reservationSession)
        : payableCents === 0;
      if (!terminalAuthorityIsValid) {
        await flagPaymentAuthorityReview();
        await releaseOwnedPaymentLock();
        return paymentAuthorityResponse("legacy_deposit_requires_review");
      }
      await releaseOwnedPaymentLock();
      return new Response(
        JSON.stringify({
          already_paid: true,
          status: currentStatus,
          message: `Payment is already ${currentStatus.replace("_", " ")} — no new charge needed.`,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (payableCents === 0) {
      await flagPaymentAuthorityReview();
      await releaseOwnedPaymentLock();
      return paymentAuthorityResponse("amount_unavailable");
    }

    // ---- Dedup-key check (cross-tab + redelivery) ----
    // `clientAttemptId` represents one logical UI action. Never add server time:
    // an HTTP retry of the same action must resolve to the same Stripe Session.
    const refreshScope = forceNew ? "refresh" : "standard";
    const attemptScope = lodgingPaymentAttemptScope({
      clientAttemptId,
      currentSessionId: r.stripe_session_id,
      currentPaymentIntentId: r.stripe_payment_intent_id,
    });
    const dedupKey = `${LODGING_PAYMENT_AUTHORITY_VERSION}|${body.reservation_id}|${attemptScope}|${payableCents}|${mode}|${uiMode}|${refreshScope}`;
    const { data: dedupRow, error: dedupInsertError } = await admin
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

    if (dedupInsertError && (dedupInsertError as any).code !== "23505") {
      throw dedupInsertError;
    }

    let dedupRowId = (dedupRow as any)?.id || null;

    if (!dedupRow) {
      // Conflict — fetch and revalidate the prior attempt's Stripe Session.
      const { data: prior } = await admin
        .from("lodging_deposit_retry_attempts")
        .select("id, checkout_url, stripe_session_id")
        .eq("dedup_key", dedupKey)
        .maybeSingle();
      dedupRowId = (prior as any)?.id || null;
      if ((prior as any)?.stripe_session_id) {
        // Never trust a cached URL/client secret across a changed payment boundary.
        try {
          const existing = await stripe.checkout.sessions.retrieve((prior as any).stripe_session_id);
          if (
            existing.status === "open"
            && isAuthoritativeCheckoutSession(existing)
            && uiMode === "embedded"
            && (existing as any).ui_mode === "embedded"
            && (existing as any).client_secret
            && (existing as any).redirect_on_completion === EMBEDDED_CARD_REDIRECT_ON_COMPLETION
          ) {
            await releaseOwnedPaymentLock();
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
          if (
            existing.status === "open"
            && isAuthoritativeCheckoutSession(existing)
            && uiMode === "hosted"
            && existing.url
          ) {
            await releaseOwnedPaymentLock();
            return new Response(
              JSON.stringify({
                url: existing.url,
                session_id: existing.id,
                ui_mode: "hosted",
                reused: true,
              }),
              { headers: { ...cors, "Content-Type": "application/json" } },
            );
          }
          // The same logical attempt already produced a Session, but it is no
          // longer reusable. Require a new client attempt instead of reusing the
          // same Stripe idempotency key and returning an expired Session.
          await releaseOwnedPaymentLock();
          return new Response(
            JSON.stringify({ error: "This card session is no longer available. Refresh the card form again." }),
            { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
          );
        } catch (_) {
          await releaseOwnedPaymentLock();
          return new Response(
            JSON.stringify({ error: "The previous card session could not be verified. Please try again." }),
            { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Reuse open Checkout Session — unless caller explicitly asked for a fresh one.
    const existingSessionId = forceNew ? null : (r.stripe_session_id as string | null);
    if (existingSessionId) {
      try {
        const existing = reservationSession?.id === existingSessionId
          ? reservationSession
          : await stripe.checkout.sessions.retrieve(existingSessionId);
        if (existing.status === "open" && isAuthoritativeCheckoutSession(existing)) {
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
            await releaseOwnedPaymentLock();
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
            await releaseOwnedPaymentLock();
            return new Response(
              JSON.stringify({ url: existing.url, session_id: existing.id, ui_mode: "hosted", reused: true }),
              { headers: { ...cors, "Content-Type": "application/json" } },
            );
          }
        }
      } catch (_) { /* fall through */ }
    }

    const expireOpenCheckoutSession = async (candidate: any): Promise<boolean> => {
      if (!candidate || typeof candidate.id !== "string") return false;
      if (candidate.status === "expired") return true;
      if (candidate.status !== "open") return false;
      try {
        const expired = await stripe.checkout.sessions.expire(candidate.id);
        return expired?.status === "expired";
      } catch (_) {
        try {
          const current = await stripe.checkout.sessions.retrieve(candidate.id);
          return current?.status === "expired";
        } catch (_) {
          return false;
        }
      }
    };

    // Before replacing the reservation's sole provider pointer, make the prior
    // Checkout Session unpayable. This also quarantines an open pre-v2 full
    // session instead of leaving an untracked older tab able to charge.
    if (r.stripe_session_id) {
      if (!reservationSession || !await expireOpenCheckoutSession(reservationSession)) {
        await releaseOwnedPaymentLock();
        return new Response(
          JSON.stringify({
            error: "An existing card session is still active or settling. Wait for it to finish before refreshing.",
          }),
          { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    let customerId: string | undefined;
    const email = r.guest_email || (ownsReservation ? user.email : undefined);
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://zivosmedia.com";
    const defaultReturnUrl =
      `${origin}/hotel/${r.store_id}/booking-confirmed?reservation_id=${body.reservation_id}&payment=1&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl =
      `${origin}/hotel/${r.store_id}/book?payment=cancelled&reservation_id=${body.reservation_id}`;
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

    // Stable Stripe Idempotency-Key — the same logical client attempt returns
    // the same Session even if the HTTP request is retried.
    const attemptHash = await sha256Hex(
      `${LODGING_PAYMENT_AUTHORITY_VERSION}|${body.reservation_id}|${payableCents}|${mode}|${attemptScope}|${uiMode}|${refreshScope}`,
    );
    const idempotencyKey = `lodge_dep_${LODGING_PAYMENT_AUTHORITY_VERSION}_${body.reservation_id}_${attemptHash.slice(0, 16)}`;

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
            unit_amount: payableCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        capture_method: mode === "deposit" ? "manual" : "automatic",
        metadata: {
          reservation_id: body.reservation_id,
          store_id: r.store_id,
          mode,
          lodging_payment_authority: LODGING_PAYMENT_AUTHORITY_VERSION,
        },
      },
      metadata: {
        reservation_id: body.reservation_id,
        store_id: r.store_id,
        mode,
        lodging_payment_authority: LODGING_PAYMENT_AUTHORITY_VERSION,
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

    const { data: linkedReservation, error: linkError } = await admin
      .from("lodge_reservations")
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        payment_provider: "stripe",
        // Session creation is not proof of payment or authorization. Only the
        // signed Stripe webhook may advance the reservation to success.
        payment_status: "pending",
        last_payment_error: null,
        // Lock auto-expires; release proactively now that we've handed off to Stripe.
        payment_lock_token: null,
        payment_lock_expires_at: null,
      })
      .eq("id", body.reservation_id)
      .eq("payment_lock_token", myLockToken)
      .select("id")
      .maybeSingle();

    if (linkError || !linkedReservation) {
      // Never return an untracked payable Session. If our lock was lost, make
      // the just-created Session unpayable before reporting the conflict.
      await expireOpenCheckoutSession(session);
      if (dedupRowId) {
        await admin
          .from("lodging_deposit_retry_attempts")
          .update({ completed_at: new Date().toISOString(), result: "session_link_failed" })
          .eq("id", dedupRowId);
      }
      if (linkError) throw linkError;
      return await buildLockedResponse(null, 5);
    }

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
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
