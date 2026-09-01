/**
 * auto-cancel-stale-orders
 * Cancels grocery and Eats orders stuck unpaid beyond their server deadline.
 * Designed to be called via pg_cron every 10 minutes.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import {
  getInternalCronReadinessFailurePayload,
  isAuthorizedInternalCron,
  isInternalCronReadinessProbe,
  type InternalCronAuthFailureStage,
} from "../_shared/internalCronAuth.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(
  withSecurity(
    "auto-cancel-stale-orders",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      try {
        let authFailureStage: InternalCronAuthFailureStage | null = null;
        if (
          !(await isInternalCaller(req, (stage) => (authFailureStage = stage)))
        ) {
          const diagnostic = getInternalCronReadinessFailurePayload(
            req,
            authFailureStage,
          );
          return new Response(
            JSON.stringify(diagnostic ?? { error: "forbidden" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        if (isInternalCronReadinessProbe(req)) {
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // Find stale pending_payment orders older than 1 hour
        const { data: staleOrders, error: fetchError } = await supabaseAdmin
          .from("shopping_orders")
          .select("id, store, user_id")
          .eq("status", "pending_payment")
          .lt("placed_at", oneHourAgo)
          .limit(100);

        if (fetchError) {
          console.error("Error fetching stale orders:", fetchError);
          return new Response(JSON.stringify({ error: fetchError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const candidateIds = (staleOrders ?? []).map(
          (order: { id: string }) => order.id,
        );
        let shoppingOrderIds: string[] = [];

        if (candidateIds.length > 0) {
          // Recheck the stale status/time on UPDATE so a concurrent payment
          // cannot be cancelled from the earlier read snapshot.
          const { data: cancelledShopping, error: updateError } =
            await supabaseAdmin
              .from("shopping_orders")
              .update({
                status: "cancelled",
                cancelled_at: new Date().toISOString(),
              } as any)
              .in("id", candidateIds)
              .eq("status", "pending_payment")
              .lt("placed_at", oneHourAgo)
              .select("id");

          if (updateError) {
            console.error("Error cancelling shopping orders:", updateError);
            return new Response(
              JSON.stringify({ error: updateError.message }),
              {
                status: 500,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              },
            );
          }
          shoppingOrderIds = (cancelledShopping ?? []).map(
            (order: { id: string }) => order.id,
          );
        }

        // Postgres owns the Eats eligibility predicate, row locks, state
        // recheck, and atomic inventory/promo release trigger.
        const { data: eatsExpiryData, error: eatsExpiryError } =
          await supabaseAdmin.rpc("expire_stale_eats_orders_v1", {
            p_limit: 100,
          });
        if (eatsExpiryError) {
          console.error("Error cancelling stale Eats orders:", eatsExpiryError);
          return new Response(
            JSON.stringify({ error: eatsExpiryError.message }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        const eatsExpiry = parseEatsExpiryResult(eatsExpiryData);
        if (!eatsExpiry) {
          console.error("Invalid Eats expiry RPC response");
          return new Response(
            JSON.stringify({ error: "invalid_eats_expiry_response" }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        const cancelled = shoppingOrderIds.length + eatsExpiry.cancelled;
        console.log(
          `Auto-cancelled ${shoppingOrderIds.length} shopping and ${eatsExpiry.cancelled} Eats orders`,
        );

        return new Response(
          JSON.stringify({
            cancelled,
            shopping_cancelled: shoppingOrderIds.length,
            eats_cancelled: eatsExpiry.cancelled,
            order_ids: shoppingOrderIds,
            eats_order_ids: eatsExpiry.orderIds,
            ...(cancelled === 0 ? { message: "No stale orders found" } : {}),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err: any) {
        console.error("auto-cancel-stale-orders error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    },
    {
      rateLimit: "admin_action",
      strictCors: true,
      allowedMethods: ["POST"],
      skipBotDetection: true,
      skipWaf: true,
      trackNetwork: "suspicious",
    },
  ),
);

function parseEatsExpiryResult(
  value: unknown,
): { cancelled: number; orderIds: string[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as { cancelled?: unknown; order_ids?: unknown };
  if (
    !Number.isSafeInteger(result.cancelled) ||
    Number(result.cancelled) < 0 ||
    !Array.isArray(result.order_ids) ||
    !result.order_ids.every((id) => typeof id === "string") ||
    result.order_ids.length !== result.cancelled
  ) {
    return null;
  }
  return {
    cancelled: Number(result.cancelled),
    orderIds: result.order_ids as string[],
  };
}

async function isInternalCaller(
  req: Request,
  diagnosticObserver?: (stage: InternalCronAuthFailureStage) => void,
): Promise<boolean> {
  return isAuthorizedInternalCron(req, {
    functionName: "auto-cancel-stale-orders",
    legacyBearerEnvNames: ["SUPABASE_SERVICE_ROLE_KEY"],
    diagnosticObserver,
  });
}
