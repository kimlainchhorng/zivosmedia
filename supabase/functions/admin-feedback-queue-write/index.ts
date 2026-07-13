/**
 * admin-feedback-queue-write
 * --------------------------
 * Admin-only bridge for legacy feedback_submissions ad/config queues.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const CATEGORIES = new Set(["admin_fb_config", "fb_scheduled_post", "google_ads_conversion_test"]);
const ACTIONS = new Set(["insert", "replace_fb_config", "delete_fb_config"]);
const MAX_MESSAGE = 8_000;

type Body = {
  action?: unknown;
  category?: unknown;
  message?: unknown;
  status?: unknown;
};

Deno.serve(withSecurity("admin-feedback-queue-write", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanEnum(body.action, ACTIONS) ?? "insert";
  const category = cleanEnum(body.category, CATEGORIES);
  if (!category) return json({ error: "Invalid queue category" }, 400);

  if (action === "delete_fb_config") {
    await admin.from("feedback_submissions").delete().eq("category", "admin_fb_config");
    return json({ ok: true });
  }

  const message = cleanMessage(body.message);
  if (!message) return json({ error: "Invalid queue message" }, 400);

  if (action === "replace_fb_config") {
    await admin.from("feedback_submissions").delete().eq("category", "admin_fb_config");
  }

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      category,
      message,
      status: cleanStatus(body.status),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin-feedback-queue-write]", error.message);
    return json({ error: "Queue write failed" }, 500);
  }

  return json({ ok: true, id: data?.id ?? null });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return allowed.has(text) ? text : null;
}

function cleanMessage(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : JSON.stringify(value ?? "");
  if (!text || text === "\"\"") return null;
  return text.length <= MAX_MESSAGE ? text : null;
}

function cleanStatus(value: unknown): string {
  if (value === "resolved" || value === "pending" || value === "dismissed") return value;
  return "pending";
}
