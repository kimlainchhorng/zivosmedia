/**
 * follow-manage
 * -------------
 * Server-gated follower lifecycle actions. Browsers can read follower edges,
 * but follow/unfollow/remove-follower writes are scoped to the signed-in user
 * here so clients cannot forge follower_id/following_id pairs.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["follow", "unfollow", "remove_follower"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type Action = "follow" | "unfollow" | "remove_follower";
type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;

type Body = {
  action?: unknown;
  following_id?: unknown;
  follower_id?: unknown;
};

serve(withSecurity("follow-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json: JsonResponder = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !supabaseUrl || !serviceKey) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid follow action" }, 400);

  if (action === "remove_follower") {
    const followerId = cleanUuid(body.follower_id);
    if (!followerId || followerId === user.id) return json({ error: "Invalid follower request" }, 400);
    return removeFollower(admin, user.id, followerId, json);
  }

  const followingId = cleanUuid(body.following_id);
  if (!followingId || followingId === user.id) return json({ error: "Invalid follow request" }, 400);

  if (action === "unfollow") {
    return unfollow(admin, user.id, followingId, json);
  }

  return follow(admin, supabaseUrl, serviceKey, user.id, followingId, json);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function follow(
  admin: SupabaseAdmin,
  supabaseUrl: string,
  serviceKey: string,
  followerId: string,
  followingId: string,
  json: JsonResponder,
) {
  const { error } = await admin
    .from("user_followers")
    .upsert(
      { follower_id: followerId, following_id: followingId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );

  if (error) return fail("follow", error, json);

  await notifyNewFollower(admin, supabaseUrl, serviceKey, followerId, followingId);
  return json({ ok: true, action: "follow", following_id: followingId });
}

async function unfollow(
  admin: SupabaseAdmin,
  followerId: string,
  followingId: string,
  json: JsonResponder,
) {
  const { error } = await admin
    .from("user_followers")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) return fail("unfollow", error, json);
  return json({ ok: true, action: "unfollow", following_id: followingId });
}

async function removeFollower(
  admin: SupabaseAdmin,
  userId: string,
  followerId: string,
  json: JsonResponder,
) {
  const { error } = await admin
    .from("user_followers")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", userId);

  if (error) return fail("remove-follower", error, json);
  return json({ ok: true, action: "remove_follower", follower_id: followerId });
}

async function notifyNewFollower(
  admin: SupabaseAdmin,
  supabaseUrl: string,
  serviceKey: string,
  followerId: string,
  followingId: string,
) {
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", followerId)
      .maybeSingle();
    const followerName = cleanDisplayName((profile as { full_name?: string | null } | null)?.full_name);
    const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;

    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: followingId,
        notification_type: "new_follower",
        category: "social",
        title: "New Follower",
        body: `${followerName} started following you`,
        data: {
          type: "new_follower",
          follower_id: followerId,
          avatar_url: avatarUrl,
          action_url: `/user/${followerId}`,
        },
      }),
    });
  } catch (error) {
    console.warn("[follow-manage:notify]", error instanceof Error ? error.message : String(error));
  }
}

function cleanAction(value: unknown): Action | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as Action : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanDisplayName(value: string | null | undefined): string {
  const name = value?.trim();
  return name ? name.slice(0, 80) : "Someone";
}

function fail(action: string, error: { message?: string }, json: JsonResponder) {
  console.error(`[follow-manage:${action}]`, error.message);
  return json({ error: "Could not update follow status" }, 500);
}
