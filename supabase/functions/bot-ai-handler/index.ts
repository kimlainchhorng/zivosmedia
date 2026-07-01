/**
 * bot-ai-handler — universal AI webhook for bots.
 *
 * Set as a bot's webhook URL:
 *   https://<project>.supabase.co/functions/v1/bot-ai-handler?bot_token=<TOKEN>&system=<system-prompt>
 *
 * On every incoming update we call AI model APIs (DeepSeek first, then MiMo,
 * then Claude fallback)
 * with prior conversation (last 10 messages) and reply with `sendMessage`. State is
 * kept in `bot_user_state` so memory survives across messages without storing
 * every turn explicitly.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const DEEPSEEK_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const MIMO_MODELS = new Set(["mimo-v2.5-pro", "mimo-v2.5-flash"]);
const CLAUDE_MODELS = new Set(["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-haiku-4-5"]);
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_MIMO_MODEL = "mimo-v2.5-pro";
const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";

type AiProvider = "deepseek" | "mimo" | "claude";

function cleanModel(value: string | null, provider: AiProvider) {
  if (!value) {
    if (provider === "deepseek") return DEFAULT_DEEPSEEK_MODEL;
    if (provider === "mimo") return DEFAULT_MIMO_MODEL;
    return DEFAULT_CLAUDE_MODEL;
  }
  if (provider === "deepseek") {
    return DEEPSEEK_MODELS.has(value) ? value : DEFAULT_DEEPSEEK_MODEL;
  }
  if (provider === "mimo") {
    return MIMO_MODELS.has(value) ? value : DEFAULT_MIMO_MODEL;
  }
  return CLAUDE_MODELS.has(value) ? value : DEFAULT_CLAUDE_MODEL;
}

function normalizeProvider(value: string | null): AiProvider | "auto" {
  if (!value) return "auto";
  const provider = value.toLowerCase().trim();
  if (provider === "claude") return "claude";
  if (provider === "deepseek") return "deepseek";
  if (provider === "mimo") return "mimo";
  return "auto";
}

function providerOrder(provider: AiProvider | "auto") {
  if (provider === "claude") return ["claude", "mimo", "deepseek"] as const;
  if (provider === "mimo") return ["mimo", "deepseek", "claude"] as const;
  if (provider === "deepseek") return ["deepseek", "mimo", "claude"] as const;
  return ["deepseek", "mimo", "claude"] as const;
}

const MAX_TOKENS = 512;
const CHAT_TEMPERATURE = 0.5;

Deno.serve(withSecurity("bot-ai-handler", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("bot_token") ?? "";
    const systemPrompt = url.searchParams.get("system") ?? "You are a helpful assistant in a chat app called Zivo. Keep replies short and friendly.";
    const providerPreference = normalizeProvider(url.searchParams.get("provider"));
    const preferredModel = url.searchParams.get("model") ?? null;
    if (!token) return j({ error: "bot_token required as query param" }, 401, corsHeaders);

    const update = await req.json();
    const userText = update?.message?.text?.trim();
    const chatId = update?.chat?.id ?? update?.from?.id;
    if (!userText || !chatId) return j({ ok: true, skipped: true }, 200, corsHeaders);

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const mimoApiKey = Deno.env.get("MIMO_API_KEY");
    const mimoBaseUrl = (Deno.env.get("MIMO_BASE_URL") || "https://api.xiaomimimo.com/v1").replace(/\/+$/, "");
    const mimoThinking = Deno.env.get("MIMO_THINKING") || "disabled";
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
    if (!deepseekApiKey && !mimoApiKey && !anthropicApiKey) {
      return j({ error: "No AI provider API key configured" }, 500, corsHeaders);
    }

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

    const providers = providerOrder(providerPreference);
    let reply = "";
    let answeredBy: AiProvider | null = null;
    let answeredModel = "";
    const fallbackErrors: string[] = [];

    for (const provider of providers) {
      if (provider === "deepseek" && !deepseekApiKey) {
        fallbackErrors.push("deepseek_key_missing");
        continue;
      }
      if (provider === "mimo" && !mimoApiKey) {
        fallbackErrors.push("mimo_key_missing");
        continue;
      }
      if (provider === "claude" && !anthropicApiKey) {
        fallbackErrors.push("claude_key_missing");
        continue;
      }

      const model = cleanModel(preferredModel, provider);
      const messageList = (history.length ? history : []).concat([{ role: "user", content: userText }]);
      try {
        if (provider === "deepseek") {
          const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "authorization": `Bearer ${deepseekApiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              stream: false,
              temperature: CHAT_TEMPERATURE,
              max_tokens: MAX_TOKENS,
              thinking: { type: "disabled" },
              messages: [{ role: "system", content: systemPrompt }, ...messageList],
            }),
          });
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (res.ok && typeof text === "string" && text) {
            reply = text;
            answeredBy = provider;
            answeredModel = model;
            break;
          }
          fallbackErrors.push(`deepseek_${res.status}`);
          continue;
        }

        if (provider === "mimo") {
          const res = await fetch(`${mimoBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "authorization": `Bearer ${mimoApiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              stream: false,
              temperature: CHAT_TEMPERATURE,
              max_tokens: MAX_TOKENS,
              thinking: { type: mimoThinking },
              messages: [{ role: "system", content: systemPrompt }, ...messageList],
            }),
          });
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (res.ok && typeof text === "string" && text) {
            reply = text;
            answeredBy = provider;
            answeredModel = model;
            break;
          }
          fallbackErrors.push(`mimo_${res.status}`);
          continue;
        }

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: MAX_TOKENS,
            temperature: CHAT_TEMPERATURE,
            system: systemPrompt,
            messages: messageList,
          }),
        });
        const data = await res.json();
        const text = data?.content?.[0]?.text?.trim();
        if (res.ok && text) {
          reply = text;
          answeredBy = provider;
          answeredModel = model;
          break;
        }
        fallbackErrors.push(`claude_${res.status}`);
      } catch (e) {
        fallbackErrors.push(`${provider}_error`);
      }
    }

    if (!reply) {
      return j({ error: "AI provider unavailable", detail: fallbackErrors.join(", ") }, 502, corsHeaders);
    }

    await sb.from("direct_messages").insert({
      sender_id: auth.bot_user_id,
      receiver_id: chatId,
      message: reply,
      message_type: "text",
    });

    return j({ ok: true, provider: answeredBy, model: answeredModel }, 200, corsHeaders);
  } catch (e) {
    return j({ error: String(e) }, 500, corsHeaders);
  }
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));

function j(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
