/**
 * salon-blockout-manage
 * ---------------------
 * Owner/admin mutation gate for stylist block-off windows. Availability reads
 * stay RLS/RPC-backed; create/delete writes are scoped and validated here.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete"]);
const MAX_BLOCKOUT_MS = 1000 * 60 * 60 * 24 * 14;

type Body = {
  action?: unknown;
  store_id?: unknown;
  blockout_id?: unknown;
  blockout?: unknown;
};

serve(withSecurity("salon-blockout-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid blockout action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const blockout = cleanBlockout(body.blockout);
    if (!blockout.ok) return json({ error: blockout.error }, 400);
    if (!await stylistBelongsToStore(admin, blockout.values.stylist_id, storeId)) {
      return json({ error: "Stylist does not belong to this store" }, 400);
    }

    const { data, error } = await admin
      .from("salon_blockouts")
      .insert({
        ...blockout.values,
        store_id: storeId,
        created_by_user_id: user.id,
      })
      .select("id, store_id, stylist_id, start_at, end_at, reason")
      .single();
    if (error) {
      if ((error as any).code === "23P01") return json({ error: "That block-off overlaps an existing window" }, 409);
      console.error("[salon-blockout-manage:create]", error.message);
      return json({ error: "Could not create blockout" }, 500);
    }
    return json({ ok: true, blockout: data });
  }

  const blockoutId = cleanUuid(body.blockout_id);
  if (!blockoutId) return json({ error: "Invalid blockout id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("salon_blockouts")
    .select("id, store_id")
    .eq("id", blockoutId)
    .maybeSingle();
  if (lookupError) {
    console.error("[salon-blockout-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify blockout" }, 500);
  }
  if (!existing) return json({ error: "Blockout not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  const { error } = await admin
    .from("salon_blockouts")
    .delete()
    .eq("id", existing.id)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[salon-blockout-manage:delete]", error.message);
    return json({ error: "Could not delete blockout" }, 500);
  }
  return json({ ok: true, blockout_id: existing.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-blockout-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-blockout-manage:role]", roleError.message);
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
    console.error("[salon-blockout-manage:stylist]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanBlockout(value: unknown):
  | { ok: true; values: { stylist_id: string; start_at: string; end_at: string; reason: string | null } }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Blockout payload is required" };
  }
  const input = value as Record<string, unknown>;
  const stylistId = cleanUuid(input.stylist_id);
  if (!stylistId) return { ok: false, error: "Invalid stylist id" };

  const startAt = cleanDate(input.start_at);
  const endAt = cleanDate(input.end_at);
  if (!startAt || !endAt) return { ok: false, error: "Invalid blockout time" };

  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  if (endMs <= startMs) return { ok: false, error: "End time must be after start time" };
  if (endMs - startMs > MAX_BLOCKOUT_MS) return { ok: false, error: "Blockout is too long" };

  return {
    ok: true,
    values: {
      stylist_id: stylistId,
      start_at: startAt,
      end_at: endAt,
      reason: cleanNullableText(input.reason, 120),
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

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}
