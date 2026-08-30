/**
 * salon-loyalty-manage
 * --------------------
 * Owner/admin mutation gate for loyalty settings and manual point events.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["update_settings", "add_event"]);
const EVENT_TYPES = new Set(["earn", "redeem", "adjust"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  settings?: unknown;
  event?: unknown;
};

serve(withSecurity("salon-loyalty-manage", async (req, ctx) => {
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
  const storeId = cleanUuid(body.store_id);
  if (!action) return json({ error: "Invalid loyalty action" }, 400);
  if (!storeId) return json({ error: "Invalid store id" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "update_settings") {
    const settings = cleanSettings(body.settings);
    if (!settings.ok) return json({ error: settings.error }, 400);
    const { data, error } = await admin
      .from("salon_loyalty_settings")
      .upsert({ store_id: storeId, ...settings.values }, { onConflict: "store_id" })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-loyalty-manage:update-settings]", error.message);
      return json({ error: "Could not save loyalty settings" }, 500);
    }
    return json({ ok: true, settings: data });
  }

  const event = await cleanEvent(admin, body.event, storeId);
  if (!event.ok) return json({ error: event.error }, 400);

  const { data, error } = await admin
    .from("salon_loyalty_events")
    .insert({ ...event.values, store_id: storeId, created_by_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[salon-loyalty-manage:add-event]", error.message);
    return json({ error: "Could not record loyalty event" }, 500);
  }
  return json({ ok: true, event: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-loyalty-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-loyalty-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanSettings(value: unknown):
  | { ok: true; values: Record<string, boolean | number> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Settings payload is required" };
  }
  const input = value as Record<string, unknown>;
  const pointsPerDollar = cleanNumber(input.points_per_dollar, 0, 100);
  const redemptionValue = cleanInteger(input.redemption_value_cents_per_point, 0, 10_000);
  const welcomePoints = cleanInteger(input.welcome_points, 0, 1_000_000);
  const birthdayPoints = cleanInteger(input.birthday_points, 0, 1_000_000);
  if (pointsPerDollar === null || redemptionValue === null || welcomePoints === null || birthdayPoints === null) {
    return { ok: false, error: "Invalid loyalty settings" };
  }
  return {
    ok: true,
    values: {
      is_enabled: typeof input.is_enabled === "boolean" ? input.is_enabled : false,
      points_per_dollar: pointsPerDollar,
      redemption_value_cents_per_point: redemptionValue,
      welcome_points: welcomePoints,
      birthday_points: birthdayPoints,
    },
  };
}

async function cleanEvent(admin: any, value: unknown, storeId: string):
  Promise<
    | { ok: true; values: Record<string, string | number | null> }
    | { ok: false; error: string }
  > {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Event payload is required" };
  }
  const input = value as Record<string, unknown>;
  const clientId = cleanUuid(input.client_id);
  if (!clientId) return { ok: false, error: "Invalid client id" };

  const { data: client, error: clientError } = await admin
    .from("salon_clients")
    .select("id, loyalty_points")
    .eq("id", clientId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (clientError) {
    console.error("[salon-loyalty-manage:client]", clientError.message);
    return { ok: false, error: "Could not verify client" };
  }
  if (!client) return { ok: false, error: "Client does not belong to this store" };

  const eventType = cleanEventType(input.event_type);
  const pointsDelta = cleanInteger(input.points_delta, -1_000_000, 1_000_000);
  if (!eventType || pointsDelta === null || pointsDelta === 0) return { ok: false, error: "Invalid point adjustment" };
  if (eventType === "redeem" && pointsDelta > 0) return { ok: false, error: "Redeem events must subtract points" };
  if (eventType === "earn" && pointsDelta < 0) return { ok: false, error: "Earn events must add points" };
  if (pointsDelta < 0 && Math.abs(pointsDelta) > Number(client.loyalty_points ?? 0)) {
    return { ok: false, error: "Cannot redeem more points than the client has" };
  }

  return {
    ok: true,
    values: {
      client_id: clientId,
      event_type: eventType,
      points_delta: pointsDelta,
      reason: cleanNullableText(input.reason, 200),
      booking_id: null,
    },
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanEventType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  return EVENT_TYPES.has(type) ? type : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}
