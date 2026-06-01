/**
 * salon-stylist-manage
 * --------------------
 * Owner/admin mutation gate for salon stylists and their service assignments.
 * Public active-stylist reads remain available for booking surfaces.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  stylist_id?: unknown;
  stylist?: unknown;
};

type StylistValues = {
  display_name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  commission_percent: number;
  user_id: string | null;
  is_active: boolean;
  sort_order?: number;
};

serve(withSecurity("salon-stylist-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid stylist action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const stylist = await cleanStylist(admin, body.stylist, storeId, { partial: false, allowUserId: true });
    if (!stylist.ok) return json({ error: stylist.error }, 400);
    const sortOrder = await nextSortOrder(admin, storeId);

    const { service_ids, ...values } = stylist.values;
    const { data, error } = await admin
      .from("salon_stylists")
      .insert({ ...values, store_id: storeId, sort_order: sortOrder })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-stylist-manage:create]", error.message);
      return json({ error: "Could not add stylist" }, 500);
    }
    await replaceStylistServices(admin, data.id, service_ids ?? []);
    return json({ ok: true, stylist: { ...data, service_ids: service_ids ?? [] } });
  }

  const stylistId = cleanUuid(body.stylist_id);
  if (!stylistId) return json({ error: "Invalid stylist id" }, 400);

  const existing = await getStylist(admin, stylistId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_stylists")
      .delete()
      .eq("id", stylistId)
      .eq("store_id", existing.data.store_id);
    if (error) {
      console.error("[salon-stylist-manage:delete]", error.message);
      return json({ error: "Could not delete stylist" }, 409);
    }
    return json({ ok: true, stylist_id: stylistId });
  }

  const stylist = await cleanStylist(admin, body.stylist, existing.data.store_id, { partial: true, allowUserId: false });
  if (!stylist.ok) return json({ error: stylist.error }, 400);
  const { service_ids, ...values } = stylist.values;
  if (Object.keys(values).length === 0 && service_ids === undefined) return json({ error: "No stylist changes provided" }, 400);

  let updated = existing.data;
  if (Object.keys(values).length > 0) {
    const { data, error } = await admin
      .from("salon_stylists")
      .update(values)
      .eq("id", stylistId)
      .eq("store_id", existing.data.store_id)
      .select("*")
      .single();
    if (error) {
      console.error("[salon-stylist-manage:update]", error.message);
      return json({ error: "Could not update stylist" }, 500);
    }
    updated = data;
  }
  if (service_ids !== undefined) {
    await replaceStylistServices(admin, stylistId, service_ids);
  }
  const finalServiceIds = service_ids ?? await listStylistServiceIds(admin, stylistId);
  return json({ ok: true, stylist: { ...updated, service_ids: finalServiceIds } });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-stylist-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-stylist-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getStylist(admin: any, stylistId: string):
  Promise<{ ok: true; data: Record<string, unknown> & { id: string; store_id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_stylists")
    .select("*")
    .eq("id", stylistId)
    .maybeSingle();
  if (error) {
    console.error("[salon-stylist-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify stylist", status: 500 };
  }
  if (!data) return { ok: false, error: "Stylist not found", status: 404 };
  return { ok: true, data };
}

async function nextSortOrder(admin: any, storeId: string): Promise<number> {
  const { data, error } = await admin
    .from("salon_stylists")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[salon-stylist-manage:sort]", error.message);
    return 0;
  }
  return Number.isFinite(data?.sort_order) ? Number(data.sort_order) + 10 : 0;
}

async function replaceStylistServices(admin: any, stylistId: string, serviceIds: string[]): Promise<void> {
  const { error: deleteError } = await admin
    .from("salon_stylist_services")
    .delete()
    .eq("stylist_id", stylistId);
  if (deleteError) throw deleteError;
  if (serviceIds.length === 0) return;

  const { error: insertError } = await admin
    .from("salon_stylist_services")
    .insert(serviceIds.map((service_id) => ({ stylist_id: stylistId, service_id })));
  if (insertError) throw insertError;
}

async function listStylistServiceIds(admin: any, stylistId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("salon_stylist_services")
    .select("service_id")
    .eq("stylist_id", stylistId);
  if (error) {
    console.error("[salon-stylist-manage:service_ids]", error.message);
    return [];
  }
  return (data ?? []).map((row: { service_id: string }) => row.service_id);
}

async function cleanStylist(
  admin: any,
  value: unknown,
  storeId: string,
  options: { partial: boolean; allowUserId: boolean },
): Promise<{ ok: true; values: Partial<StylistValues> & { service_ids?: string[] } } | { ok: false; error: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Stylist payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Partial<StylistValues> & { service_ids?: string[] } = {};

  if (!options.partial || input.display_name !== undefined) {
    const displayName = cleanText(input.display_name, 1, 80);
    if (!displayName) return { ok: false, error: "Stylist name is required" };
    values.display_name = displayName;
  }
  if (!options.partial || input.title !== undefined) {
    const title = cleanNullableText(input.title, 60);
    if (title === undefined) return { ok: false, error: "Stylist title is too long" };
    values.title = title;
  }
  if (!options.partial || input.bio !== undefined) {
    const bio = cleanNullableText(input.bio, 500);
    if (bio === undefined) return { ok: false, error: "Stylist bio is too long" };
    values.bio = bio;
  }
  if (!options.partial || input.photo_url !== undefined) {
    const photoUrl = cleanNullableText(input.photo_url, 2_000);
    if (photoUrl === undefined) return { ok: false, error: "Photo URL is too long" };
    values.photo_url = photoUrl;
  }
  if (!options.partial || input.email !== undefined) {
    const email = cleanNullableText(input.email, 254);
    if (email === undefined) return { ok: false, error: "Email is too long" };
    values.email = email;
  }
  if (!options.partial || input.phone !== undefined) {
    const phone = cleanNullableText(input.phone, 30);
    if (phone === undefined) return { ok: false, error: "Phone is too long" };
    values.phone = phone;
  }
  if (!options.partial || input.commission_percent !== undefined) {
    const commission = cleanNumber(input.commission_percent, 0, 100);
    if (commission === null) return { ok: false, error: "Invalid commission percent" };
    values.commission_percent = commission;
  }
  if (options.allowUserId && (!options.partial || input.user_id !== undefined)) {
    const userId = cleanUuidOrNull(input.user_id);
    if (userId === undefined) return { ok: false, error: "Invalid stylist user id" };
    values.user_id = userId;
  }
  if (!options.partial || input.is_active !== undefined) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }
  if (input.service_ids !== undefined) {
    const serviceIds = cleanUuidList(input.service_ids, 100);
    if (!serviceIds) return { ok: false, error: "Invalid service assignments" };
    if (!await servicesBelongToStore(admin, serviceIds, storeId)) {
      return { ok: false, error: "One or more services do not belong to this store" };
    }
    values.service_ids = serviceIds;
  } else if (!options.partial) {
    values.service_ids = [];
  }

  return { ok: true, values };
}

async function servicesBelongToStore(admin: any, serviceIds: string[], storeId: string): Promise<boolean> {
  if (serviceIds.length === 0) return true;
  const { data, error } = await admin
    .from("salon_services")
    .select("id")
    .eq("store_id", storeId)
    .in("id", serviceIds);
  if (error) {
    console.error("[salon-stylist-manage:services]", error.message);
    return false;
  }
  return (data ?? []).length === serviceIds.length;
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

function cleanUuidOrNull(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value) ?? undefined;
}

function cleanUuidList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const ids = Array.from(new Set(value.map(cleanUuid).filter((id): id is string => Boolean(id))));
  return ids.length === value.length ? ids : null;
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

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return Math.round(value * 100) / 100;
}
