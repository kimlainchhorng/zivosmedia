/**
 * bot-broadcast — bot owner sends a one-off message to every user who has
 * previously DM'd the bot. Authenticated by the caller's user JWT.
 *
 * Body: { bot_id: uuid, text: string }
 * Returns: { ok: true, sent: number }
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
    const authz = req.headers.get("Authorization") ?? "";
    if (!authz.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authz } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const owner = userRes?.user;
    if (!owner) return json({ error: "Not authenticated" }, 401);

    const { bot_id, text } = await req.json();
    if (!bot_id || typeof bot_id !== "string") return json({ error: "bot_id required" }, 400);
    const msg = String(text ?? "").trim();
    if (!msg) return json({ error: "text required" }, 400);
    if (msg.length > 4000) return json({ error: "text too long (max 4000 chars)" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify ownership and active state
    const { data: bot, error: bErr } = await sb
      .from("bots")
      .select("id, bot_user_id, owner_id, is_active")
      .eq("id", bot_id)
      .maybeSingle();
    if (bErr) return json({ error: bErr.message }, 500);
    if (!bot) return json({ error: "Bot not found" }, 404);
    if (bot.owner_id !== owner.id) return json({ error: "Not owner of bot" }, 403);
    if (!bot.is_active) return json({ error: "Bot is inactive" }, 403);

    // Distinct senders who have DMd this bot
    const { data: senders, error: sErr } = await sb
      .from("direct_messages")
      .select("sender_id")
      .eq("receiver_id", bot.bot_user_id);
    if (sErr) return json({ error: sErr.message }, 500);

    const recipientIds = Array.from(
      new Set((senders ?? []).map((r: any) => r.sender_id).filter(Boolean)),
    ) as string[];

    if (recipientIds.length === 0) return json({ ok: true, sent: 0 });

    // Insert one DM per recipient. Use chunked inserts to stay under
    // Postgres single-statement parameter limits on very large lists.
    const rows = recipientIds.map((uid) => ({
      sender_id: bot.bot_user_id,
      receiver_id: uid,
      message: msg,
      message_type: "text",
    }));

    const CHUNK = 500;
    let sent = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: iErr } = await sb.from("direct_messages").insert(slice);
      if (iErr) return json({ error: iErr.message, sent }, 500);
      sent += slice.length;
    }

    return json({ ok: true, sent });
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
