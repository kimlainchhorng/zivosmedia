/**
 * bot-ai-handler — universal AI webhook for bots.
 *
 * Set as a bot's webhook URL:
 *   https://<project>.supabase.co/functions/v1/bot-ai-handler?bot_token=<TOKEN>&system=<system-prompt>
 *
 * On every incoming update we call Claude with prior conversation
 * (last 10 messages) and reply with `sendMessage`. State is kept in
 * `bot_user_state` so memory survives across messages without storing
 * every turn explicitly.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MODEL = "claude-haiku-4-5-20251001";

Deno.serve(withSecurity("bot-ai-handler", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("bot_token") ?? "";
    const systemPrompt = url.searchParams.get("system") ?? "You are a helpful assistant in a chat app called Zivo. Keep replies short and friendly.";
    if (!token) return j({ error: "bot_token required as query param" }, 401, corsHeaders);

    const update = await req.json();
    const userText = update?.message?.text?.trim();
    const chatId = update?.chat?.id ?? update?.from?.id;
    if (!userText || !chatId) return j({ ok: true, skipped: true }, 200, corsHeaders);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return j({ error: "ANTHROPIC_API_KEY not set" }, 500, corsHeaders);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify token & get bot
    const { data: vrows } = await sb.rpc("verify_bot_token", { p_token: token });
    const auth = Array.isArray(vrows) ? vrows[0] : vrows;
    if (!auth) return j({ error: "invalid token" }, 401, corsHeaders);

    // Pull recent context: last 10 DMs between this user and the bot
    const { data: recent } = await sb.from("direct_messages")
      .select("sender_id, message, created_at")
      .or(`and(sender_id.eq.${chatId},receiver_id.eq.${auth.bot_user_id}),and(sender_id.eq.${auth.bot_user_id},receiver_id.eq.${chatId})`)
      .order("created_at", { ascending: false })
      .limit(10);
    const history = (recent ?? []).reverse().map((m: any) => ({
      role: m.sender_id === auth.bot_user_id ? "assistant" : "user",
      content: m.message ?? "",
    })).filter((m: any) => m.content);

    // Call Claude
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: history.length ? history : [{ role: "user", content: userText }],
      }),
    });
    const data = await res.json();
    const reply: string = data?.content?.[0]?.text ?? "Sorry, I'm having trouble right now.";

    await sb.from("direct_messages").insert({
      sender_id: auth.bot_user_id,
      receiver_id: chatId,
      message: reply,
      message_type: "text",
    });

    return j({ ok: true }, 200, corsHeaders);
  } catch (e) {
    return j({ error: String(e) }, 500, corsHeaders);
  }
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));

function j(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
