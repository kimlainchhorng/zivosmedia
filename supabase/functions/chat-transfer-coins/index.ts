// chat-transfer-coins — peer-to-peer coin transfer + chat message
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("chat-transfer-coins", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: udata } = await userClient.auth.getUser();
    if (!udata?.user) return json({ error: "Unauthorized" }, 401, corsHeaders);
    const fromUser = udata.user.id;

    const body = await req.json().catch(() => ({}));
    const toUser = String(body.to_user || "").trim();
    const amount = Math.max(1, Math.floor(Number(body.amount) || 0));
    const note = body.note ? String(body.note).slice(0, 200) : null;

    if (!toUser || amount <= 0) return json({ error: "Invalid input" }, 400, corsHeaders);
    if (toUser === fromUser) return json({ error: "Cannot send to yourself" }, 400, corsHeaders);

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: rpcErr } = await admin.rpc("fn_transfer_coins", {
      p_from: fromUser, p_to: toUser, p_amount: amount,
    });
    if (rpcErr) return json({ error: rpcErr.message || "Transfer failed" }, 400, corsHeaders);

    const { data: msg, error: msgErr } = await admin
      .from("direct_messages")
      .insert({
        sender_id: fromUser,
        receiver_id: toUser,
        message: `💰 Sent ${amount} coins${note ? ` — ${note}` : ""}`,
        message_type: "coin_transfer",
        gift_payload: { amount, note, kind: "coin_transfer" },
      })
      .select("id").single();
    if (msgErr) return json({ error: "Transfer ok, message failed", message_error: msgErr.message }, 207, corsHeaders);

    await admin.from("coin_transfers").insert({
      from_user: fromUser, to_user: toUser, amount, note, message_id: msg.id, status: "completed",
    });

    const { data: bal } = await admin.from("user_coin_balances").select("balance").eq("user_id", fromUser).maybeSingle();
    return json({ ok: true, message_id: msg.id, new_balance: bal?.balance ?? null }, 200, corsHeaders);
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500, ctx.corsHeaders);
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function json(o: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(o), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
