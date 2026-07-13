import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const { data: due } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .limit(200);

    let fired = 0;
    for (const s of due || []) {
      const insert = await supabase.from("direct_messages").insert({
        sender_id: s.sender_id,
        receiver_id: s.receiver_id,
        message: s.message,
        message_type: s.message_type || "text",
        image_url: s.image_url,
        video_url: s.video_url,
        voice_url: s.voice_url,
      });
      if (!insert.error) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "sent" })
          .eq("id", s.id);
        fired++;
      } else {
        console.error("schedule-fire insert failed", s.id, insert.error);
      }
    }

    // Cleanup expired self-destruct messages
    const { count: expired } = await supabase
      .from("direct_messages")
      .delete({ count: "exact" })
      .lte("expires_at", nowIso);

    return new Response(
      JSON.stringify({ ok: true, fired, expired_deleted: expired ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("schedule-fire error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
