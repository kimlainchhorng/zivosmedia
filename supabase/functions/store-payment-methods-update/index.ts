/**
 * store-payment-methods-update
 * ----------------------------
 * Server-gated merchant/admin updates for store payment method metadata.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const PROVIDERS = new Set([
  "aba",
  "wing",
  "acleda",
  "card",
  "confirmed_order",
  "bank_transfer",
  "stripe_connect",
  "square",
  "invoice",
]);

type PaymentMethodInput = {
  provider?: unknown;
  account_number?: unknown;
  account_holder_name?: unknown;
  is_enabled?: unknown;
  qr_code_url?: unknown;
};

type Body = {
  store_id?: unknown;
  methods?: unknown;
};

serve(withSecurity("store-payment-methods-update", async (req, ctx) => {
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

  const authorized = await canManageStore(admin, user.id, storeId);
  if (!authorized) return json({ error: "Not authorized for this store" }, 403);

  const methods = cleanMethods(body.methods, storeId);
  if (!methods.ok) return json({ error: methods.error }, 400);
  if (methods.rows.length === 0) return json({ ok: true, count: 0 });

  const { data, error } = await admin
    .from("store_payment_methods")
    .upsert(methods.rows, { onConflict: "store_id,provider" })
    .select("id, provider, is_enabled");
  if (error) {
    console.error("[store-payment-methods-update:upsert]", error.message);
    return json({ error: "Could not update payment methods" }, 500);
  }

  return json({ ok: true, count: data?.length ?? methods.rows.length, methods: data ?? [] });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-payment-methods-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-payment-methods-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanMethods(value: unknown, storeId: string):
  | { ok: true; rows: Array<Record<string, unknown>> }
  | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "Payment methods are required" };
  if (value.length > 3) return { ok: false, error: "Too many payment methods" };

  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  for (const raw of value as PaymentMethodInput[]) {
    const provider = cleanProvider(raw?.provider);
    if (!provider) return { ok: false, error: "Invalid payment provider" };
    if (seen.has(provider)) return { ok: false, error: "Duplicate payment provider" };
    seen.add(provider);

    const accountNumber = cleanText(raw?.account_number, 0, 80) ?? "";

    rows.push({
      store_id: storeId,
      provider,
      account_number: accountNumber,
      account_holder_name: cleanText(raw?.account_holder_name, 0, 120),
      is_enabled: raw?.is_enabled !== false,
      qr_code_url: cleanText(raw?.qr_code_url, 0, 500) ?? "",
    });
  }

  return { ok: true, rows };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanProvider(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const provider = value.trim().toLowerCase();
  return PROVIDERS.has(provider) ? provider : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value == null) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text || null;
}
