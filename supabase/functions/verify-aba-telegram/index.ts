/**
 * verify-aba-telegram — Verifies an ABA KHQR payment by scanning Telegram bot messages.
 *
 * Flow:
 *   1. ABA Mobile (or a forwarder) posts each successful incoming payment as a
 *      message to a Telegram chat that our bot is part of.
 *   2. Client calls this function with { reference, amount } (the values it
 *      embedded into the KHQR).
 *   3. We call Telegram `getUpdates` and look at recent messages from the
 *      configured chat for one that contains the reference AND the amount.
 *   4. If found → return { paid: true }. Otherwise { paid: false }.
 *
 * Required Supabase secrets:
 *   - TELEGRAM_BOT_TOKEN  Bot used to read messages.
 *   - TELEGRAM_CHAT_ID    Optional. If set, only messages from this chat count.
 *
 * Notes:
 *   - The bot must NOT have a webhook registered, or getUpdates returns 409.
 *   - getUpdates by default returns the last ~24h of unconfirmed updates, which
 *     is plenty for a 5-minute KHQR window.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_KHQR_AGE_SECONDS = 10 * 60;
const MAX_KHQR_FUTURE_SKEW_SECONDS = 30;

type TgMessage = {
  message_id: number;
  date: number;
  chat?: { id: number | string };
  text?: string;
  caption?: string;
};

type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  channel_post?: TgMessage;
  edited_message?: TgMessage;
  edited_channel_post?: TgMessage;
};

function pickText(u: TgUpdate): { text: string; chatId: string | null; date: number } | null {
  const m = u.message ?? u.channel_post ?? u.edited_message ?? u.edited_channel_post;
  if (!m) return null;
  const text = (m.text ?? m.caption ?? "").trim();
  if (!text) return null;
  return {
    text,
    chatId: m.chat?.id != null ? String(m.chat.id) : null,
    date: m.date ?? 0,
  };
}

function amountMatches(text: string, amount: number): boolean {
  // Match "12.34", "12.3", "12", or KHR-style "3,006".
  // We only require the numeric value to appear as its own token.
  const target = Number(amount);
  if (!isFinite(target) || target <= 0) return false;
  const rounded = Math.round(target);
  const variants = new Set<string>([
    target.toFixed(2),
    target.toFixed(1),
    String(target),
    String(rounded),
    rounded.toLocaleString("en-US"),
  ]);
  const haystacks = [text, text.replace(/,/g, "")];
  for (const v of variants) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^0-9])${escaped}(?:[^0-9]|$)`);
    if (haystacks.some((haystack) => re.test(haystack))) return true;
  }
  return false;
}

function validateSinceSec(sinceSec: number): string | null {
  if (!Number.isFinite(sinceSec) || sinceSec <= 0) return "Payment timestamp is required";
  const now = Math.floor(Date.now() / 1000);
  if (sinceSec > now + MAX_KHQR_FUTURE_SKEW_SECONDS) return "Payment timestamp is in the future";
  if (now - sinceSec > MAX_KHQR_AGE_SECONDS) return "Payment QR has expired";
  return null;
}

Deno.serve(withSecurity("verify-aba-telegram", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    const chatIdFilter = Deno.env.get("TELEGRAM_CHAT_ID") ?? null;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const reference: string | undefined = body.reference;
    const amount: number | undefined = body.amount != null ? Number(body.amount) : undefined;
    const sinceSec: number = Number(body.sinceSec ?? 0); // optional unix seconds floor

    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[A-Za-z0-9_-]{8,25}$/.test(reference)) {
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sinceError = validateSinceSec(sinceSec);
    if (sinceError) {
      return new Response(JSON.stringify({ error: sinceError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // getUpdates with timeout=0 → return immediately with whatever is buffered.
    // We pass allowed_updates to keep the payload small.
    const tgUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const resp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeout: 0,
        allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post"],
      }),
    });

    const tg = await resp.json().catch(() => ({}));
    if (!resp.ok || !tg?.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          paid: false,
          error: "telegram_getUpdates_failed",
          telegram: tg,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updates: TgUpdate[] = Array.isArray(tg.result) ? tg.result : [];
    const refLower = reference.toLowerCase();

    let match: { update_id: number; text: string; date: number; chatId: string | null } | null = null;
    for (const u of updates) {
      const m = pickText(u);
      if (!m) continue;
      if (sinceSec && m.date && m.date < sinceSec) continue;
      if (chatIdFilter && m.chatId && m.chatId !== chatIdFilter) continue;
      if (!m.text.toLowerCase().includes(refLower)) continue;
      if (amount != null && !amountMatches(m.text, amount)) continue;
      match = { update_id: u.update_id, text: m.text, date: m.date, chatId: m.chatId };
      break;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        paid: !!match,
        match,
        scanned: updates.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, paid: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
