/**
 * customer-payout-method-record
 * -----------------------------
 * Protected writer for payout destination records. Reads remain RLS-scoped,
 * but create/delete/default changes go through this function so payout
 * identifiers are validated behind MFA and strict CORS.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Action = "create" | "delete" | "set_default";

const allowedRails = new Set(["aba", "bank_wire", "paypal", "stripe", "square", "mercury"]);
const allowedMethods = new Set(["aba", "bank_transfer", "paypal"]);

serve(withSecurity("customer-payout-method-record", async (req, ctx) => {
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

    // Read from a clone: withIdempotency() hashes the request with
    // `await req.clone().text()`, and cloning a Request whose body is already
    // consumed is a spec-mandated TypeError ("unusable"). Reading `req`
    // directly here threw before the payout was ever claimed, and the outer
    // catch reported it as a flat failure.
    const body = await req.clone().json().catch(() => ({}));
    const action = String(body.action || "create") as Action;

    const execute = async () => {
      if (action === "delete") {
        const methodId = String(body.method_id || "").trim();
        if (!methodId) return { status: 400, body: { error: "Missing method_id" } };
        const scope = await assertMethodOwner(supabase, userId, methodId);
        const { error } = await supabase
          .from("customer_payout_methods")
          .delete()
          .eq("id", methodId)
          .eq("user_id", userId);
        if (error) throw error;
        return { status: 200, body: { success: true, deleted: true, id: methodId, store_id: scope.storeId } };
      }

      if (action === "set_default") {
        const methodId = String(body.method_id || "").trim();
        if (!methodId) return { status: 400, body: { error: "Missing method_id" } };
        const scope = await assertMethodOwner(supabase, userId, methodId);
        await clearDefaultMethods(supabase, userId, scope.storeId, scope.methodType);
        const { error } = await supabase
          .from("customer_payout_methods")
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq("id", methodId)
          .eq("user_id", userId);
        if (error) throw error;
        return { status: 200, body: { success: true, id: methodId, store_id: scope.storeId } };
      }

      if (action !== "create") return { status: 400, body: { error: "Invalid action" } };

      const storeId = body.store_id ? String(body.store_id).trim() : null;
      const countryCode = body.country_code ? String(body.country_code).trim().toUpperCase().slice(0, 2) : null;
      const rail = String(body.rail || body.method_type || "").trim();
      const methodType = String(body.method_type || (rail === "aba" ? "aba" : rail === "paypal" ? "paypal" : "bank_transfer")).trim();
      const label = String(body.label || defaultLabel(methodType)).trim().slice(0, 120);
      const bankName = body.bank_name ? String(body.bank_name).trim().slice(0, 120) : null;
      const accountHolder = body.account_holder_name ? String(body.account_holder_name).trim().slice(0, 160) : null;
      const accountNumber = body.account_number ? String(body.account_number).trim().slice(0, 160) : null;
      const abaAccountId = body.aba_account_id ? String(body.aba_account_id).replace(/[\s-]/g, "").trim().slice(0, 40) : null;
      const verificationNote = body.verification_note ? String(body.verification_note).trim().slice(0, 240) : null;
      const shouldDefault = body.is_default === true;

      if (!allowedMethods.has(methodType)) return { status: 400, body: { error: "Invalid payout method type" } };
      if (rail && !allowedRails.has(rail)) return { status: 400, body: { error: "Invalid payout rail" } };
      if (methodType === "aba") {
        if (!accountHolder) return { status: 400, body: { error: "Account holder name is required" } };
        if (!abaAccountId || !/^\+?[0-9]{6,15}$/.test(abaAccountId)) {
          return { status: 400, body: { error: "Enter a valid ABA account number or Bakong phone number" } };
        }
      }
      if (methodType === "bank_transfer") {
        if (!accountHolder || !bankName || !accountNumber) {
          return { status: 400, body: { error: "Bank name, account holder, and account number are required" } };
        }
      }
      if (methodType === "paypal" && (!accountNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountNumber))) {
        return { status: 400, body: { error: "Valid PayPal email required" } };
      }

      if (storeId) await assertCanManageStore(supabase, userId, storeId);

      let countQuery = supabase
        .from("customer_payout_methods")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("method_type", methodType);
      countQuery = storeId ? countQuery.eq("store_id", storeId) : countQuery.is("store_id", null);
      const { count } = await countQuery;
      const isDefault = shouldDefault || (count ?? 0) === 0;
      if (isDefault) await clearDefaultMethods(supabase, userId, storeId, methodType);

      const { data: inserted, error } = await supabase
        .from("customer_payout_methods")
        .insert({
          user_id: userId,
          store_id: storeId,
          country_code: countryCode,
          rail: rail || methodType,
          method_type: methodType,
          label: label || defaultLabel(methodType),
          bank_name: bankName,
          account_holder_name: accountHolder,
          account_number: accountNumber,
          aba_account_id: abaAccountId,
          verification_status: "pending",
          verification_note: verificationNote,
          is_default: isDefault,
        })
        .select("id")
        .single();
      if (error) throw error;

      return { status: 200, body: { success: true, id: (inserted as any).id, is_default: isDefault } };
    };

    const result = action === "create"
      ? await withIdempotency(req, "customer-payout-method-record", userId, execute)
      : { ...(await execute()), cached: false };

    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[customer-payout-method-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function assertMethodOwner(supabase: any, userId: string, methodId: string) {
  const { data: method, error } = await supabase
    .from("customer_payout_methods")
    .select("id,user_id,store_id,method_type")
    .eq("id", methodId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!method) throw new Error("Payout method not found");
  if ((method as any).store_id) await assertCanManageStore(supabase, userId, (method as any).store_id);
  return { storeId: (method as any).store_id ?? null, methodType: (method as any).method_type };
}

async function assertCanManageStore(supabase: any, userId: string, storeId: string) {
  const { data: store } = await supabase
    .from("store_profiles")
    .select("id,owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if ((store as any)?.owner_id === userId) return;
  throw new Error("Not authorized for this store");
}

async function clearDefaultMethods(supabase: any, userId: string, storeId: string | null, methodType: string) {
  let query = supabase
    .from("customer_payout_methods")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("method_type", methodType);
  query = storeId ? query.eq("store_id", storeId) : query.is("store_id", null);
  const { error } = await query;
  if (error) throw error;
}

function defaultLabel(methodType: string) {
  if (methodType === "aba") return "ABA Account";
  if (methodType === "paypal") return "PayPal";
  return "Bank Account";
}
