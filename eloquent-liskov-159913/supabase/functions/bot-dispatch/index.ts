/**
 * bot-dispatch — fired by a DB trigger when a user DMs a bot.
 *
 * Flow per message:
 *   1. Build Telegram-style update payload.
 *   2. Queue it in `bot_updates` (so bots using getUpdates polling can fetch).
 *   3. Match against `bot_workflows` rules; if a rule matches, auto-reply.
 *   4. If a webhook_url is set (and rule didn't say `next_webhook=false`), POST to it.
 *
 * Body: { message_id: uuid, bot_id: uuid }
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message_id, bot_id } = await req.json();
    if (!message_id || !bot_id) return j({ error: "message_id and bot_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: msg }, { data: bot }] = await Promise.all([
      sb.from("direct_messages").select("*").eq("id", message_id).maybeSingle(),
      sb.from("bots").select("id, bot_user_id, username, webhook_url, is_active").eq("id", bot_id).maybeSingle(),
    ]);
    if (!msg || !bot || !bot.is_active) return j({ ok: true, skipped: true });

    const { data: senderProfile } = await sb.from("profiles")
      .select("user_id, full_name, username, avatar_url").eq("user_id", msg.sender_id).maybeSingle();

    const payload = {
      update_id: msg.id,
      bot: { id: bot.id, username: bot.username, bot_user_id: bot.bot_user_id },
      message: {
        id: msg.id,
        text: msg.message ?? "",
        image_url: msg.image_url ?? null,
        message_type: msg.message_type ?? "text",
        voice_url: msg.voice_url ?? null,
        created_at: msg.created_at,
      },
      from: senderProfile ? {
        id: senderProfile.user_id,
        full_name: senderProfile.full_name,
        username: senderProfile.username,
        avatar_url: senderProfile.avatar_url,
      } : { id: msg.sender_id },
      chat: { id: msg.sender_id, type: "direct" },
    };

    // 2. Queue for getUpdates pollers (fire and forget on awaits below)
    const queue = sb.from("bot_updates").insert({ bot_id: bot.id, message_id: msg.id, payload });

    // 3. Evaluate workflows (server-side auto-reply)
    const text = (msg.message ?? "").trim();
    const { data: rule } = await sb.rpc("match_bot_workflow", { p_bot_id: bot.id, p_text: text });
    let runWebhook = true;
    if (rule) {
      if (rule.reply_text || rule.reply_image_url) {
        await sb.from("direct_messages").insert({
          sender_id: bot.bot_user_id,
          receiver_id: msg.sender_id,
          message: rule.reply_text ?? "",
          image_url: rule.reply_image_url ?? null,
          message_type: "text",
        });
      }
      runWebhook = rule.next_webhook === true;
    }

    // 4. Forward to external webhook
    let whStatus: number | null = null;
    if (runWebhook && bot.webhook_url) {
      try {
        const res = await fetch(bot.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        whStatus = res.status;
      } catch (_) { whStatus = 0; }
    }

    await queue;
    return j({ ok: true, matched: !!rule, webhook_status: whStatus });
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
