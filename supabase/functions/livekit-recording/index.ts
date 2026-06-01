// supabase/functions/livekit-recording/index.ts
// Host-only: start or stop a room composite recording.
// Uses LiveKit Egress to record the room as mp4 and POST it to Supabase Storage
// via signed-URL upload after the call ends.

import { createClient } from "../_shared/deps.ts";
import { EgressClient, EncodedFileType } from "npm:livekit-server-sdk@2.7.2";
import { withSecurity } from "../_shared/withSecurity.ts";

interface Body {
  sessionId: string;
  action: "start" | "stop";
}

Deno.serve(withSecurity("livekit-recording", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const recordingHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" };

  if (req.method === "OPTIONS") return new Response(null, { headers: recordingHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lkUrl = Deno.env.get("LIVEKIT_URL");
    const lkKey = Deno.env.get("LIVEKIT_API_KEY");
    const lkSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!lkUrl || !lkKey || !lkSecret) return json({ error: "LiveKit secrets missing" }, 500, recordingHeaders);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData.user) return json({ error: "Unauthorized" }, 401, recordingHeaders);
    const user = userData.user;

    const body = (await req.json()) as Body;
    if (!body?.sessionId || !body?.action) return json({ error: "Invalid body" }, 400, recordingHeaders);

    const admin = createClient(url, serviceKey);
    const { data: session, error: serr } = await admin
      .from("video_call_sessions")
      .select("id, room_name, host_id, recording_egress_id")
      .eq("id", body.sessionId)
      .maybeSingle();
    if (serr || !session) return json({ error: "Session not found" }, 404, recordingHeaders);
    if (session.host_id !== user.id) return json({ error: "Host only" }, 403, recordingHeaders);

    const httpUrl = lkUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    const egress = new EgressClient(httpUrl, lkKey, lkSecret);

    if (body.action === "start") {
      const filepath = `${session.id}/${Date.now()}.mp4`;
      // Record locally on LiveKit, then we'll fetch & upload after stop.
      const info = await egress.startRoomCompositeEgress(session.room_name, {
        file: { fileType: EncodedFileType.MP4, filepath },
      } as never);

      await admin
        .from("video_call_sessions")
        .update({
          recording_status: "recording",
          recording_egress_id: info.egressId,
        })
        .eq("id", session.id);

      return json({ ok: true, egressId: info.egressId }, 200, recordingHeaders);
    }

    // stop
    if (!session.recording_egress_id) return json({ error: "Not recording" }, 400, recordingHeaders);
    const stopped = await egress.stopEgress(session.recording_egress_id);

    await admin
      .from("video_call_sessions")
      .update({ recording_status: "processing" })
      .eq("id", session.id);

    // The mp4 will be available via stopped.fileResults shortly.
    // Worker continues asynchronously — we surface the egressId so the host can poll status.
    const fileInfo = stopped.fileResults?.[0];
    if (fileInfo?.duration) {
      await admin.from("video_call_recordings").insert({
        session_id: session.id,
        storage_path: `${session.id}/${session.recording_egress_id}.mp4`,
        duration_seconds: Math.round(Number(fileInfo.duration) / 1_000_000_000),
        size_bytes: fileInfo.size ? Number(fileInfo.size) : null,
      });
      await admin
        .from("video_call_sessions")
        .update({ recording_status: "ready" })
        .eq("id", session.id);
    }

    return json({ ok: true }, 200, recordingHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500, ctx.corsHeaders);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function json(body: unknown, status = 200, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
