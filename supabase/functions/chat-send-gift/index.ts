// chat-send-gift - debit coins, insert gift message, log gift_transactions
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TOTAL_GIFT_COINS = 5_000_000;

Deno.serve(withSecurity("chat-send-gift", async (req, ctx) => {
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
    const { data: udata, error: uerr } = await userClient.auth.getUser();
    if (uerr || !udata?.user) return json({ error: "Unauthorized" }, 401, corsHeaders);
    const senderId = udata.user.id;

    const body = await req.json().catch(() => ({}));
    const recipientId = String(body.recipient_id || "").trim();
    const giftKey = String(body.gift_key || "").trim().slice(0, 80);
    const giftName = String(body.gift_name || "").trim().slice(0, 120);
    const coins = Math.max(0, Math.floor(Number(body.coins) || 0));
    const combo = Math.max(1, Math.min(50, Math.floor(Number(body.combo) || 1)));
    const note = body.note ? String(body.note).slice(0, 200) : null;
    const icon = body.icon ? String(body.icon).slice(0, 32) : null;

    if (!UUID_RE.test(recipientId) || !giftKey || coins <= 0) return json({ error: "Invalid input" }, 400, corsHeaders);
    if (recipientId === senderId) return json({ error: "Cannot gift yourself" }, 400, corsHeaders);

    const totalCoins = coins * combo;
    if (!Number.isSafeInteger(totalCoins) || totalCoins <= 0 || totalCoins > MAX_TOTAL_GIFT_COINS) {
      return json({ error: "Invalid gift cost" }, 400, corsHeaders);
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const debit = await debitCoins(admin, senderId, totalCoins);
    if (!debit.ok) {
      return json({ error: debit.error, balance: debit.balance ?? null }, debit.status, corsHeaders);
    }
    const currentBal = debit.previousBalance;
    const newBalance = debit.newBalance;

    const payload = { icon, name: giftName || giftKey, gift_key: giftKey, coins, combo, total_coins: totalCoins, note };
    const { data: msg, error: msgErr } = await admin
      .from("direct_messages")
      .insert({
        sender_id: senderId,
        receiver_id: recipientId,
        message: `Gift: ${giftName || giftKey}${combo > 1 ? ` x${combo}` : ""} (${totalCoins} coins)`,
        message_type: "gift",
        gift_payload: payload,
      })
      .select("id")
      .single();

    if (msgErr) {
      await refundGiftDebit(admin, senderId, currentBal, newBalance);
      return json({ error: "Could not send message" }, 500, corsHeaders);
    }

    await admin.rpc("fn_record_gift_transaction", {
      p_sender: senderId,
      p_receiver: recipientId,
      p_gift_key: giftKey,
      p_gift_name: giftName || giftKey,
      p_coins: coins,
      p_combo: combo,
      p_note: note,
      p_message_id: msg.id,
    });

    return json({ ok: true, message_id: msg.id, new_balance: newBalance }, 200, corsHeaders);
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500, corsHeaders);
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

async function refundGiftDebit(admin: any, senderId: string, previousBalance: number, debitedBalance: number) {
  try {
    await admin
      .from("user_coin_balances")
      .update({ balance: previousBalance, updated_at: new Date().toISOString() })
      .eq("user_id", senderId)
      .eq("balance", debitedBalance);
  } catch {
    // Keep the original send error visible and avoid overwriting a newer balance.
  }
}

function json(o: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(o), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
