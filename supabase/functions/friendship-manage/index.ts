/**
 * friendship-manage
 * -----------------
 * Server-gated lifecycle for legacy friendships rows. This keeps pending
 * request ownership, accepts, declines, cancellations, and accepted-friend
 * notifications out of browser-owned table writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["send", "cancel", "accept", "decline", "unfriend"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type Action = "send" | "cancel" | "accept" | "decline" | "unfriend";

type Body = {
  action?: unknown;
  friend_id?: unknown;
  request_id?: unknown;
};

type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;

serve(withSecurity("friendship-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid friendship action" }, 400);

  const friendId = cleanUuid(body.friend_id);
  const requestId = cleanUuid(body.request_id);

  if (action === "send") {
    if (!friendId || friendId === user.id) return json({ error: "Invalid friendship request" }, 400);
    return sendRequest(admin, supabaseUrl, serviceKey, user.id, friendId, json);
  }

  if (action === "unfriend") {
    if (!friendId || friendId === user.id) return json({ error: "Invalid friendship request" }, 400);
    return unfriend(admin, user.id, friendId, json);
  }

  if (!requestId && (!friendId || friendId === user.id)) {
    return json({ error: "Invalid friendship request" }, 400);
  }

  if (action === "accept") {
    return acceptRequest(admin, supabaseUrl, serviceKey, user.id, requestId, friendId, json);
  }

  if (action === "decline") {
    return declineRequest(admin, user.id, requestId, friendId, json);
  }

  return cancelRequest(admin, user.id, requestId, friendId, json);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function sendRequest(
  admin: SupabaseAdmin,
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  friendId: string,
  json: JsonResponder,
) {
  const followError = await ensureFollowing(admin, userId, friendId);
  if (followError) return fail("send-follow", followError, json);

  const { error } = await admin
    .from("friendships")
    .insert({ user_id: userId, friend_id: friendId, status: "pending" });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if ((error as { code?: string }).code === "23505" || msg.includes("duplicate") || msg.includes("already exists")) {
      return json({ ok: true, action: "send", duplicate: true });
    }
    return fail("send", error, json);
  }

  await notifyFriendship(admin, supabaseUrl, serviceKey, {
    recipientId: friendId,
    actorId: userId,
    type: "friend_request_received",
  });

  return json({ ok: true, action: "send" });
}

async function acceptRequest(
  admin: SupabaseAdmin,
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  requestId: string | null,
  friendId: string | null,
  json: JsonResponder,
) {
  let query = admin
    .from("friendships")
    .select("id, user_id, friend_id")
    .eq("friend_id", userId)
    .eq("status", "pending");
  query = requestId ? query.eq("id", requestId) : query.eq("user_id", friendId);

  const { data: request, error: lookupError } = await query.maybeSingle();
  if (lookupError) return fail("accept-lookup", lookupError, json);
  if (!request?.id || !request.user_id) return json({ error: "Friend request not found" }, 404);

  const requesterId = request.user_id as string;
  const followError = await ensureFollowing(admin, userId, requesterId);
  if (followError) return fail("accept-follow", followError, json);

  const { error: updateError } = await admin
    .from("friendships")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", request.id as string)
    .eq("friend_id", userId)
    .eq("status", "pending");
  if (updateError) return fail("accept-update", updateError, json);

  await notifyFriendship(admin, supabaseUrl, serviceKey, {
    recipientId: requesterId,
    actorId: userId,
    type: "friend_request_accepted",
  });

  return json({ ok: true, action: "accept", request_id: request.id });
}

async function declineRequest(
  admin: SupabaseAdmin,
  userId: string,
  requestId: string | null,
  friendId: string | null,
  json: JsonResponder,
) {
  let query = admin
    .from("friendships")
    .update({ status: "declined" })
    .eq("friend_id", userId)
    .eq("status", "pending");
  query = requestId ? query.eq("id", requestId) : query.eq("user_id", friendId);

  const { data, error } = await query.select("id").maybeSingle();
  if (error) return fail("decline", error, json);
  if (!data?.id) return json({ error: "Friend request not found" }, 404);
  return json({ ok: true, action: "decline", request_id: data.id });
}

async function cancelRequest(
  admin: SupabaseAdmin,
  userId: string,
  requestId: string | null,
  friendId: string | null,
  json: JsonResponder,
) {
  let query = admin
    .from("friendships")
    .delete()
    .eq("user_id", userId)
    .eq("status", "pending");
  query = requestId ? query.eq("id", requestId) : query.eq("friend_id", friendId);

  const { data, error } = await query.select("id, friend_id");
  if (error) return fail("cancel", error, json);
  if (!data?.length) return json({ error: "Friend request not found" }, 404);
  await Promise.all(
    data
      .map((row) => row.friend_id as string | null)
      .filter((id): id is string => Boolean(id))
      .map((id) => removeFollowing(admin, userId, id)),
  );
  return json({ ok: true, action: "cancel", count: data.length });
}

async function unfriend(
  admin: SupabaseAdmin,
  userId: string,
  friendId: string,
  json: JsonResponder,
) {
  const { data, error } = await admin
    .from("friendships")
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .select("id");
  if (error) return fail("unfriend", error, json);
  await removeFollowing(admin, userId, friendId);
  return json({ ok: true, action: "unfriend", count: data?.length ?? 0 });
}

async function ensureFollowing(admin: SupabaseAdmin, followerId: string, followingId: string) {
  const { error } = await admin
    .from("user_followers")
    .upsert(
      { follower_id: followerId, following_id: followingId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );
  return error ?? null;
}

async function removeFollowing(admin: SupabaseAdmin, followerId: string, followingId: string) {
  await admin
    .from("user_followers")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

async function notifyFriendship(
  admin: SupabaseAdmin,
  supabaseUrl: string,
  serviceKey: string,
  payload: {
    recipientId: string;
    actorId: string;
    type: "friend_request_received" | "friend_request_accepted";
  },
) {
  if (!supabaseUrl || !serviceKey) return;

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", payload.actorId)
      .maybeSingle();
    const actorName = cleanDisplayName((profile as { full_name?: string | null } | null)?.full_name);
    const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;
    const accepted = payload.type === "friend_request_accepted";

    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: payload.recipientId,
        notification_type: payload.type,
        category: "social",
        title: accepted ? "Friend Request Accepted" : `${actorName} sent you a friend request`,
        body: accepted ? `${actorName} accepted your friend request` : `${actorName} wants to connect with you`,
        data: {
          type: accepted ? "friend_accepted" : "friend_request",
          sender_id: payload.actorId,
          avatar_url: avatarUrl,
          action_url: `/user/${payload.actorId}`,
        },
      }),
    });
  } catch (error) {
    console.warn("[friendship-manage:notify]", error instanceof Error ? error.message : String(error));
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
  console.error(`[friendship-manage:${action}]`, error.message);
  return json({ error: "Could not update friendship" }, 500);
}
