/**
 * employee-rule-manage
 * --------------------
 * Server-gated store workplace rule mutations.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "seed_defaults", "set_active", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  rule_id?: unknown;
  rule?: unknown;
  rules?: unknown;
  active?: unknown;
  rulebook?: unknown;
};

serve(withSecurity("employee-rule-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid rule action" }, 400);

  if (body.rulebook === "store_employee_rules") {
    return handleStoreEmployeeRuleAction({ admin, userId: user.id, body, action, json });
  }

  if (action === "create" || action === "seed_defaults") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const rows = action === "seed_defaults"
      ? cleanRules(body.rules, storeId)
      : cleanRules([body.rule], storeId);
    if (!rows.ok) return json({ error: rows.error }, 400);

    const { data, error } = await admin
      .from("employee_rules")
      .insert(rows.values)
      .select("id, store_id, title, description, category, active, position, created_at");
    if (error) {
      console.error(`[employee-rule-manage:${action}]`, error.message);
      return json({ error: "Could not save employee rules" }, 500);
    }
    return json({ ok: true, rules: data ?? [] });
  }

  const ruleId = cleanUuid(body.rule_id);
  if (!ruleId) return json({ error: "Invalid rule id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("employee_rules")
    .select("id, store_id")
    .eq("id", ruleId)
    .maybeSingle();
  if (lookupError) {
    console.error("[employee-rule-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify rule" }, 500);
  }
  if (!existing) return json({ error: "Rule not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "set_active") {
    if (typeof body.active !== "boolean") return json({ error: "Invalid active value" }, 400);
    const { data, error } = await admin
      .from("employee_rules")
      .update({ active: body.active })
      .eq("id", ruleId)
      .select("id, active")
      .single();
    if (error) {
      console.error("[employee-rule-manage:set-active]", error.message);
      return json({ error: "Could not update rule" }, 500);
    }
    return json({ ok: true, rule: data });
  }

  const { error } = await admin.from("employee_rules").delete().eq("id", ruleId);
  if (error) {
    console.error("[employee-rule-manage:delete]", error.message);
    return json({ error: "Could not delete rule" }, 500);
  }
  return json({ ok: true, rule_id: ruleId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function handleStoreEmployeeRuleAction(
  { admin, userId, body, action, json }: {
    admin: any;
    userId: string;
    body: Body;
    action: string;
    json: (body: unknown, status?: number) => Response;
  },
): Promise<Response> {
  if (action === "create" || action === "update" || action === "seed_defaults") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, userId, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const rows = action === "seed_defaults"
      ? cleanStoreEmployeeRules(body.rules, storeId, userId)
      : cleanStoreEmployeeRules([body.rule], storeId, userId);
    if (!rows.ok) return json({ error: rows.error }, 400);

    if (action === "update") {
      const ruleId = cleanUuid((rows.values[0] as Record<string, unknown>).id);
      if (!ruleId) return json({ error: "Invalid rule id" }, 400);
      const { id: _id, created_by: _createdBy, store_id: _storeId, ...update } = rows.values[0];
      const { data, error } = await admin
        .from("store_employee_rules")
        .update(update)
        .eq("id", ruleId)
        .eq("store_id", storeId)
        .select("*")
        .single();
      if (error) {
        console.error("[employee-rule-manage:store-update]", error.message);
        return json({ error: "Could not update store rule" }, 500);
      }
      return json({ ok: true, rules: data ? [data] : [] });
    }

    const insertRows = rows.values.map(({ id: _id, ...row }) => row);
    const { data, error } = await admin
      .from("store_employee_rules")
      .insert(insertRows)
      .select("*");
    if (error) {
      console.error(`[employee-rule-manage:store-${action}]`, error.message);
      return json({ error: "Could not save store rules" }, 500);
    }
    return json({ ok: true, rules: data ?? [] });
  }

  const ruleId = cleanUuid(body.rule_id);
  if (!ruleId) return json({ error: "Invalid rule id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("store_employee_rules")
    .select("id, store_id")
    .eq("id", ruleId)
    .maybeSingle();
  if (lookupError) {
    console.error("[employee-rule-manage:store-lookup]", lookupError.message);
    return json({ error: "Could not verify store rule" }, 500);
  }
  if (!existing) return json({ error: "Rule not found" }, 404);
  if (!await canManageStore(admin, userId, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "set_active") {
    if (typeof body.active !== "boolean") return json({ error: "Invalid active value" }, 400);
    const { data, error } = await admin
      .from("store_employee_rules")
      .update({ is_active: body.active })
      .eq("id", ruleId)
      .eq("store_id", existing.store_id)
      .select("*")
      .single();
    if (error) {
      console.error("[employee-rule-manage:store-set-active]", error.message);
      return json({ error: "Could not update store rule" }, 500);
    }
    return json({ ok: true, rules: data ? [data] : [] });
  }

  const { error } = await admin
    .from("store_employee_rules")
    .delete()
    .eq("id", ruleId)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[employee-rule-manage:store-delete]", error.message);
    return json({ error: "Could not delete store rule" }, 500);
  }
  return json({ ok: true, rule_id: ruleId });
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[employee-rule-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[employee-rule-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanRules(value: unknown, storeId: string):
  | { ok: true; values: Array<Record<string, unknown>> }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) {
    return { ok: false, error: "Invalid rules payload" };
  }
  const values: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Invalid rule payload" };
    }
    const input = item as Record<string, unknown>;
    const title = cleanText(input.title, 1, 180);
    if (!title) return { ok: false, error: "Rule title is required" };
    values.push({
      store_id: storeId,
      title,
      description: cleanText(input.description, 0, 4000),
      category: cleanText(input.category, 1, 80) ?? "General",
      active: input.active !== false,
      position: cleanInteger(input.position, 0, 10000) ?? values.length,
    });
  }
  return { ok: true, values };
}

function cleanStoreEmployeeRules(value: unknown, storeId: string, userId: string):
  | { ok: true; values: Array<Record<string, unknown>> }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) {
    return { ok: false, error: "Invalid store rules payload" };
  }
  const values: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Invalid store rule payload" };
    }
    const input = item as Record<string, unknown>;
    const title = cleanText(input.title, 1, 180);
    const category = cleanText(input.category, 1, 80);
    const description = cleanText(input.description, 1, 4000);
    const severity = cleanSeverity(input.severity);
    const appliesTo = cleanText(input.applies_to, 1, 120);
    if (!title || !category || !description || !severity || !appliesTo) {
      return { ok: false, error: "Invalid store rule payload" };
    }
    values.push({
      id: cleanUuid(input.id),
      store_id: storeId,
      title,
      category,
      description,
      severity,
      applies_to: appliesTo,
      is_active: input.is_active !== false,
      position: cleanInteger(input.position, 0, 10000) ?? values.length,
      created_by: userId,
    });
  }
  return { ok: true, values };
}

function cleanSeverity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ["low", "medium", "high", "critical"].includes(value) ? value : null;
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
