/**
 * creator-payout-method-record
 * ----------------------------
 * Protected writer for creator payout destination details. Creator profile
 * reads remain RLS-scoped, but payout destination changes require MFA,
 * validation, strict CORS, and idempotency.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { creatorMonetizationBlockedResponse, isCreatorMonetizationDisabled } from "../_shared/creatorMonetizationCompliance.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(withSecurity("creator-payout-method-record", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  if (isCreatorMonetizationDisabled()) return creatorMonetizationBlockedResponse(corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Invalid auth");
    const userId = userData.user.id;

    // Read from a clone: withIdempotency() hashes the request with
    // `await req.clone().text()`, and cloning a Request whose body is already
    // consumed is a spec-mandated TypeError ("unusable"). Reading `req`
    // directly here threw before the payout was ever claimed, and the outer
    // catch reported it as a flat failure.
    const body = await req.clone().json().catch(() => ({}));
    const method = String(body.method || "paypal").trim().toLowerCase();
    const paypalEmail = String(body.paypal_email || "").trim().toLowerCase();

    if (method !== "paypal") return json({ error: "Invalid payout method" }, 400);
    if (!emailPattern.test(paypalEmail) || paypalEmail.length > 254) {
      return json({ error: "Valid PayPal email required" }, 400);
    }

    const execute = async () => {
      const { data: existing, error: readError } = await supabase
        .from("creator_profiles")
        .select("id,payout_details")
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) throw readError;

      const currentDetails = normalizeDetails((existing as any)?.payout_details);
      const payoutDetails = { ...currentDetails, paypal_email: paypalEmail };

      if (existing) {
        const { error } = await supabase
          .from("creator_profiles")
          .update({
            payout_method: "paypal",
            payout_details: payoutDetails,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("creator_profiles")
          .insert({
            user_id: userId,
            payout_method: "paypal",
            payout_details: payoutDetails,
          });
        if (error) throw error;
      }

      return {
        status: 200,
        body: {
          success: true,
          payout_method: "paypal",
          masked_email: maskEmail(paypalEmail),
        },
      };
    };

    const result = await withIdempotency(req, "creator-payout-method-record", userId, execute);
    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[creator-payout-method-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

function normalizeDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "saved";
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
