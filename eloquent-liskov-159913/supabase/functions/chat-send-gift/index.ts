// chat-send-gift — debit coins, insert gift message, log gift_transactions
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: udata, error: uerr } = await userClient.auth.getUser();
    if (uerr || !udata?.user) return json({ error: "Unauthorized" }, 401);
    const senderId = udata.user.id;

    const body = await req.json().catch(() => ({}));
    const recipientId = String(body.recipient_id || "").trim();
    const giftKey = String(body.gift_key || "").trim();
    const giftName = String(body.gift_name || "").trim();
    const coins = Math.max(0, Math.floor(Number(body.coins) || 0));
    const combo = Math.max(1, Math.min(50, Math.floor(Number(body.combo) || 1)));
    const note = body.note ? String(body.note).slice(0, 200) : null;
    const icon = body.icon ? String(body.icon).slice(0, 32) : null;

    if (!recipientId || !giftKey || coins <= 0) return json({ error: "Invalid input" }, 400);
    if (recipientId === senderId) return json({ error: "Cannot gift yourself" }, 400);

    const totalCoins = coins * combo;
    const admin = createClient(url, service);

    // Ensure balance row exists
    await admin.from("user_coin_balances").upsert({ user_id: senderId }, { onConflict: "user_id" });

    // Check + debit atomically via RPC (transfer to platform sink? simpler: call fn_transfer_coins to recipient OR just deduct)
    // We deduct from sender into a virtual "house" by direct update inside a transaction-like RPC.
    // Simpler: use fn_transfer_coins to transfer from sender to recipient (gifts give recipient coin equivalent? NO, recipients get gift, not coins).
    // So we just debit sender. Use service role with row-lock via SQL.
    const { data: bal } = await admin.from("user_coin_balances").select("balance").eq("user_id", senderId).maybeSingle();
    const currentBal = bal?.balance ?? 0;
    if (currentBal < totalCoins) return json({ error: "Insufficient coins", balance: currentBal }, 402);

    const { error: debErr } = await admin
      .from("user_coin_balances")
      .update({ balance: currentBal - totalCoins, updated_at: new Date().toISOString() })
      .eq("user_id", senderId);
    if (debErr) return json({ error: "Debit failed" }, 500);

    // Insert chat message
    const payload = { icon, name: giftName || giftKey, gift_key: giftKey, coins, combo, total_coins: totalCoins, note };
    const { data: msg, error: msgErr } = await admin
      .from("direct_messages")
      .insert({
        sender_id: senderId,
        receiver_id: recipientId,
        message: `🎁 ${giftName || giftKey}${combo > 1 ? ` x${combo}` : ""} (${totalCoins} coins)`,
        message_type: "gift",
        gift_payload: payload,
      })
      .select("id")
      .single();
    if (msgErr) {
      // refund
      await admin.from("user_coin_balances").update({ balance: currentBal }).eq("user_id", senderId);
      return json({ error: "Could not send message" }, 500);
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

    return json({ ok: true, message_id: msg.id, new_balance: currentBal - totalCoins });
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
