/**
 * salon-reminder-template-manage
 * -----------------------------
 * Owner/admin mutation gate for per-store salon reminder template overrides.
 * Read-side rendering still happens inside send-transactional-email.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "reset"]);
const TEMPLATE_KEYS = new Set([
  "salon-booking-reminder-24h",
  "salon-birthday-offer",
  "salon-winback-offer",
]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  template_key?: unknown;
  template?: unknown;
};

type TemplateValues = {
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sms_body: string | null;
};

serve(withSecurity("salon-reminder-template-manage", async (req, ctx) => {
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
  const templateKey = cleanTemplateKey(body.template_key);
  if (!action) return json({ error: "Invalid template action" }, 400);
  if (!storeId || !templateKey) return json({ error: "Invalid store or template key" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "reset") {
    const { error } = await admin
      .from("salon_notification_template_overrides")
      .delete()
      .eq("store_id", storeId)
      .eq("template_key", templateKey);
    if (error) {
      console.error("[salon-reminder-template-manage:reset]", error.message);
      return json({ error: "Could not reset template" }, 500);
    }
    return json({ ok: true, template_key: templateKey, template: emptyTemplate(templateKey) });
  }

  const template = cleanTemplate(body.template);
  if (!template.ok) return json({ error: template.error }, 400);

  const { data, error } = await admin
    .from("salon_notification_template_overrides")
    .upsert({ store_id: storeId, template_key: templateKey, ...template.values }, { onConflict: "store_id,template_key" })
    .select("template_key, subject, body_html, body_text, sms_body")
    .single();
  if (error) {
    console.error("[salon-reminder-template-manage:save]", error.message);
    return json({ error: "Could not save template" }, 500);
  }
  return json({ ok: true, template: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-reminder-template-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-reminder-template-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanTemplate(value: unknown): { ok: true; values: TemplateValues } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Template payload is required" };
  }
  const input = value as Record<string, unknown>;
  const subject = cleanNullableText(input.subject, 200);
  const bodyHtml = cleanNullableText(input.body_html, 20_000);
  const bodyText = cleanNullableText(input.body_text, 20_000);
  const smsBody = cleanNullableText(input.sms_body, 320);
  if (subject === undefined || bodyHtml === undefined || bodyText === undefined || smsBody === undefined) {
    return { ok: false, error: "Template field is too long" };
  }
  return {
    ok: true,
    values: {
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      sms_body: smsBody,
    },
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanTemplateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return TEMPLATE_KEYS.has(key) ? key : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanNullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  return text.length <= maxLength ? text : undefined;
}

function emptyTemplate(templateKey: string) {
  return {
    template_key: templateKey,
    subject: null,
    body_html: null,
    body_text: null,
    sms_body: null,
  };
}
