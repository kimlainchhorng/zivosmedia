/**
 * bot-send-message — external bot webhooks call this to post a reply
 * back into a chat. Authenticated by the bot token (sha256-hashed in DB).
 *
 * Body: { token: string, chat_id: uuid, text?: string, image_url?: string,
 *         reply_to_id?: uuid }
 *
 * `chat_id` is the user UUID the bot is replying to (direct chat).
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, chat_id, text, image_url, reply_to_id } = await req.json();
    if (!token || !chat_id) return json({ error: "token and chat_id required" }, 400);
    if (!text && !image_url) return json({ error: "text or image_url required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows, error: vErr } = await supabase.rpc("verify_bot_token", { p_token: token });
    if (vErr) return json({ error: vErr.message }, 500);
    const bot = Array.isArray(rows) ? rows[0] : rows;
    if (!bot) return json({ error: "invalid token" }, 401);
    if (!bot.is_active) return json({ error: "bot inactive" }, 403);

    const { data: inserted, error: iErr } = await supabase
      .from("direct_messages")
      .insert({
        sender_id: bot.bot_user_id,
        receiver_id: chat_id,
        message: text ?? "",
        image_url: image_url ?? null,
        reply_to_id: reply_to_id ?? null,
        message_type: "text",
      })
      .select("id, created_at")
      .single();
    if (iErr) return json({ error: iErr.message }, 500);

    // Push delivery handled by direct_messages AFTER INSERT trigger
    // (tg_notify_direct_message in 20260509120000_unified_notifications.sql).

    return json({ ok: true, message_id: inserted.id, created_at: inserted.created_at });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
