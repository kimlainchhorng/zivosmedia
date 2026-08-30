/**
 * salon-service-manage
 * --------------------
 * Owner/admin mutation gate for the salon service menu. Public active-service
 * reads stay Data API/RPC-backed for booking surfaces.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  service_id?: unknown;
  service?: unknown;
};

type ServiceValues = {
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price_cents: number;
  image_url: string | null;
  is_active: boolean;
  sort_order?: number;
};

serve(withSecurity("salon-service-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid service action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const service = cleanService(body.service, { allowSortOrder: false });
    if (!service.ok) return json({ error: service.error }, 400);
    const sortOrder = await nextSortOrder(admin, storeId);

    const { data, error } = await admin
      .from("salon_services")
      .insert({ ...service.values, store_id: storeId, sort_order: sortOrder })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-service-manage:create]", error.message);
      return json({ error: "Could not create service" }, 500);
    }
    return json({ ok: true, service: data });
  }

  const serviceId = cleanUuid(body.service_id);
  if (!serviceId) return json({ error: "Invalid service id" }, 400);

  const existing = await getService(admin, serviceId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_services")
      .delete()
      .eq("id", serviceId)
      .eq("store_id", existing.data.store_id);
    if (error) {
      console.error("[salon-service-manage:delete]", error.message);
      return json({ error: "Could not delete service" }, 409);
    }
    return json({ ok: true, service_id: serviceId });
  }

  const service = cleanService(body.service, { allowSortOrder: true, partial: true });
  if (!service.ok) return json({ error: service.error }, 400);
  if (Object.keys(service.values).length === 0) return json({ error: "No service changes provided" }, 400);

  const { data, error } = await admin
    .from("salon_services")
    .update(service.values)
    .eq("id", serviceId)
    .eq("store_id", existing.data.store_id)
    .select("*")
    .single();
  if (error) {
    console.error("[salon-service-manage:update]", error.message);
    return json({ error: "Could not update service" }, 500);
  }
  return json({ ok: true, service: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-service-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-service-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getService(admin: any, serviceId: string):
  Promise<{ ok: true; data: { id: string; store_id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_services")
    .select("id, store_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) {
    console.error("[salon-service-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify service", status: 500 };
  }
  if (!data) return { ok: false, error: "Service not found", status: 404 };
  return { ok: true, data };
}

async function nextSortOrder(admin: any, storeId: string): Promise<number> {
  const { data, error } = await admin
    .from("salon_services")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[salon-service-manage:sort]", error.message);
    return 0;
  }
  return Number.isFinite(data?.sort_order) ? Number(data.sort_order) + 10 : 0;
}

function cleanService(
  value: unknown,
  options: { allowSortOrder: boolean; partial?: boolean },
): { ok: true; values: Partial<ServiceValues> } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Service payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Partial<ServiceValues> = {};

  if (!options.partial || input.name !== undefined) {
    const name = cleanText(input.name, 1, 80);
    if (!name) return { ok: false, error: "Service name is required" };
    values.name = name;
  }
  if (!options.partial || input.description !== undefined) {
    const description = cleanNullableText(input.description, 500);
    if (description === undefined) return { ok: false, error: "Service description is too long" };
    values.description = description;
  }
  if (!options.partial || input.category !== undefined) {
    const category = cleanNullableText(input.category, 40);
    if (category === undefined) return { ok: false, error: "Service category is too long" };
    values.category = category;
  }
  if (!options.partial || input.duration_minutes !== undefined) {
    const duration = cleanInt(input.duration_minutes, 5, 480);
    if (duration === null) return { ok: false, error: "Invalid service duration" };
    values.duration_minutes = duration;
  }
  if (!options.partial || input.price_cents !== undefined) {
    const price = cleanInt(input.price_cents, 0, 10_000_000);
    if (price === null) return { ok: false, error: "Invalid service price" };
    values.price_cents = price;
  }
  if (!options.partial || input.image_url !== undefined) {
    const imageUrl = cleanNullableText(input.image_url, 2_000);
    if (imageUrl === undefined) return { ok: false, error: "Service image URL is too long" };
    values.image_url = imageUrl;
  }
  if (!options.partial || input.is_active !== undefined) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid service active status" };
    values.is_active = input.is_active;
  }
  if (options.allowSortOrder && input.sort_order !== undefined) {
    const sortOrder = cleanInt(input.sort_order, -1_000_000, 1_000_000);
    if (sortOrder === null) return { ok: false, error: "Invalid service sort order" };
    values.sort_order = sortOrder;
  }
  return { ok: true, values };
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

function cleanNullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  return text.length <= maxLength ? text : undefined;
}
