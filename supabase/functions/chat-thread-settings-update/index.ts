/**
 * chat-thread-settings-update
 * ---------------------------
 * Server-gated per-thread chat preference writes. Clients can read their
 * settings directly, but mutations go through this allowlisted endpoint so
 * user_id ownership and patch shape are enforced server-side.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const NOTIFICATION_MODES = new Set(["all", "mentions", "none"]);
const PATCH_KEYS = new Set(["muted_until", "notification_mode", "pinned_at", "archived_at"]);
const MAX_THREAD_ID_LENGTH = 160;

type Body = {
  thread_id?: unknown;
  patch?: unknown;
};

serve(withSecurity("chat-thread-settings-update", async (req, ctx) => {
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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const threadId = cleanThreadId(body.thread_id);
  const patch = normalizePatch(body.patch);
  if (!threadId || !patch) return json({ error: "Invalid thread settings update" }, 400);

  const { data, error } = await admin
    .from("chat_thread_settings")
    .upsert({
      user_id: user.id,
      thread_id: threadId,
      ...patch,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,thread_id" })
    .select("thread_id")
    .single();

  if (error) {
    console.error("[chat-thread-settings-update]", error.message);
    return json({ error: "Could not update chat settings" }, 500);
  }

  return json({ ok: true, thread_id: data?.thread_id ?? threadId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanThreadId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > MAX_THREAD_ID_LENGTH) return null;
  return /^(dm|group|channel):[a-zA-Z0-9:_-]+$/.test(id) ? id : null;
}

function normalizePatch(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(input)) {
    if (!PATCH_KEYS.has(key)) return null;

    if (key === "notification_mode") {
      if (typeof raw !== "string" || !NOTIFICATION_MODES.has(raw)) return null;
      patch.notification_mode = raw;
      continue;
    }

    if (raw === null) {
      patch[key] = null;
      continue;
    }

    if (typeof raw !== "string") return null;
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return null;
    patch[key] = date.toISOString();
  }

  return Object.keys(patch).length ? patch : null;
}
