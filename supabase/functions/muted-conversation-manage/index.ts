/**
 * muted-conversation-manage
 * -------------------------
 * Server-gated mute/unmute writes for the legacy muted_conversations table.
 * The server verifies the user and owns user_id attribution for every write.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["mute", "unmute"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CONVERSATION_ID_LENGTH = 180;

type Body = {
  action?: unknown;
  mute_id?: unknown;
  conversation_id?: unknown;
  muted_until?: unknown;
};

serve(withSecurity("muted-conversation-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid mute request" }, 400);

  if (action === "unmute") {
    const muteId = cleanUuid(body.mute_id);
    const conversationId = cleanConversationId(body.conversation_id);
    if (!muteId && !conversationId) return json({ error: "Invalid mute request" }, 400);

    let query = admin.from("muted_conversations").delete().eq("user_id", user.id);
    query = muteId ? query.eq("id", muteId) : query.eq("conversation_id", conversationId);
    const { error } = await query;

    if (error) {
      console.error("[muted-conversation-manage:unmute]", error.message);
      return json({ error: "Could not unmute conversation" }, 500);
    }

    return json({ ok: true, action });
  }

  const conversationId = cleanConversationId(body.conversation_id);
  if (!conversationId) return json({ error: "Invalid mute request" }, 400);

  const mutedUntil = cleanMutedUntil(body.muted_until);
  if (mutedUntil === undefined) return json({ error: "Invalid mute request" }, 400);

  const { error } = await admin
    .from("muted_conversations")
    .upsert({
      user_id: user.id,
      conversation_id: conversationId,
      muted_until: mutedUntil,
    }, { onConflict: "user_id,conversation_id" });

  if (error) {
    console.error("[muted-conversation-manage:mute]", error.message);
    return json({ error: "Could not mute conversation" }, 500);
  }

  return json({ ok: true, action, conversation_id: conversationId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanAction(value: unknown): "mute" | "unmute" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "mute" | "unmute" : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanConversationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > MAX_CONVERSATION_ID_LENGTH) return null;
  return /^[a-zA-Z0-9:_-]+$/.test(id) ? id : null;
}

function cleanMutedUntil(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value.trim());
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
