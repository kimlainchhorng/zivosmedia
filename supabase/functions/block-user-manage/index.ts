/**
 * block-user-manage
 * -----------------
 * Server-gated block/unblock mutations so clients cannot forge blocker_id,
 * bulk-write arbitrary rows, or skip validation for user-safety actions.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["block", "unblock"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TARGETS = 100;

type Body = {
  action?: unknown;
  blocked_id?: unknown;
  blocked_ids?: unknown;
  block_id?: unknown;
};

serve(withSecurity("block-user-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid block request" }, 400);

  if (action === "unblock" && typeof body.block_id === "string") {
    const blockId = cleanUuid(body.block_id);
    if (!blockId) return json({ error: "Invalid block request" }, 400);

    const { error } = await admin
      .from("blocked_users")
      .delete()
      .eq("id", blockId)
      .eq("blocker_id", user.id);

    if (error) {
      console.error("[block-user-manage:unblock-by-id]", error.message);
      return json({ error: "Could not unblock user" }, 500);
    }

    return json({ ok: true, action, count: 1 });
  }

  const targets = cleanTargetIds(body, user.id);
  if (!targets.length) return json({ error: "Invalid block request" }, 400);

  if (action === "unblock") {
    const { error } = await admin
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .in("blocked_id", targets);

    if (error) {
      console.error("[block-user-manage:unblock]", error.message);
      return json({ error: "Could not unblock user" }, 500);
    }

    return json({ ok: true, action, count: targets.length });
  }

  const rows = targets.map((blockedId) => ({ blocker_id: user.id, blocked_id: blockedId }));
  const { error } = await admin
    .from("blocked_users")
    .upsert(rows, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });

  if (error) {
    console.error("[block-user-manage:block]", error.message);
    return json({ error: "Could not block user" }, 500);
  }

  await cleanupSocialGraph(admin, user.id, targets);
  return json({ ok: true, action, count: targets.length });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanAction(value: unknown): "block" | "unblock" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "block" | "unblock" : null;
}

function cleanTargetIds(body: Body, blockerId: string): string[] {
  const raw = Array.isArray(body.blocked_ids) ? body.blocked_ids : [body.blocked_id];
  const ids = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => UUID_RE.test(value) && value !== blockerId);

  return [...new Set(ids)].slice(0, MAX_TARGETS);
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

async function cleanupSocialGraph(
  admin: ReturnType<typeof createClient>,
  blockerId: string,
  targets: string[],
) {
  await Promise.allSettled([
    admin.from("user_followers").delete().eq("follower_id", blockerId).in("following_id", targets),
    admin.from("user_followers").delete().in("follower_id", targets).eq("following_id", blockerId),
    ...targets.map((targetId) =>
      admin
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${blockerId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${blockerId})`)
    ),
  ]);
}
