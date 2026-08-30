/**
 * store-payroll-config-update
 * ---------------------------
 * Server-gated owner/admin updates for store payroll formulas.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  store_id?: unknown;
  config?: unknown;
};

serve(withSecurity("store-payroll-config-update", async (req, ctx) => {
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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanUuid(body.store_id);
  if (!storeId) return json({ error: "Invalid store id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  const config = cleanConfig(body.config);
  if (!config.ok) return json({ error: config.error }, 400);

  const { data, error } = await admin
    .from("store_payroll_configs")
    .upsert({ ...config.values, store_id: storeId, currency: "USD" }, { onConflict: "store_id" })
    .select("store_id, base_pay, truck_sales_commission_pct, rides_commission_pct, currency, updated_at")
    .single();
  if (error) {
    console.error("[store-payroll-config-update:upsert]", error.message);
    return json({ error: "Could not save payroll config" }, 500);
  }

  return json({ ok: true, config: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-payroll-config-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-payroll-config-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanConfig(value: unknown):
  | { ok: true; values: Record<string, number> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Payroll config is required" };
  }
  const input = value as Record<string, unknown>;
  const basePay = cleanNumber(input.base_pay, 0, 1_000_000);
  if (basePay === null) return { ok: false, error: "Invalid base pay" };
  const truckPct = cleanNumber(input.truck_sales_commission_pct, 0, 100);
  if (truckPct === null) return { ok: false, error: "Invalid truck sales commission" };
  const ridesPct = cleanNumber(input.rides_commission_pct, 0, 100);
  if (ridesPct === null) return { ok: false, error: "Invalid rides commission" };

  return {
    ok: true,
    values: {
      base_pay: basePay,
      truck_sales_commission_pct: truckPct,
      rides_commission_pct: ridesPct,
    },
  };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 100) / 100;
}
