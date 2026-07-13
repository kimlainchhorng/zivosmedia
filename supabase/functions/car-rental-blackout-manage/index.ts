/**
 * car-rental-blackout-manage
 * --------------------------
 * Server-gated owner/admin create/delete for vehicle blackout windows.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete"]);
const CATEGORIES = new Set(["maintenance", "reserved", "holiday", "personal", "other"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  blackout_id?: unknown;
  blackout?: unknown;
};

serve(withSecurity("car-rental-blackout-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid blackout action" }, 400);

  const blackoutId = cleanUuid(body.blackout_id);
  const existing = action === "create" ? null : await getBlackout(admin, blackoutId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or blackout id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_vehicle_blackouts")
      .delete()
      .eq("id", blackoutId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-blackout-manage:delete]", error.message);
      return json({ error: "Could not delete blackout" }, 500);
    }
    return json({ ok: true, blackout_id: blackoutId });
  }

  const blackout = cleanBlackout(body.blackout);
  if (!blackout.ok) return json({ error: blackout.error }, 400);
  if (!await vehicleBelongsToStore(admin, blackout.values.vehicle_id as string, storeId)) {
    return json({ error: "Invalid vehicle for this store" }, 400);
  }

  const { data, error } = await admin
    .from("car_rental_vehicle_blackouts")
    .insert({ ...blackout.values, store_id: storeId, created_by_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-blackout-manage:create]", error.message);
    if (error.code === "23P01") return json({ error: "Blackout overlaps an existing window for this vehicle" }, 409);
    return json({ error: "Could not create blackout" }, 500);
  }
  return json({ ok: true, blackout: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-blackout-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-blackout-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getBlackout(admin: any, blackoutId: string | null): Promise<{ store_id: string } | null> {
  if (!blackoutId) return null;
  const { data, error } = await admin
    .from("car_rental_vehicle_blackouts")
    .select("store_id")
    .eq("id", blackoutId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-blackout-manage:blackout-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function vehicleBelongsToStore(admin: any, vehicleId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("car_rental_vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-blackout-manage:vehicle]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanBlackout(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Blackout payload is required" };
  }
  const input = value as Record<string, unknown>;
  const vehicleId = cleanUuid(input.vehicle_id);
  if (!vehicleId) return { ok: false, error: "Vehicle is required" };
  const startsAt = cleanIso(input.starts_at);
  const endsAt = cleanIso(input.ends_at);
  if (!startsAt || !endsAt) return { ok: false, error: "Invalid blackout dates" };
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "Blackout end must be after start" };
  }
  const category = typeof input.category === "string" && CATEGORIES.has(input.category.trim().toLowerCase())
    ? input.category.trim().toLowerCase()
    : "other";
  const reason = cleanText(input.reason, 0, 250);
  if ("reason" in input && reason === null && typeof input.reason === "string" && input.reason.trim().length > 250) {
    return { ok: false, error: "Blackout reason is too long" };
  }
  return {
    ok: true,
    values: {
      vehicle_id: vehicleId,
      starts_at: startsAt,
      ends_at: endsAt,
      category,
      reason,
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

function cleanIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
