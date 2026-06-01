/**
 * ar-payout-record
 * ----------------
 * Server-side gate for auto-repair finance payout records. This keeps payout
 * ledger writes behind owner/admin checks, MFA step-up, strict CORS, and
 * idempotency for create actions.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Action = "create" | "delete";

serve(withSecurity("ar-payout-record", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Invalid auth");
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "create") as Action;
    if (action !== "create" && action !== "delete") {
      return json({ error: "Invalid action" }, 400);
    }

    const execute = async () => {
      if (action === "delete") {
        const payoutId = String(body.payout_id || "").trim();
        if (!payoutId) return { status: 400, body: { error: "Missing payout_id" } };

        const { data: existing, error: existingError } = await supabase
          .from("ar_payouts")
          .select("id,store_id")
          .eq("id", payoutId)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) return { status: 200, body: { success: true, deleted: false } };

        await assertCanManageStore(supabase, userId, (existing as any).store_id);

        const { error: deleteError } = await supabase
          .from("ar_payouts")
          .delete()
          .eq("id", payoutId)
          .eq("store_id", (existing as any).store_id);
        if (deleteError) throw deleteError;

        return { status: 200, body: { success: true, deleted: true, id: payoutId } };
      }

      const storeId = String(body.store_id || "").trim();
      const payoutDate = String(body.payout_date || "").trim();
      const amountCents = Math.round(Number(body.amount_cents || 0));
      const source = body.source ? String(body.source).trim().slice(0, 120) : null;
      const reference = body.reference ? String(body.reference).trim().slice(0, 160) : null;

      if (!storeId || !payoutDate || !amountCents) {
        return { status: 400, body: { error: "Missing required fields" } };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payoutDate)) {
        return { status: 400, body: { error: "Invalid payout date" } };
      }
      if (amountCents <= 0) {
        return { status: 400, body: { error: "Amount must be greater than zero" } };
      }
      if (amountCents > 1_000_000_00) {
        return { status: 400, body: { error: "Amount exceeds maximum" } };
      }

      await assertCanManageStore(supabase, userId, storeId);

      const { data: inserted, error: insertError } = await supabase
        .from("ar_payouts")
        .insert({
          store_id: storeId,
          payout_date: payoutDate,
          amount_cents: amountCents,
          source,
          reference,
          created_by: userId,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      return { status: 200, body: { success: true, id: (inserted as any).id } };
    };

    const result = action === "create"
      ? await withIdempotency(req, "ar-payout-record", userId, execute)
      : { ...(await execute()), cached: false };

    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[ar-payout-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function assertCanManageStore(supabase: any, userId: string, storeId: string) {
  const { data: role } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (role === true) return;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id,owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if ((restaurant as any)?.owner_id === userId) return;

  const { data: store } = await supabase
    .from("store_profiles")
    .select("id,owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if ((store as any)?.owner_id === userId) return;

  throw new Error("Not authorized for this store");
}
