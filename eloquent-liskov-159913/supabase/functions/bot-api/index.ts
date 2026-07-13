/**
 * bot-api — single Telegram-style endpoint for bot developers.
 *
 * URL:   https://<project>.supabase.co/functions/v1/bot-api/<token>/<method>
 *   or:  POST .../bot-api  with { token, method, ...params }
 *
 * Methods:
 *   getMe                     -> bot info
 *   sendMessage               { chat_id, text, image_url?, reply_to_id? }
 *   setWebhook                { url }
 *   deleteWebhook             {}
 *   getUpdates                { offset?, limit?, mark_delivered? }
 *   setMyCommands             { commands: [{command, description}] }
 *   getMyCommands             {}
 *   setState                  { user_id, state }   // per-user conversation state
 *   getState                  { user_id }
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supa = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const segs = url.pathname.split("/").filter(Boolean); // [..., 'bot-api', token?, method?]
    const idx = segs.indexOf("bot-api");
    let token = idx >= 0 ? segs[idx + 1] : "";
    let method = idx >= 0 ? segs[idx + 2] : "";

    let body: Record<string, unknown> = {};
    if (req.method !== "GET") {
      try { body = await req.json(); } catch { /* allow empty */ }
    }
    token = token || (body.token as string) || "";
    method = method || (body.method as string) || "";
    if (!token) return j({ ok: false, error: "missing token" }, 401);
    if (!method) return j({ ok: false, error: "missing method" }, 400);

    const sb = supa();
    const { data: vrows } = await sb.rpc("verify_bot_token", { p_token: token });
    const auth = Array.isArray(vrows) ? vrows[0] : vrows;
    if (!auth) return j({ ok: false, error: "invalid token" }, 401);
    if (!auth.is_active) return j({ ok: false, error: "bot inactive" }, 403);
    const botId = auth.bot_id as string;
    const botUserId = auth.bot_user_id as string;

    switch (method) {
      case "getMe": {
        const { data } = await sb.from("bots")
          .select("id, bot_user_id, username, display_name, description, avatar_url, webhook_url, is_active")
          .eq("id", botId).maybeSingle();
        return j({ ok: true, result: data });
      }
      case "sendMessage": {
        const chat_id = body.chat_id as string;
        const text = (body.text as string) ?? "";
        const image_url = (body.image_url as string) ?? null;
        const reply_to_id = (body.reply_to_id as string) ?? null;
        if (!chat_id || (!text && !image_url)) return j({ ok: false, error: "chat_id and text/image_url required" }, 400);
        const { data, error } = await sb.from("direct_messages").insert({
          sender_id: botUserId, receiver_id: chat_id,
          message: text, image_url, reply_to_id, message_type: "text",
        }).select("id, created_at").single();
        if (error) return j({ ok: false, error: error.message }, 500);
        return j({ ok: true, result: data });
      }
      case "setWebhook": {
        const wurl = (body.url as string) ?? "";
        const { error } = await sb.from("bots").update({ webhook_url: wurl || null }).eq("id", botId);
        if (error) return j({ ok: false, error: error.message }, 500);
        return j({ ok: true, result: { url: wurl || null } });
      }
      case "deleteWebhook": {
        await sb.from("bots").update({ webhook_url: null }).eq("id", botId);
        return j({ ok: true, result: true });
      }
      case "getUpdates": {
        const offset = Number(body.offset ?? 0);
        const limit = Math.min(100, Number(body.limit ?? 25));
        const markDelivered = body.mark_delivered !== false;
        let q = sb.from("bot_updates").select("id, payload, created_at")
          .eq("bot_id", botId).is("delivered_at", null)
          .order("id", { ascending: true }).limit(limit);
        if (offset) q = q.gt("id", offset);
        const { data, error } = await q;
        if (error) return j({ ok: false, error: error.message }, 500);
        if (markDelivered && data?.length) {
          const ids = data.map((r: any) => r.id);
          await sb.from("bot_updates").update({ delivered_at: new Date().toISOString() }).in("id", ids);
        }
        return j({ ok: true, result: data });
      }
      case "setMyCommands": {
        const cmds = (body.commands as Array<{ command: string; description?: string }>) ?? [];
        await sb.from("bot_commands").delete().eq("bot_id", botId);
        if (cmds.length) {
          const rows = cmds.map((c, i) => ({
            bot_id: botId,
            command: String(c.command).toLowerCase().replace(/^\//, ""),
            description: c.description ?? "",
            sort_order: i,
          }));
          const { error } = await sb.from("bot_commands").insert(rows);
          if (error) return j({ ok: false, error: error.message }, 500);
        }
        return j({ ok: true, result: true });
      }
      case "getMyCommands": {
        const { data } = await sb.from("bot_commands")
          .select("command, description").eq("bot_id", botId).order("sort_order");
        return j({ ok: true, result: data ?? [] });
      }
      case "setState": {
        const user_id = body.user_id as string;
        const state = body.state ?? {};
        if (!user_id) return j({ ok: false, error: "user_id required" }, 400);
        const { error } = await sb.from("bot_user_state")
          .upsert({ bot_id: botId, user_id, state, updated_at: new Date().toISOString() });
        if (error) return j({ ok: false, error: error.message }, 500);
        return j({ ok: true, result: true });
      }
      case "getState": {
        const user_id = body.user_id as string;
        if (!user_id) return j({ ok: false, error: "user_id required" }, 400);
        const { data } = await sb.from("bot_user_state")
          .select("state, updated_at").eq("bot_id", botId).eq("user_id", user_id).maybeSingle();
        return j({ ok: true, result: data ?? null });
      }
      default:
        return j({ ok: false, error: `unknown method: ${method}` }, 400);
    }
  } catch (e) {
    return j({ ok: false, error: String(e) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
