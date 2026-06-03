// supabase/functions/livekit-token/index.ts
// Issues a short-lived LiveKit JWT for an authenticated user to join a room.
// Also creates the matching `video_call_sessions` row on first join (host),
// and a `video_call_participants` row on every join.

import { createClient } from "../_shared/deps.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.7.2";
import { withSecurity } from "../_shared/withSecurity.ts";

interface Body {
  roomName: string;
  callType?: "audio" | "video";
  asHost?: boolean;
}

type ChannelCallAccess = {
  channelId: string;
  isMember: boolean;
  isManager: boolean;
};

Deno.serve(withSecurity("livekit-token", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const respond = (body: unknown, status = 200) => json(body, status, corsHeaders);
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lkUrl = Deno.env.get("LIVEKIT_URL");
    const lkKey = Deno.env.get("LIVEKIT_API_KEY");
    const lkSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!lkUrl || !lkKey || !lkSecret) {
      return respond({ error: "LiveKit secrets missing" }, 500);
    }

    // Identify the caller from their JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData.user) return respond({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = (await req.json()) as Body;
    if (!body?.roomName || typeof body.roomName !== "string" || body.roomName.length > 80) {
      return respond({ error: "Invalid roomName" }, 400);
    }
    if (!/^[A-Za-z0-9._:-]+$/.test(body.roomName)) {
      return respond({ error: "Invalid roomName" }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const channelAccess = await getChannelCallAccess(admin, body.roomName, user.id);
    if (channelAccess && !channelAccess.isMember) {
      return respond({ error: "You must be a channel member to join this call" }, 403);
    }

    // Find or create the session row
    const { data: existing } = await admin
      .from("video_call_sessions")
      .select("id, host_id, mode, ended_at")
      .eq("room_name", body.roomName)
      .maybeSingle();

    let sessionId: string;
    let isHost = false;

    if (!existing || existing.ended_at) {
      if (channelAccess && !channelAccess.isManager) {
        return respond({ error: "Only channel admins can start this call" }, 403);
      }
      // First joiner becomes host
      const { data: created, error: cerr } = await admin
        .from("video_call_sessions")
        .insert({
          room_name: body.roomName,
          host_id: user.id,
          mode: "sfu",
          call_type: body.callType ?? "video",
        })
        .select("id")
        .single();
      if (cerr) return respond({ error: cerr.message }, 500);
      sessionId = created.id;
      isHost = true;
    } else {
      sessionId = existing.id;
      isHost = existing.host_id === user.id;
    }

    // Upsert participant row
    await admin
      .from("video_call_participants")
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          is_host: isHost,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        { onConflict: "session_id,user_id" },
      );

    // Mint LiveKit JWT (1 h)
    const at = new AccessToken(lkKey, lkSecret, {
      identity: user.id,
      name: user.email ?? user.id,
      ttl: 60 * 60,
    });
    at.addGrant({
      roomJoin: true,
      room: body.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Required so the client can call `localParticipant.setMetadata(...)`
      // for hand-raise state, reactions, etc. Without this the server returns
      // "does not have permission to update own metadata" on join.
      canUpdateOwnMetadata: true,
      roomRecord: isHost,
      roomAdmin: isHost,
    });

    const token = await at.toJwt();

    return respond({
      token,
      url: lkUrl,
      sessionId,
      isHost,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return respond({ error: msg }, 500);
  }
}, { allowedMethods: ["POST"], rateLimit: "admin_action", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function getChannelCallAccess(admin: any, roomName: string, userId: string): Promise<ChannelCallAccess | null> {
  const match = roomName.match(/^channel-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (!match) return null;

  const channelId = match[1];
  const { data: channel, error: channelError } = await admin
    .from("channels")
    .select("id, owner_id")
    .eq("id", channelId)
    .maybeSingle();

  if (channelError || !channel) {
    throw new Error("Channel not found");
  }

  const isOwner = channel.owner_id === userId;
  const { data: subscriber, error: subscriberError } = await admin
    .from("channel_subscribers")
    .select("role")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriberError) {
    throw new Error(subscriberError.message);
  }

  const role = typeof subscriber?.role === "string" ? subscriber.role : null;
  const isManager = isOwner || role === "owner" || role === "admin";
  const isMember = isManager || (Boolean(subscriber) && role !== "pending");

  return { channelId, isMember, isManager };
}
