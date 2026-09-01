/**
 * eats-payout-request
 * --------------------
 * Validates a restaurant's payout request and inserts it into
 * `eats_payout_requests`. Mirrors lodge-payout-request: enforces AAL2 step-up,
 * validates rail eligibility against the restaurant's market country, and
 * pings finance via Telegram for manual rails.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { getIdempotencyKey, withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SQUARE_COUNTRIES = new Set([
  "US",
  "CA",
  "GB",
  "AU",
  "JP",
  "IE",
  "ES",
  "FR",
]);
const MERCURY_COUNTRIES = new Set(["US"]);
const ALLOWED_RAILS = new Set([
  "stripe",
  "aba",
  "bank_wire",
  "paypal",
  "square",
  "mercury",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ManualPayoutClaim {
  ok?: boolean;
  code?: string;
  idempotent_replay?: boolean;
  available_cents?: number;
  request?: {
    id?: string;
    status?: string;
    amount_cents?: number;
  };
}

interface PayoutAlert {
  restaurantName: string;
  country: string;
  rail: string;
  amountCents: number;
  methodLabel: string;
  note: string | null;
  requestId: string;
}

serve(
  withSecurity(
    "eats-payout-request",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      const json = (
        body: unknown,
        status = 200,
        extraHeaders: Record<string, string> = {},
      ) => jsonResponse(body, status, { ...corsHeaders, ...extraHeaders });

      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        let pendingAlert: PayoutAlert | null = null;
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } },
        );

        const auth = req.headers.get("Authorization");
        if (!auth) throw new Error("Not authenticated");

        const mfaErr = enforceAal2(auth, corsHeaders);
        if (mfaErr) return mfaErr;

        const { data: ud, error: ue } = await supabase.auth.getUser(
          auth.replace("Bearer ", ""),
        );
        if (ue || !ud.user) throw new Error("Invalid auth");
        const user = ud.user;

        // Keep the original request body readable by withIdempotency, which hashes
        // an exact clone before the transactional database claim runs.
        const body = await req
          .clone()
          .json()
          .catch(() => ({}));
        const restaurant_id = String(body.restaurant_id || "").trim();
        const payout_method_id = String(body.payout_method_id || "").trim();
        const amount_cents = Math.floor(Number(body.amount_cents || 0));
        const note = body.note ? String(body.note).trim().slice(0, 500) : null;

        if (
          !UUID_PATTERN.test(restaurant_id) ||
          !UUID_PATTERN.test(payout_method_id) ||
          !Number.isSafeInteger(amount_cents) ||
          amount_cents <= 0 ||
          amount_cents > 2_147_483_647
        ) {
          return json({ error: "Missing required fields" }, 400);
        }

        const executePayoutClaim = async (key: string) => {
          const [
            { data: restaurant, error: restaurantError },
            { data: method, error: methodError },
          ] = await Promise.all([
            supabase
              .from("restaurants")
              .select("id, owner_id, name")
              .eq("id", restaurant_id)
              .maybeSingle(),
            supabase
              .from("customer_payout_methods")
              .select(
                "id, user_id, store_id, rail, method_type, country_code, label, is_verified, verification_status",
              )
              .eq("id", payout_method_id)
              .maybeSingle(),
          ]);

          if (restaurantError) {
            console.error("[eats-payout-request] restaurant preflight", {
              code: restaurantError.code,
            });
            return {
              status: 503,
              body: {
                error: "Restaurant verification is temporarily unavailable",
                retryable: true,
              },
            };
          }
          if (!restaurant) {
            return { status: 404, body: { error: "Restaurant not found" } };
          }
          if ((restaurant as any).owner_id !== user.id) {
            return {
              status: 403,
              body: { error: "Not authorized for this restaurant" },
            };
          }
          if (methodError) {
            console.error("[eats-payout-request] payout method preflight", {
              code: methodError.code,
            });
            return {
              status: 503,
              body: {
                error: "Payout method verification is temporarily unavailable",
                retryable: true,
              },
            };
          }
          if (!method) {
            return {
              status: 404,
              body: { error: "Payout method not found" },
            };
          }
          if (
            (method as any).user_id !== user.id ||
            ((method as any).store_id &&
              (method as any).store_id !== restaurant_id)
          ) {
            return {
              status: 403,
              body: {
                error: "Payout method does not belong to this restaurant",
              },
            };
          }
          if (
            (method as any).is_verified !== true ||
            String((method as any).verification_status || "").toLowerCase() !==
              "verified"
          ) {
            return {
              status: 409,
              body: { error: "Payout method is not verified" },
            };
          }

          // `restaurants` has no market/country column; the payout method carries it.
          const country = String((method as any).country_code || "US")
            .toUpperCase()
            .slice(0, 2);
          const storedRail = String(
            (method as any).rail || (method as any).method_type || "bank_wire",
          )
            .trim()
            .toLowerCase();
          const rail =
            storedRail === "bank_transfer" ? "bank_wire" : storedRail;

          if (!ALLOWED_RAILS.has(rail)) {
            return {
              status: 400,
              body: { error: `Unsupported payout rail "${rail}".` },
            };
          }
          if (rail === "stripe") {
            return {
              status: 409,
              body: {
                error:
                  "Stripe-paid Eats earnings use the automatic transfer rail",
              },
            };
          }
          if (rail === "square" && !SQUARE_COUNTRIES.has(country)) {
            return {
              status: 400,
              body: {
                error: `Square Payouts are not available in ${country}.`,
              },
            };
          }
          if (rail === "mercury" && !MERCURY_COUNTRIES.has(country)) {
            return {
              status: 400,
              body: { error: "Mercury (US ACH) requires a US bank account." },
            };
          }

          const { data: claimData, error: claimError } = await supabase.rpc(
            "request_eats_manual_payout",
            {
              p_restaurant_id: restaurant_id,
              p_requested_by: user.id,
              p_payout_method_id: payout_method_id,
              p_amount_cents: amount_cents,
              p_rail: rail,
              p_idempotency_key: key,
              p_note: note,
            },
          );
          if (claimError) {
            throw new Error(
              `Unable to verify payout balance: ${claimError.message}`,
            );
          }

          const claim = (claimData || {}) as ManualPayoutClaim;
          const claimedRequest = claim.request;
          if (!claim.ok || !claimedRequest?.id) {
            const code = String(claim.code || "payout_claim_failed");
            const available = Number(claim.available_cents);
            const responseBody: Record<string, unknown> = {
              error:
                code === "insufficient_available_balance"
                  ? "Requested amount exceeds the verified available balance"
                  : "The verified payout balance is unavailable",
              code,
            };
            if (Number.isSafeInteger(available) && available >= 0) {
              responseBody.available_cents = available;
            }
            return {
              status:
                code === "forbidden"
                  ? 403
                  : code === "insufficient_available_balance"
                    ? 409
                    : 503,
              body: responseBody,
            };
          }

          if (rail !== "stripe" && !claim.idempotent_replay) {
            pendingAlert = {
              restaurantName:
                (restaurant as any).name || (restaurant as any).id,
              country,
              rail,
              amountCents: amount_cents,
              methodLabel: (method as any).label || (method as any).method_type,
              note,
              requestId: claimedRequest.id,
            };
          }

          return {
            status: 200,
            body: {
              success: true,
              id: claimedRequest.id,
              status: claimedRequest.status || "pending",
              amount_cents: claimedRequest.amount_cents ?? amount_cents,
              available_cents_after: claim.available_cents,
            },
          };
        };

        const requestKey = getIdempotencyKey(req);
        let cacheState: "HIT" | "MISS" | "RECOVERED" = "MISS";
        let result: {
          status: number;
          body: Record<string, unknown>;
          cached: boolean;
        };

        try {
          result = await withIdempotency(
            req,
            "eats-payout-request",
            user.id,
            async ({ key }) => {
              if (!key || !UUID_PATTERN.test(key)) {
                return {
                  status: 400,
                  body: { error: "A UUID Idempotency-Key header is required" },
                };
              }
              return executePayoutClaim(key);
            },
            { required: true },
          );
          cacheState = result.cached ? "HIT" : "MISS";
        } catch (idempotencyError) {
          const message =
            idempotencyError instanceof Error
              ? idempotencyError.message
              : "Request failed";
          if (
            !requestKey ||
            !UUID_PATTERN.test(requestKey) ||
            !canRecoverFromAuthoritativePayout(message)
          ) {
            throw idempotencyError;
          }

          // The payout RPC permanently binds the key to the immutable request
          // fields in the same transaction as the balance reservation. If the
          // short-lived HTTP response cache is stuck, expired, or failed after
          // commit, replaying the same RPC recovers that authoritative row. A
          // different actor or body still fails inside the RPC and never
          // creates a second reservation.
          const recovered = await executePayoutClaim(requestKey);
          if (recovered.status < 200 || recovered.status >= 300) {
            throw idempotencyError;
          }
          result = { ...recovered, cached: true };
          cacheState = "RECOVERED";
        }

        // The financial response is durably cached before this nonessential
        // alert runs. A slow or unavailable Telegram API can no longer turn a
        // committed request into an ambiguous client outcome.
        if (
          pendingAlert &&
          cacheState === "MISS" &&
          result.status >= 200 &&
          result.status < 300
        ) {
          await sendPayoutAlert(pendingAlert);
        }

        return json(result.body, result.status, {
          "X-Idempotency-Cache": cacheState,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        console.error("[eats-payout-request]", msg);
        const failure = classifyRequestFailure(msg);
        return json(failure.body, failure.status);
      }
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "admin_action",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 85,
    },
  ),
);

async function sendPayoutAlert(alert: PayoutAlert): Promise<void> {
  try {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
    if (!token || !chat) return;
    const text = [
      "🍔 *New Eats payout request*",
      `Restaurant: ${alert.restaurantName}`,
      `Country: ${alert.country}`,
      `Rail: ${alert.rail.toUpperCase()}`,
      `Amount: $${(alert.amountCents / 100).toFixed(2)}`,
      `Method: ${alert.methodLabel}`,
      alert.note ? `Note: ${alert.note}` : "",
      `ID: ${alert.requestId}`,
    ]
      .filter(Boolean)
      .join("\n");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch (error) {
    console.warn("[eats-payout-request] telegram alert failed:", error);
  }
}

function classifyRequestFailure(message: string): {
  status: number;
  body: Record<string, unknown>;
} {
  if (message === "Not authenticated" || message === "Invalid auth") {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  if (
    message.includes("already processing") ||
    message.includes("reused with a different request body") ||
    message.includes("bound to a different actor") ||
    message.includes("expired; retry with a new key") ||
    message.includes("not reusable; retry with a new key")
  ) {
    return {
      status: 409,
      body: {
        error: "Payout request retry conflict",
        code: "idempotency_conflict",
        retryable: message.includes("already processing"),
      },
    };
  }
  return {
    status: 503,
    body: {
      error: "Payout request status is temporarily unavailable",
      code: "payout_authority_unavailable",
      retryable: true,
    },
  };
}

function canRecoverFromAuthoritativePayout(message: string): boolean {
  return (
    message === "An identical request is already processing" ||
    message === "Idempotency key expired; retry with a new key" ||
    message ===
      "Idempotency claim was lost before the response was persisted" ||
    message.startsWith("Unable to persist idempotent response:")
  );
}

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
