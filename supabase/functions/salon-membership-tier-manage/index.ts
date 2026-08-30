/**
 * salon-membership-tier-manage
 * ----------------------------
 * Owner/admin mutation gate for salon membership tier catalog rows. Stripe
 * Product/Price syncing remains delegated to sync-salon-membership-tier after
 * a successful save.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);
const BILLING_INTERVALS = new Set(["month", "year"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  tier_id?: unknown;
  tier?: unknown;
};

type TierValues = {
  name: string;
  description: string | null;
  monthly_price_cents: number;
  billing_interval: "month" | "year";
  service_discount_percent: number;
  is_active: boolean;
};

serve(withSecurity("salon-membership-tier-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid tier action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const tier = cleanTier(body.tier);
    if (!tier.ok) return json({ error: tier.error }, 400);
    const sortOrder = await nextSortOrder(admin, storeId);

    const { data, error } = await admin
      .from("salon_membership_tiers")
      .insert({ ...tier.values, store_id: storeId, sort_order: sortOrder })
      .select("id")
      .single();
    if (error) {
      console.error("[salon-membership-tier-manage:create]", error.message);
      return json({ error: "Could not create tier" }, 500);
    }
    return json({ ok: true, tier_id: data.id });
  }

  const tierId = cleanUuid(body.tier_id);
  if (!tierId) return json({ error: "Invalid tier id" }, 400);

  const existing = await getTier(admin, tierId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_membership_tiers")
      .delete()
      .eq("id", tierId)
      .eq("store_id", existing.data.store_id);
    if (error) {
      console.error("[salon-membership-tier-manage:delete]", error.message);
      return json({ error: "Could not delete tier. Cancel or move subscribers first." }, 409);
    }
    return json({ ok: true, tier_id: tierId });
  }

  const tier = cleanTier(body.tier);
  if (!tier.ok) return json({ error: tier.error }, 400);

  const priceChanged =
    existing.data.monthly_price_cents !== tier.values.monthly_price_cents ||
    existing.data.billing_interval !== tier.values.billing_interval;
  const patch: Record<string, unknown> = { ...tier.values };
  if (priceChanged) patch.stripe_price_id = null;

  const { error } = await admin
    .from("salon_membership_tiers")
    .update(patch)
    .eq("id", tierId)
    .eq("store_id", existing.data.store_id);
  if (error) {
    console.error("[salon-membership-tier-manage:update]", error.message);
    return json({ error: "Could not update tier" }, 500);
  }
  return json({ ok: true, tier_id: tierId, price_reset: priceChanged });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-membership-tier-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-membership-tier-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getTier(admin: any, tierId: string): Promise<
  | { ok: true; data: { id: string; store_id: string; monthly_price_cents: number; billing_interval: "month" | "year" } }
  | { ok: false; error: string; status: number }
> {
  const { data, error } = await admin
    .from("salon_membership_tiers")
    .select("id, store_id, monthly_price_cents, billing_interval")
    .eq("id", tierId)
    .maybeSingle();
  if (error) {
    console.error("[salon-membership-tier-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify tier", status: 500 };
  }
  if (!data) return { ok: false, error: "Tier not found", status: 404 };
  return { ok: true, data: data as { id: string; store_id: string; monthly_price_cents: number; billing_interval: "month" | "year" } };
}

async function nextSortOrder(admin: any, storeId: string): Promise<number> {
  const { data, error } = await admin
    .from("salon_membership_tiers")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[salon-membership-tier-manage:sort]", error.message);
    return 0;
  }
  return Number.isFinite(data?.sort_order) ? Number(data.sort_order) + 10 : 0;
}

function cleanTier(value: unknown): { ok: true; values: TierValues } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Tier payload is required" };
  }
  const input = value as Record<string, unknown>;
  const name = cleanText(input.name, 1, 120);
  if (!name) return { ok: false, error: "Name is required" };

  const monthlyPriceCents = cleanInt(input.monthly_price_cents, 1, 10_000_000);
  if (monthlyPriceCents === null) return { ok: false, error: "Invalid membership price" };

  const billingInterval = typeof input.billing_interval === "string" && BILLING_INTERVALS.has(input.billing_interval)
    ? input.billing_interval as "month" | "year"
    : null;
  if (!billingInterval) return { ok: false, error: "Invalid billing interval" };

  const serviceDiscountPercent = cleanInt(input.service_discount_percent, 0, 100);
  if (serviceDiscountPercent === null) return { ok: false, error: "Invalid service discount" };

  if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };

  return {
    ok: true,
    values: {
      name,
      description: cleanNullableText(input.description, 500),
      monthly_price_cents: monthlyPriceCents,
      billing_interval: billingInterval,
      service_discount_percent: serviceDiscountPercent,
      is_active: input.is_active,
    },
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.length <= maxLength ? text : null;
}
