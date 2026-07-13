import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

Deno.serve(withSecurity("schedule-fire", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const provided = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
    const isInternal = Boolean(cronSecret && provided === cronSecret) || isServiceRoleRequest(req, serviceKey);
    if (!isInternal) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
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
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
