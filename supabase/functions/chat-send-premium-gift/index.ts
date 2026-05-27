// chat-send-premium-gift - debit Z-Coins and grant fixed-duration ZIVO Premium to a chat recipient.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PREMIUM_GIFT_DURATIONS: Record<string, { label: string; months: number; coins: number }> = {
  "three-months": { label: "3 months", months: 3, coins: 1000 },
  "six-months": { label: "6 months", months: 6, coins: 1500 },
  "one-year": { label: "1 year", months: 12, coins: 2500 },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(withSecurity("chat-send-premium-gift", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const senderId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const recipientId = String(body.recipient_id || "").trim();
    const recipientName = String(body.recipient_name || "this chat").slice(0, 120);
    const durationKey = String(body.duration || "three-months");
    const duration = PREMIUM_GIFT_DURATIONS[durationKey];

    if (!UUID_RE.test(recipientId)) return json({ error: "Invalid recipient" }, 400, corsHeaders);
    if (recipientId === senderId) return json({ error: "Cannot gift yourself" }, 400, corsHeaders);
    if (!duration) return json({ error: "Invalid premium gift duration" }, 400, corsHeaders);

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: plan, error: planError } = await admin
      .from("zivo_subscription_plans")
      .select("id")
      .eq("slug", "zivo-plus")
      .eq("is_active", true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan?.id) return json({ error: "ZIVO+ plan is not configured" }, 500, corsHeaders);

    const debit = await debitCoins(admin, senderId, duration.coins);
    if (!debit.ok) {
      return json(
        { error: debit.error, balance: debit.balance ?? null },
        debit.status,
        corsHeaders,
      );
    }
    const currentBalance = debit.previousBalance;
    const newBalance = debit.newBalance;

    try {
      const subscriptionId = await grantPremiumGift(admin, {
        userId: recipientId,
        planId: plan.id,
        months: duration.months,
        billingCycle: duration.months >= 12 ? "yearly" : "monthly",
      });

      const giftPayload = {
        kind: "premium_gift",
        gift_key: `zivo_premium_${durationKey}`,
        name: `ZIVO Premium ${duration.label}`,
        icon: "Premium",
        coins: duration.coins,
        total_coins: duration.coins,
        premium_months: duration.months,
        subscription_id: subscriptionId,
      };

      const { data: message, error: messageError } = await admin
        .from("direct_messages")
        .insert({
          sender_id: senderId,
          receiver_id: recipientId,
          message: `Gifted ${recipientName} ${duration.label} of ZIVO Premium`,
          message_type: "gift",
          gift_payload: giftPayload,
        })
        .select("id")
        .single();

      if (messageError) throw messageError;

      await admin.rpc("fn_record_gift_transaction", {
        p_sender: senderId,
        p_receiver: recipientId,
        p_gift_key: giftPayload.gift_key,
        p_gift_name: giftPayload.name,
        p_coins: duration.coins,
        p_combo: 1,
        p_note: null,
        p_message_id: message.id,
      });

      await notify(url, service, recipientId, {
        notification_type: "membership_gift_received",
        title: "ZIVO Premium gift received",
        body: `You received ${duration.label} of ZIVO Premium.`,
        data: { type: "membership_gift_received", action_url: "/zivo-plus", subscription_id: subscriptionId },
      });

      return json({ ok: true, new_balance: newBalance, subscription_id: subscriptionId, message_id: message.id }, 200, corsHeaders);
    } catch (giftError) {
      await refundPremiumGiftDebit(admin, senderId, currentBalance, newBalance);
      throw giftError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message || "Internal error" }, 500, corsHeaders);
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

type DebitResult =
  | { ok: true; previousBalance: number; newBalance: number }
  | { ok: false; status: number; error: string; balance?: number };

async function debitCoins(admin: any, senderId: string, cost: number): Promise<DebitResult> {
  await admin.from("user_coin_balances").upsert({ user_id: senderId }, { onConflict: "user_id" });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: balanceRow, error: balanceError } = await admin
      .from("user_coin_balances")
      .select("balance")
      .eq("user_id", senderId)
      .maybeSingle();

    if (balanceError) throw balanceError;
    const previousBalance = Number(balanceRow?.balance ?? 0);
    if (previousBalance < cost) {
      return { ok: false, status: 402, error: "Insufficient coins", balance: previousBalance };
    }

    const nextBalance = previousBalance - cost;
    const { data: updatedBalance, error: debitError } = await admin
      .from("user_coin_balances")
      .update({ balance: nextBalance, updated_at: new Date().toISOString() })
      .eq("user_id", senderId)
      .eq("balance", previousBalance)
      .select("balance")
      .maybeSingle();

    if (debitError) throw debitError;
    if (updatedBalance) {
      return {
        ok: true,
        previousBalance,
        newBalance: Number(updatedBalance.balance ?? nextBalance),
      };
    }
  }

  return { ok: false, status: 409, error: "Balance changed, please try again" };
}

async function refundPremiumGiftDebit(admin: any, senderId: string, previousBalance: number, debitedBalance: number) {
  try {
    await admin
      .from("user_coin_balances")
      .update({ balance: previousBalance, updated_at: new Date().toISOString() })
      .eq("user_id", senderId)
      .eq("balance", debitedBalance);
  } catch {
    // Avoid hiding the original gift failure. The conditional update above
    // also avoids clobbering a balance changed by another transaction.
  }
}

async function grantPremiumGift(
  admin: any,
  input: { userId: string; planId: string; months: number; billingCycle: string },
) {
  const now = new Date();
  const { data: existing, error: existingError } = await admin
    .from("zivo_subscriptions")
    .select("id, current_period_end")
    .eq("user_id", input.userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const baseEnd = existing?.current_period_end && new Date(existing.current_period_end) > now
    ? new Date(existing.current_period_end)
    : now;
  const periodEnd = addMonthsUtc(baseEnd, input.months);
  const payload = {
    user_id: input.userId,
    plan_id: input.planId,
    status: "active",
    billing_cycle: input.billingCycle === "yearly" ? "yearly" : "monthly",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    stripe_subscription_id: null,
    cancelled_at: null,
  };

  if (existing?.id) {
    const { error } = await admin.from("zivo_subscriptions").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.from("zivo_subscriptions").insert(payload).select("id").single();
  if (error) throw error;
  return data?.id ?? null;
}

function addMonthsUtc(date: Date, months: number) {
  const next = new Date(date.getTime());
  const originalDate = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  if (next.getUTCDate() < originalDate) {
    next.setUTCDate(0);
  }
  return next;
}

async function notify(url: string, serviceKey: string, userId: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${url}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ user_id: userId, ...payload }),
    });
  } catch {
    // Notifications are best effort; the subscription grant is already complete.
  }
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
