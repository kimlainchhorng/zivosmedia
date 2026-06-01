/**
 * admin-broadcast-notification
 * ----------------------------
 * Admin-only notification broadcast intake. The browser can request a preview
 * or send action, but audience selection and notification inserts stay server-side.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ROLES = new Set(["all", "user", "driver", "merchant", "admin"]);
const CHANNELS = new Set(["in_app", "push", "sms", "email"]);
const ACTIONS = new Set(["preview", "send"]);
const BATCH = 500;

type Body = {
  action?: unknown;
  title?: unknown;
  body?: unknown;
  role?: unknown;
  channel?: unknown;
};

serve(withSecurity("admin-broadcast-notification", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

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
  const action = cleanEnum(body.action, ACTIONS) ?? "preview";
  const role = cleanEnum(body.role, ROLES) ?? "all";

  const audience = await loadAudience(admin, role);
  if (audience.error) {
    console.error("[admin-broadcast-notification:audience]", audience.error.message);
    return json({ error: "Could not load audience" }, 500);
  }

  if (action === "preview") return json({ ok: true, count: audience.profiles.length });
  if (audience.profiles.length === 0) return json({ error: "No users found for this audience" }, 404);

  const title = cleanText(body.title, 80);
  const message = cleanText(body.body, 200);
  const channel = cleanEnum(body.channel, CHANNELS) ?? "in_app";
  if (!title || !message) return json({ error: "Title and message body are required" }, 400);

  const rows = audience.profiles.map((profile: { id: string }) => ({
    user_id: profile.id,
    actor_id: user.id,
    title,
    body: message,
    channel,
    template: "admin_broadcast",
    category: "account",
    status: "queued",
    role: role === "all" ? null : role,
    to_value: profile.id,
  }));

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from("notifications").insert(rows.slice(i, i + BATCH));
    if (error) {
      console.error("[admin-broadcast-notification:insert]", error.message);
      return json({ error: "Broadcast queue write failed" }, 500);
    }
  }

  if (channel === "push") {
    const userIds = audience.profiles.map((profile: { id: string }) => profile.id);
    for (let i = 0; i < userIds.length; i += BATCH) {
      await admin.functions.invoke("send-push-notification", {
        body: {
          user_ids: userIds.slice(i, i + BATCH),
          notification_type: "admin_broadcast",
          title,
          body: message,
          data: { role, url: "/" },
        },
      }).catch((error: unknown) => {
        console.warn("[admin-broadcast-notification:push]", error);
      });
    }
  }

  return json({ ok: true, count: rows.length });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function loadAudience(admin: ReturnType<typeof createClient>, role: string) {
  let query = admin.from("profiles").select("id");
  if (role !== "all") query = query.eq("role", role);
  const { data, error } = await query.limit(5000);
  return { profiles: (data ?? []) as Array<{ id: string }>, error };
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return allowed.has(text) ? text : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.length <= max ? text : null;
}
