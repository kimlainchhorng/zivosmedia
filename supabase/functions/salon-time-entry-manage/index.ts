/**
 * salon-time-entry-manage
 * -----------------------
 * Owner/admin mutation gate for salon time-clock entries. Stylist public
 * clock-in/out RPCs remain the self-service path.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["clock_in", "clock_out", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  stylist_id?: unknown;
  entry_id?: unknown;
};

serve(withSecurity("salon-time-entry-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid time entry action" }, 400);

  if (action === "clock_in") {
    const storeId = cleanUuid(body.store_id);
    const stylistId = cleanUuid(body.stylist_id);
    if (!storeId || !stylistId) return json({ error: "Invalid store or stylist id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);
    if (!await stylistBelongsToStore(admin, stylistId, storeId)) return json({ error: "Stylist does not belong to this store" }, 400);

    const { data, error } = await admin
      .from("salon_time_entries")
      .insert({ store_id: storeId, stylist_id: stylistId, source: "admin" })
      .select("*")
      .single();
    if (error) {
      if ((error as any).code === "23505") return json({ error: "Already clocked in." }, 409);
      console.error("[salon-time-entry-manage:clock_in]", error.message);
      return json({ error: "Could not clock in" }, 500);
    }
    return json({ ok: true, entry: data });
  }

  const entryId = cleanUuid(body.entry_id);
  if (!entryId) return json({ error: "Invalid time entry id" }, 400);

  const existing = await getEntry(admin, entryId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_time_entries")
      .delete()
      .eq("id", entryId)
      .eq("store_id", existing.data.store_id);
    if (error) {
      console.error("[salon-time-entry-manage:delete]", error.message);
      return json({ error: "Could not delete time entry" }, 500);
    }
    return json({ ok: true, entry_id: entryId });
  }

  const { data, error } = await admin
    .from("salon_time_entries")
    .update({ end_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("store_id", existing.data.store_id)
    .select("*")
    .single();
  if (error) {
    console.error("[salon-time-entry-manage:clock_out]", error.message);
    return json({ error: "Could not clock out" }, 500);
  }
  return json({ ok: true, entry: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-time-entry-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-time-entry-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function stylistBelongsToStore(admin: any, stylistId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("salon_stylists")
    .select("id")
    .eq("id", stylistId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-time-entry-manage:stylist]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

async function getEntry(admin: any, entryId: string):
  Promise<{ ok: true; data: { id: string; store_id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_time_entries")
    .select("id, store_id")
    .eq("id", entryId)
    .maybeSingle();
  if (error) {
    console.error("[salon-time-entry-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify time entry", status: 500 };
  }
  if (!data) return { ok: false, error: "Time entry not found", status: 404 };
  return { ok: true, data };
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
