/**
 * zivo-payment-method-manage
 * --------------------------
 * Server-gated management for saved ZIVO payment-method metadata.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  payment_method_id?: unknown;
};

serve(withSecurity("zivo-payment-method-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const paymentMethodId = cleanUuid(body.payment_method_id);
  if (!paymentMethodId) return json({ error: "Invalid payment method id" }, 400);

  if (body.action === "delete") {
    const { data, error } = await admin
      .from("zivo_payment_methods")
      .delete()
      .eq("id", paymentMethodId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[zivo-payment-method-manage:delete]", error.message);
      return json({ error: "Could not remove payment method" }, 500);
    }
    if (!data) return json({ error: "Payment method not found" }, 404);
    return json({ ok: true, id: data.id });
  }

  if (body.action === "set_default") {
    const { data: owned, error: ownedError } = await admin
      .from("zivo_payment_methods")
      .select("id")
      .eq("id", paymentMethodId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedError) {
      console.error("[zivo-payment-method-manage:lookup]", ownedError.message);
      return json({ error: "Could not verify payment method" }, 500);
    }
    if (!owned) return json({ error: "Payment method not found" }, 404);

    const { error: clearError } = await admin
      .from("zivo_payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (clearError) {
      console.error("[zivo-payment-method-manage:clear-default]", clearError.message);
      return json({ error: "Could not update payment method" }, 500);
    }

    const { error } = await admin
      .from("zivo_payment_methods")
      .update({ is_default: true })
      .eq("id", paymentMethodId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[zivo-payment-method-manage:set-default]", error.message);
      return json({ error: "Could not update payment method" }, 500);
    }

    return json({ ok: true, id: paymentMethodId });
  }

  return json({ error: "Invalid action" }, 400);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}
