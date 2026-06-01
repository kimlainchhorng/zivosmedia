/**
 * close-friend-manage
 * -------------------
 * Server-gated close-friends mutations so clients cannot forge user_id or
 * bypass validation when adding/removing private story viewers.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["add", "remove"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  friend_id?: unknown;
};

serve(withSecurity("close-friend-manage", async (req, ctx) => {
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
  const friendId = cleanUuid(body.friend_id);
  if (!action || !friendId || friendId === user.id) {
    return json({ error: "Invalid close-friend request" }, 400);
  }

  if (action === "remove") {
    const { error } = await admin
      .from("close_friends")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", friendId);

    if (error) {
      console.error("[close-friend-manage:remove]", error.message);
      return json({ error: "Could not remove close friend" }, 500);
    }

    return json({ ok: true, action, friend_id: friendId });
  }

  const { error } = await admin
    .from("close_friends")
    .upsert({ user_id: user.id, friend_id: friendId }, { onConflict: "user_id,friend_id" });

  if (error) {
    console.error("[close-friend-manage:add]", error.message);
    return json({ error: "Could not add close friend" }, 500);
  }

  return json({ ok: true, action, friend_id: friendId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanAction(value: unknown): "add" | "remove" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "add" | "remove" : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}
