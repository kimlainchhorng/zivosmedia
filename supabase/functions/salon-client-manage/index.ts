/**
 * salon-client-manage
 * -------------------
 * Owner/admin mutation gate for salon client-book CRUD, plus authenticated
 * customer self-service updates for notification preferences.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete", "self_update_preferences"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  client_id?: unknown;
  client?: unknown;
  preferences?: unknown;
};

type ClientValues = {
  display_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  preferred_stylist_id: string | null;
  is_blocked: boolean;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  marketing_opt_in: boolean;
  tags?: string[];
};

serve(withSecurity("salon-client-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid client action" }, 400);

  if (action === "self_update_preferences") {
    const clientId = cleanUuid(body.client_id);
    if (!clientId) return json({ error: "Invalid client id" }, 400);
    const preferences = cleanPreferences(body.preferences);
    if (!preferences.ok) return json({ error: preferences.error }, 400);

    const { data, error } = await admin
      .from("salon_clients")
      .update(preferences.values)
      .eq("id", clientId)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !data) {
      console.error("[salon-client-manage:self_update_preferences]", error?.message);
      return json({ error: "Could not update preferences" }, error ? 500 : 404);
    }
    return json({ ok: true, client: data });
  }

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const client = await cleanClient(admin, body.client, storeId, { partial: false });
    if (!client.ok) return json({ error: client.error }, 400);

    const { data, error } = await admin
      .from("salon_clients")
      .insert({ ...client.values, store_id: storeId })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-client-manage:create]", error.message);
      return json({ error: "Could not add client" }, 500);
    }
    return json({ ok: true, client: data });
  }

  const clientId = cleanUuid(body.client_id);
  if (!clientId) return json({ error: "Invalid client id" }, 400);
  const existing = await getClient(admin, clientId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_clients")
      .delete()
      .eq("id", clientId)
      .eq("store_id", existing.data.store_id);
    if (error) {
      console.error("[salon-client-manage:delete]", error.message);
      return json({ error: "Could not delete client" }, 409);
    }
    return json({ ok: true, client_id: clientId });
  }

  const client = await cleanClient(admin, body.client, existing.data.store_id, { partial: true });
  if (!client.ok) return json({ error: client.error }, 400);
  if (Object.keys(client.values).length === 0) return json({ error: "No client changes provided" }, 400);

  const { data, error } = await admin
    .from("salon_clients")
    .update(client.values)
    .eq("id", clientId)
    .eq("store_id", existing.data.store_id)
    .select("*")
    .single();
  if (error) {
    console.error("[salon-client-manage:update]", error.message);
    return json({ error: "Could not update client" }, 500);
  }
  return json({ ok: true, client: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-client-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-client-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getClient(admin: any, clientId: string):
  Promise<{ ok: true; data: { id: string; store_id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_clients")
    .select("id, store_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) {
    console.error("[salon-client-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify client", status: 500 };
  }
  if (!data) return { ok: false, error: "Client not found", status: 404 };
  return { ok: true, data };
}

async function stylistBelongsToStore(admin: any, stylistId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("salon_stylists")
    .select("id")
    .eq("id", stylistId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-client-manage:stylist]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

async function cleanClient(
  admin: any,
  value: unknown,
  storeId: string,
  options: { partial: boolean },
): Promise<{ ok: true; values: Partial<ClientValues> } | { ok: false; error: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Client payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Partial<ClientValues> = {};

  if (!options.partial || input.display_name !== undefined) {
    const displayName = cleanText(input.display_name, 1, 120);
    if (!displayName) return { ok: false, error: "Client name is required" };
    values.display_name = displayName;
  }
  if (!options.partial || input.phone !== undefined) {
    const phone = cleanNullableText(input.phone, 30);
    if (phone === undefined) return { ok: false, error: "Phone is too long" };
    values.phone = phone;
  }
  if (!options.partial || input.email !== undefined) {
    const email = cleanNullableText(input.email, 254);
    if (email === undefined) return { ok: false, error: "Email is too long" };
    values.email = email;
  }
  if (!options.partial || input.birthday !== undefined) {
    const birthday = cleanDate(input.birthday);
    if (birthday === undefined) return { ok: false, error: "Invalid birthday" };
    values.birthday = birthday;
  }
  if (!options.partial || input.notes !== undefined) {
    const notes = cleanNullableText(input.notes, 2_000);
    if (notes === undefined) return { ok: false, error: "Notes are too long" };
    values.notes = notes;
  }
  if (!options.partial || input.preferred_stylist_id !== undefined) {
    const stylistId = cleanUuidOrNull(input.preferred_stylist_id);
    if (stylistId === undefined) return { ok: false, error: "Invalid stylist id" };
    if (stylistId && !await stylistBelongsToStore(admin, stylistId, storeId)) {
      return { ok: false, error: "Stylist does not belong to this store" };
    }
    values.preferred_stylist_id = stylistId;
  }
  if (!options.partial || input.is_blocked !== undefined) {
    if (typeof input.is_blocked !== "boolean") return { ok: false, error: "Invalid blocked status" };
    values.is_blocked = input.is_blocked;
  }
  if (!options.partial || input.sms_opt_in !== undefined) {
    if (typeof input.sms_opt_in !== "boolean") return { ok: false, error: "Invalid SMS opt-in" };
    values.sms_opt_in = input.sms_opt_in;
  }
  if (!options.partial || input.email_opt_in !== undefined) {
    if (typeof input.email_opt_in !== "boolean") return { ok: false, error: "Invalid email opt-in" };
    values.email_opt_in = input.email_opt_in;
  }
  if (!options.partial || input.marketing_opt_in !== undefined) {
    if (typeof input.marketing_opt_in !== "boolean") return { ok: false, error: "Invalid marketing opt-in" };
    values.marketing_opt_in = input.marketing_opt_in;
  }
  if (input.tags !== undefined) {
    const tags = cleanTags(input.tags);
    if (!tags) return { ok: false, error: "Invalid client tags" };
    values.tags = tags;
  }

  return { ok: true, values };
}

function cleanPreferences(value: unknown): { ok: true; values: { sms_opt_in?: boolean; email_opt_in?: boolean; marketing_opt_in?: boolean } } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Preferences payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: { sms_opt_in?: boolean; email_opt_in?: boolean; marketing_opt_in?: boolean } = {};
  for (const key of ["sms_opt_in", "email_opt_in", "marketing_opt_in"] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean") return { ok: false, error: "Invalid preference value" };
      values[key] = input[key];
    }
  }
  if (Object.keys(values).length === 0) return { ok: false, error: "No preferences provided" };
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

function cleanUuidOrNull(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value) ?? undefined;
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

function cleanDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  return value;
}

function cleanTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tags = Array.from(new Set(value.map((tag) => typeof tag === "string" ? tag.trim() : "").filter(Boolean)));
  if (tags.length > 20) return null;
  if (tags.some((tag) => tag.length > 40)) return null;
  return tags;
}
