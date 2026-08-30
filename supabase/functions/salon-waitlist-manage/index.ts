/**
 * salon-waitlist-manage
 * ---------------------
 * Owner/admin mutation gate for salon waitlist rows. Browser reads stay
 * owner-scoped by RLS; create/status/delete writes are validated here.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "set_status", "delete"]);
const STATUSES = new Set(["waiting", "notified", "booked", "cancelled"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  waitlist_id?: unknown;
  status?: unknown;
  entry?: unknown;
};

serve(withSecurity("salon-waitlist-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid waitlist action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const entry = await cleanEntry(admin, body.entry, storeId);
    if (!entry.ok) return json({ error: entry.error }, 400);

    const { data, error } = await admin
      .from("salon_waitlist")
      .insert({ ...entry.values, store_id: storeId, status: "waiting" })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-waitlist-manage:create]", error.message);
      return json({ error: "Could not add waitlist entry" }, 500);
    }
    return json({ ok: true, entry: data });
  }

  const waitlistId = cleanUuid(body.waitlist_id);
  if (!waitlistId) return json({ error: "Invalid waitlist id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("salon_waitlist")
    .select("id, store_id")
    .eq("id", waitlistId)
    .maybeSingle();
  if (lookupError) {
    console.error("[salon-waitlist-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify waitlist entry" }, 500);
  }
  if (!existing) return json({ error: "Waitlist entry not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "set_status") {
    const status = cleanStatus(body.status);
    if (!status) return json({ error: "Invalid waitlist status" }, 400);
    const { data, error } = await admin
      .from("salon_waitlist")
      .update({ status })
      .eq("id", existing.id)
      .eq("store_id", existing.store_id)
      .select("*")
      .single();
    if (error) {
      console.error("[salon-waitlist-manage:set-status]", error.message);
      return json({ error: "Could not update waitlist status" }, 500);
    }
    return json({ ok: true, entry: data });
  }

  const { error } = await admin
    .from("salon_waitlist")
    .delete()
    .eq("id", existing.id)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[salon-waitlist-manage:delete]", error.message);
    return json({ error: "Could not delete waitlist entry" }, 500);
  }
  return json({ ok: true, waitlist_id: existing.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-waitlist-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-waitlist-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function cleanEntry(admin: any, value: unknown, storeId: string):
  Promise<
    | { ok: true; values: Record<string, string | null> }
    | { ok: false; error: string }
  > {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Waitlist entry is required" };
  }
  const input = value as Record<string, unknown>;

  const clientId = cleanOptionalUuid(input.client_id);
  let clientName = cleanText(input.client_name, 1, 120);
  let clientPhone = cleanNullableText(input.client_phone, 30);
  if (input.client_id && !clientId) return { ok: false, error: "Invalid client id" };
  if (clientId) {
    const client = await getStoreRow(admin, "salon_clients", clientId, storeId, "id, display_name, phone");
    if (!client) return { ok: false, error: "Client does not belong to this store" };
    clientName = client.display_name;
    clientPhone = client.phone ?? clientPhone;
  }
  if (!clientName) return { ok: false, error: "Client name is required" };

  const serviceId = cleanOptionalUuid(input.requested_service_id);
  const stylistId = cleanOptionalUuid(input.requested_stylist_id);
  if (input.requested_service_id && !serviceId) return { ok: false, error: "Invalid service id" };
  if (input.requested_stylist_id && !stylistId) return { ok: false, error: "Invalid stylist id" };

  const service = serviceId ? await getStoreRow(admin, "salon_services", serviceId, storeId, "id, name") : null;
  if (serviceId && !service) return { ok: false, error: "Service does not belong to this store" };
  const stylist = stylistId ? await getStoreRow(admin, "salon_stylists", stylistId, storeId, "id, display_name") : null;
  if (stylistId && !stylist) return { ok: false, error: "Stylist does not belong to this store" };

  return {
    ok: true,
    values: {
      client_id: clientId,
      client_name: clientName,
      client_phone: clientPhone,
      requested_service_id: serviceId,
      requested_service_name: service?.name ?? null,
      requested_stylist_id: stylistId,
      requested_stylist_name: stylist?.display_name ?? null,
      preferred_window: cleanNullableText(input.preferred_window, 80),
      notes: cleanNullableText(input.notes, 500),
    },
  };
}

async function getStoreRow(admin: any, table: string, id: string, storeId: string, columns: string): Promise<any | null> {
  const { data, error } = await admin
    .from(table)
    .select(columns)
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error(`[salon-waitlist-manage:${table}]`, error.message);
    return null;
  }
  return data ?? null;
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  return STATUSES.has(status) ? status : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanOptionalUuid(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value);
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
  return text.length > maxLength ? null : text || null;
}
