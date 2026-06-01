/**
 * share-to-earn-manage
 * --------------------
 * Server-gated referral sharing and reward issuance.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const REWARD_POINTS = 100;
const REWARD_CREDIT_CENTS = 100;
const PLATFORM_SET = new Set(["telegram", "whatsapp", "copy"]);

type Body = {
  action?: unknown;
  post_id?: unknown;
  platform?: unknown;
  buyer_user_id?: unknown;
  order_id?: unknown;
};

serve(withSecurity("share-to-earn-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;

  if (body.action === "generate_share") {
    const postId = cleanText(body.post_id, 128);
    const platform = cleanPlatform(body.platform);
    if (!postId || !platform) return json({ error: "Invalid share request" }, 400);

    const referralCode = await getOrCreateReferralCode(admin, user.id);
    if (!referralCode) return json({ error: "Could not create referral code" }, 500);

    const { error } = await admin.from("referral_shares").insert({
      referrer_id: user.id,
      referral_code: referralCode,
      post_id: postId,
      platform,
      shared_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[share-to-earn-manage:share]", error.message);
      return json({ error: "Could not record share" }, 500);
    }

    return json({ ok: true, referral_code: referralCode });
  }

  if (body.action === "credit_reward") {
    const buyerUserId = cleanText(body.buyer_user_id, 64);
    const orderId = cleanText(body.order_id, 128);
    if (!orderId || (buyerUserId && buyerUserId !== user.id)) {
      return json({ error: "Invalid reward request" }, 400);
    }

    const { data: referralEntry, error: referralError } = await admin
      .from("referral_conversions")
      .select("id, referrer_id, status")
      .eq("buyer_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (referralError) {
      console.error("[share-to-earn-manage:lookup]", referralError.message);
      return json({ error: "Could not verify referral" }, 500);
    }
    if (!referralEntry) return json({ ok: true, credited: false });
    if (!referralEntry.referrer_id || referralEntry.referrer_id === user.id) {
      await markConversion(admin, referralEntry.id, orderId, "rejected");
      return json({ ok: true, credited: false });
    }

    const referrerWallet = await creditWallet(
      admin,
      referralEntry.referrer_id,
      REWARD_CREDIT_CENTS,
      "Share-to-Earn reward - your friend made a purchase!",
      orderId,
    );
    const buyerWallet = await creditWallet(
      admin,
      user.id,
      REWARD_CREDIT_CENTS,
      "Welcome reward - $1.00 credit for your first purchase!",
      orderId,
    );
    const referrerPoints = await creditLoyalty(admin, referralEntry.referrer_id, REWARD_POINTS);
    const buyerPoints = await creditLoyalty(admin, user.id, REWARD_POINTS);

    if (!referrerWallet || !buyerWallet || !referrerPoints || !buyerPoints) {
      return json({ error: "Could not issue reward" }, 500);
    }

    const marked = await markConversion(admin, referralEntry.id, orderId, "credited");
    if (!marked) return json({ error: "Could not mark referral credited" }, 500);

    return json({ ok: true, credited: true });
  }

  return json({ error: "Invalid action" }, 400);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getOrCreateReferralCode(admin: any, userId: string): Promise<string | null> {
  const { data: existing, error: lookupError } = await admin
    .from("user_referral_codes")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) {
    console.error("[share-to-earn-manage:code-lookup]", lookupError.message);
    return null;
  }
  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const referralCode = `Z${userId.slice(0, 3).toUpperCase()}${crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase()}`;
    const { data, error } = await admin
      .from("user_referral_codes")
      .insert({ user_id: userId, referral_code: referralCode })
      .select("referral_code")
      .maybeSingle();
    if (!error && data?.referral_code) return data.referral_code;
    if (!String(error?.message ?? "").toLowerCase().includes("duplicate")) {
      console.error("[share-to-earn-manage:code-create]", error?.message);
      return null;
    }
  }
  return null;
}

async function creditWallet(
  admin: any,
  userId: string,
  amountCents: number,
  description: string,
  referenceId: string,
): Promise<boolean> {
  const { data: wallet, error: walletError } = await admin
    .from("customer_wallets")
    .select("balance_cents, lifetime_credits_cents")
    .eq("user_id", userId)
    .maybeSingle();
  if (walletError) {
    console.error("[share-to-earn-manage:wallet-lookup]", walletError.message);
    return false;
  }

  const currentBalance = Number(wallet?.balance_cents ?? 0);
  const currentLifetime = Number(wallet?.lifetime_credits_cents ?? 0);
  const newBalance = currentBalance + amountCents;

  const walletWrite = wallet
    ? admin
      .from("customer_wallets")
      .update({ balance_cents: newBalance, lifetime_credits_cents: currentLifetime + amountCents })
      .eq("user_id", userId)
    : admin
      .from("customer_wallets")
      .insert({ user_id: userId, balance_cents: newBalance, lifetime_credits_cents: amountCents });
  const { error: updateError } = await walletWrite;
  if (updateError) {
    console.error("[share-to-earn-manage:wallet-update]", updateError.message);
    return false;
  }

  const { error } = await admin.from("customer_wallet_transactions").insert({
    user_id: userId,
    amount_cents: amountCents,
    balance_after_cents: newBalance,
    type: "credit",
    description,
    reference_id: referenceId,
  });
  if (error) {
    console.error("[share-to-earn-manage:wallet-ledger]", error.message);
    return false;
  }

  return true;
}

async function creditLoyalty(admin: any, userId: string, points: number): Promise<boolean> {
  const { data: existing, error: lookupError } = await admin
    .from("loyalty_points")
    .select("points_balance, lifetime_points")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) {
    console.error("[share-to-earn-manage:loyalty-lookup]", lookupError.message);
    return false;
  }

  const pointsBalance = Number(existing?.points_balance ?? 0) + points;
  const lifetimePoints = Number(existing?.lifetime_points ?? 0) + points;
  const tier = tierFor(lifetimePoints);

  const write = existing
    ? admin
      .from("loyalty_points")
      .update({ points_balance: pointsBalance, lifetime_points: lifetimePoints, tier })
      .eq("user_id", userId)
    : admin
      .from("loyalty_points")
      .insert({ user_id: userId, points_balance: pointsBalance, lifetime_points: lifetimePoints, tier });
  const { error } = await write;
  if (error) {
    console.error("[share-to-earn-manage:loyalty-write]", error.message);
    return false;
  }

  return true;
}

async function markConversion(
  admin: any,
  id: string,
  orderId: string,
  status: "credited" | "rejected",
): Promise<boolean> {
  const { error } = await admin
    .from("referral_conversions")
    .update({ status, credited_at: new Date().toISOString(), order_id: orderId })
    .eq("id", id);
  if (error) {
    console.error("[share-to-earn-manage:conversion-mark]", error.message);
    return false;
  }
  return true;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function cleanPlatform(value: unknown): "telegram" | "whatsapp" | "copy" | null {
  if (typeof value !== "string" || !PLATFORM_SET.has(value)) return null;
  return value as "telegram" | "whatsapp" | "copy";
}

function tierFor(lifetimePoints: number): "standard" | "bronze" | "silver" | "gold" {
  if (lifetimePoints >= 5000) return "gold";
  if (lifetimePoints >= 2000) return "silver";
  if (lifetimePoints >= 500) return "bronze";
  return "standard";
}
