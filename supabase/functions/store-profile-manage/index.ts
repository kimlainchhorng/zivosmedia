/**
 * store-profile-manage
 * --------------------
 * Server-gated merchant/admin mutations for store profile identity and media.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "update", "delete", "assign_owner"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  profile?: unknown;
  owner_id?: unknown;
};

serve(withSecurity("store-profile-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid store profile action" }, 400);

  const isAdmin = await hasAdminRole(admin, user.id);
  const storeId = cleanUuid(body.store_id);

  if (action === "delete") {
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!isAdmin) return json({ error: "Admin access required" }, 403);
    const { error } = await admin.from("store_profiles").delete().eq("id", storeId);
    if (error) {
      console.error("[store-profile-manage:delete]", error.message);
      return json({ error: "Could not delete store" }, 500);
    }
    return json({ ok: true, store_id: storeId });
  }

  if (action === "assign_owner") {
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!isAdmin) return json({ error: "Admin access required" }, 403);
    const ownerId = cleanUuid(body.owner_id);
    if (!ownerId) return json({ error: "Invalid owner id" }, 400);
    const { data, error } = await admin
      .from("store_profiles")
      .update({ owner_id: ownerId })
      .eq("id", storeId)
      .select("id, owner_id")
      .single();
    if (error) {
      console.error("[store-profile-manage:assign-owner]", error.message);
      return json({ error: "Could not assign owner" }, 500);
    }
    return json({ ok: true, store: data });
  }

  const profile = cleanProfile(body.profile, isAdmin);
  if (!profile.ok) return json({ error: profile.error }, 400);

  if (storeId) {
    if (!isAdmin && !await ownsStore(admin, user.id, storeId)) {
      return json({ error: "Not authorized for this store" }, 403);
    }
    const update = isAdmin ? profile.values : { ...profile.values, owner_id: user.id };
    const { data, error } = await admin
      .from("store_profiles")
      .update(update)
      .eq("id", storeId)
      .select("id, owner_id, setup_complete")
      .single();
    if (error) {
      console.error("[store-profile-manage:update]", error.message);
      if (error.code === "23505") return json({ error: "That handle (store URL) is already taken" }, 409);
      return json({ error: "Could not update store profile" }, 500);
    }
    return json({ ok: true, store: data });
  }

  if (!isAdmin && profile.values.owner_id !== user.id) {
    return json({ error: "Store owner mismatch" }, 403);
  }
  const insert = isAdmin ? profile.values : { ...profile.values, owner_id: user.id };
  const { data, error } = await admin
    .from("store_profiles")
    .insert(insert)
    .select("id, owner_id, setup_complete")
    .single();
  if (error) {
    console.error("[store-profile-manage:create]", error.message);
    if (error.code === "23505") return json({ error: "That handle (store URL) is already taken" }, 409);
    return json({ error: "Could not create store profile" }, 500);
  }
  return json({ ok: true, store: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function ownsStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[store-profile-manage:owner-check]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

async function hasAdminRole(admin: any, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) {
    console.error("[store-profile-manage:role]", error.message);
    return false;
  }
  return Boolean(data);
}

function cleanProfile(value: unknown, isAdmin: boolean):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Store profile payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const [field, max] of [
    ["name", 180],
    ["slug", 120],
    ["description", 5000],
    ["logo_url", 1000],
    ["banner_url", 1000],
    ["market", 20],
    ["category", 120],
    ["default_language", 12],
    ["address", 500],
    ["phone", 80],
    ["hours", 12000],
    ["facebook_url", 1000],
    ["instagram_url", 1000],
    ["telegram_url", 1000],
    ["tiktok_url", 1000],
    ["booking_start_time", 40],
    ["booking_end_time", 40],
    ["booking_duration", 20],
    ["booking_note", 1000],
    ["seo_title", 180],
    ["seo_description", 500],
  ] as const) {
    if (field in input) values[field] = cleanText(input[field], 0, max);
  }

  for (const [field, min, max] of [
    ["rating", 0, 5],
    ["delivery_min", 0, 10000],
    ["khr_rate", 0, 100000],
    ["latitude", -90, 90],
    ["longitude", -180, 180],
    ["banner_position", 0, 100],
  ] as const) {
    if (field in input) values[field] = cleanNumber(input[field], min, max);
  }

  for (const field of ["setup_complete", "is_active", "accepts_orders"] as const) {
    if (field in input) values[field] = input[field] === true;
  }

  if ("owner_id" in input) {
    const ownerId = cleanUuid(input.owner_id);
    if (ownerId && isAdmin) values.owner_id = ownerId;
    if (ownerId && !isAdmin) values.owner_id = ownerId;
  }
  if ("booking_days" in input) values.booking_days = cleanStringArray(input.booking_days, 7, 20);
  if ("gallery_images" in input) values.gallery_images = cleanStringArray(input.gallery_images, 20, 1000);
  if ("gallery_positions" in input) values.gallery_positions = cleanJsonObject(input.gallery_positions);
  if ("ar_settings" in input) values.ar_settings = cleanJsonObject(input.ar_settings);

  if (typeof values.name === "string" && values.name.length === 0) return { ok: false, error: "Store name is required" };
  if (typeof values.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    return { ok: false, error: "Invalid store slug" };
  }

  return { ok: true, values };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength)
    .slice(0, maxItems);
}

function cleanJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
