/**
 * Atomically creates/reuses the Eats fulfillment rows and starts driver
 * dispatch. Only trusted payment/recovery workers may call this function.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

function rpcObject(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, unknown>)
    : null;
}

Deno.serve(
  withSecurity(
    "dispatch-eats-order",
    async (req, ctx) => {
      const cors = ctx.corsHeaders;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...cors, "Content-Type": "application/json" },
        });

      if (req.method === "OPTIONS")
        return new Response(null, { headers: cors });

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !serviceKey) {
        return json({ error: "Supabase env is not configured" }, 500);
      }
      if (!isServiceRoleRequest(req, serviceKey)) {
        return json({ error: "forbidden" }, 403);
      }

      const body = await req.json().catch(() => ({}));
      const orderId =
        typeof body.order_id === "string" ? body.order_id.trim() : "";
      const offerTtlSeconds = Number.isFinite(body.offer_ttl_seconds)
        ? Math.max(10, Math.min(120, Number(body.offer_ttl_seconds)))
        : 30;
      const radiusMeters = Number.isFinite(body.radius_meters)
        ? Math.max(200, Math.min(50_000, Number(body.radius_meters)))
        : 15_000;
      if (!orderId) return json({ error: "order_id required" }, 400);

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      try {
        const { data: claimData, error: claimError } = await admin.rpc(
          "claim_eats_dispatch",
          { p_order_id: orderId },
        );
        const claim = rpcObject(claimData);
        if (claimError) {
          console.error(
            "[dispatch-eats-order] dispatch claim failed",
            claimError.message,
          );
          return json(
            { error: "delivery_dispatch_pending", retryable: true },
            503,
          );
        }
        if (!claim?.ok) {
          const code = String(claim?.code ?? "delivery_dispatch_pending");
          const status =
            code === "not_found"
              ? 404
              : code === "restaurant_origin_unavailable"
                ? 503
                : 409;
          return json({ error: code, retryable: status === 503 }, status);
        }
        if (claim.dispatch_required !== true) {
          return json({
            ok: true,
            dispatch_required: false,
            pickup_order: true,
          });
        }

        const jobId = typeof claim.job_id === "string" ? claim.job_id : "";
        if (!jobId) {
          return json(
            { error: "delivery_dispatch_pending", retryable: true },
            503,
          );
        }

        let dispatchSucceeded = false;
        let dispatchError = "delivery_dispatch_pending";
        let dispatchPayload: Record<string, unknown> | null = null;
        try {
          const dispatchResponse = await fetch(
            `${supabaseUrl}/functions/v1/dispatch-start`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
              },
              body: JSON.stringify({
                job_id: jobId,
                offer_ttl_seconds: offerTtlSeconds,
                radius_meters: radiusMeters,
              }),
            },
          );
          const parsed = await dispatchResponse.json().catch(() => null);
          dispatchPayload = rpcObject(parsed);
          dispatchSucceeded =
            dispatchResponse.ok &&
            dispatchPayload?.ok === true &&
            (dispatchPayload.dispatched === true ||
              dispatchPayload.already_assigned === true);
          if (!dispatchSucceeded) {
            dispatchError = String(
              dispatchPayload?.error ?? "no_driver_offer_created",
            );
          }
        } catch (error) {
          dispatchError =
            error instanceof Error
              ? error.message
              : "dispatch_start_unavailable";
        }

        const { data: finishData, error: finishError } = await admin.rpc(
          "finish_eats_dispatch",
          {
            p_order_id: orderId,
            p_job_id: jobId,
            p_succeeded: dispatchSucceeded,
            p_error: dispatchSucceeded ? null : dispatchError,
          },
        );
        const finish = rpcObject(finishData);
        if (finishError || !finish?.ok) {
          console.error(
            "[dispatch-eats-order] dispatch finalization failed",
            finishError?.message ?? finish?.code ?? "unknown",
          );
          return json(
            {
              error: "delivery_dispatch_reconciliation_pending",
              retryable: true,
            },
            503,
          );
        }
        if (!dispatchSucceeded) {
          return json(
            {
              error: "delivery_dispatch_pending",
              retryable: true,
              job_id: jobId,
            },
            503,
          );
        }

        return json({
          ok: true,
          job_id: jobId,
          already_dispatched: claim.already_dispatched === true,
          offer: dispatchPayload?.offer ?? null,
        });
      } catch (error) {
        console.error("[dispatch-eats-order]", error);
        return json(
          { error: "delivery_dispatch_pending", retryable: true },
          503,
        );
      }
    },
    {
      allowedMethods: ["POST"],
      strictCors: true,
      rateLimit: "api_general",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
      skipBotDetection: true,
    },
  ),
);
