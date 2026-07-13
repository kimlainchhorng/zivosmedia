/**
 * loyalty-points-manage
 * ---------------------
 * Server-gated initialization, earning, and redemption of loyalty balances.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const POINTS_PER_DOLLAR = 1;
const POINTS_TO_DOLLAR = 100;
const MIN_REDEMPTION_POINTS = 500;
const MAX_EARN_AMOUNT_DOLLARS = 10_000;
const MAX_BONUS_POINTS = 10_000;

type LoyaltyTier = "standard" | "bronze" | "silver" | "gold";

type Body = {
  action?: unknown;
  amount_spent?: unknown;
  bonus_points?: unknown;
  points_to_redeem?: unknown;
  reference_type?: unknown;
  reference_id?: unknown;
  description?: unknown;
};

serve(withSecurity("loyalty-points-manage", async (req, ctx) => {
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

  if (body.action === "initialize") {
    const points = await ensurePoints(admin, user.id);
    if (!points) return json({ error: "Could not initialize points" }, 500);
    return json({ ok: true, points });
  }

  if (body.action === "earn") {
    const amountSpent = cleanNumber(body.amount_spent, 0, MAX_EARN_AMOUNT_DOLLARS);
    const bonusPoints = cleanInteger(body.bonus_points, 0, MAX_BONUS_POINTS) ?? 0;
    const referenceType = cleanText(body.reference_type, 40);
    const referenceId = cleanText(body.reference_id, 128);
    const description = cleanText(body.description, 180) ?? "Loyalty points earned";
    if (amountSpent === null || !referenceType || !referenceId) {
      return json({ error: "Invalid earn request" }, 400);
    }

    const current = await ensurePoints(admin, user.id);
    if (!current) return json({ error: "Could not load points" }, 500);

    const tierBonus = tierBonusFor(current.tier);
    const basePoints = Math.floor(amountSpent * POINTS_PER_DOLLAR);
    const bonusFromTier = Math.floor(basePoints * tierBonus);
    const totalEarned = basePoints + bonusFromTier + bonusPoints;
    if (totalEarned <= 0) return json({ error: "No points to earn" }, 400);

    const next = await writePoints(admin, user.id, {
      points_balance: current.points_balance + totalEarned,
      lifetime_points: current.lifetime_points + totalEarned,
      tier: tierFor(current.lifetime_points + totalEarned),
      tier_updated_at: tierFor(current.lifetime_points + totalEarned) !== current.tier ? new Date().toISOString() : current.tier_updated_at,
    });
    if (!next) return json({ error: "Could not earn points" }, 500);

    await recordLoyaltyTransaction(admin, {
      userId: user.id,
      amount: totalEarned,
      balanceAfter: next.points_balance,
      type: "loyalty_earn",
      description,
      referenceId,
      referenceType,
    });

    return json({ ok: true, earned: totalEarned, newBalance: next.points_balance, newTier: next.tier });
  }

  if (body.action === "redeem") {
    const pointsToRedeem = cleanInteger(body.points_to_redeem, MIN_REDEMPTION_POINTS, 10_000_000);
    const referenceType = cleanText(body.reference_type, 40);
    const referenceId = cleanText(body.reference_id, 128);
    if (pointsToRedeem === null || !referenceType || !referenceId) {
      return json({ error: `Minimum redemption is ${MIN_REDEMPTION_POINTS} points` }, 400);
    }

    const current = await ensurePoints(admin, user.id);
    if (!current) return json({ error: "No points balance" }, 400);
    if (pointsToRedeem > current.points_balance) return json({ error: "Insufficient points" }, 400);

    const newBalance = current.points_balance - pointsToRedeem;
    const next = await writePoints(admin, user.id, {
      points_balance: newBalance,
      lifetime_points: current.lifetime_points,
      tier: current.tier,
      tier_updated_at: current.tier_updated_at,
    });
    if (!next) return json({ error: "Could not redeem points" }, 500);

    await recordLoyaltyTransaction(admin, {
      userId: user.id,
      amount: -pointsToRedeem,
      balanceAfter: newBalance,
      type: "loyalty_redeem",
      description: `Redeemed ${pointsToRedeem} points`,
      referenceId,
      referenceType,
    });

    return json({
      ok: true,
      redeemed: pointsToRedeem,
      discountValue: pointsToRedeem / POINTS_TO_DOLLAR,
      newBalance,
    });
  }

  return json({ error: "Invalid action" }, 400);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function ensurePoints(admin: any, userId: string): Promise<any | null> {
  const { data: existing, error: lookupError } = await admin
    .from("loyalty_points")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) {
    console.error("[loyalty-points-manage:lookup]", lookupError.message);
    return null;
  }
  if (existing) return existing;

  const { data, error } = await admin
    .from("loyalty_points")
    .insert({ user_id: userId, points_balance: 0, lifetime_points: 0, tier: "standard" })
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[loyalty-points-manage:initialize]", error.message);
    return null;
  }
  return data;
}

async function writePoints(admin: any, userId: string, values: Record<string, unknown>): Promise<any | null> {
  const { data, error } = await admin
    .from("loyalty_points")
    .update(values)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[loyalty-points-manage:write]", error.message);
    return null;
  }
  return data;
}

async function recordLoyaltyTransaction(
  admin: any,
  event: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: "loyalty_earn" | "loyalty_redeem";
    description: string;
    referenceId: string;
    referenceType: string;
  },
): Promise<void> {
  const { error } = await admin.from("customer_wallet_transactions").insert({
    user_id: event.userId,
    amount_cents: event.amount,
    balance_after_cents: event.balanceAfter,
    type: event.type,
    description: `${event.description} (${event.referenceType})`,
    reference_id: event.referenceId,
  });
  if (error) console.error("[loyalty-points-manage:ledger]", error.message);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function tierBonusFor(tier: LoyaltyTier): number {
  if (tier === "gold") return 0.15;
  if (tier === "silver") return 0.10;
  if (tier === "bronze") return 0.05;
  return 0;
}

function tierFor(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= 15_000) return "gold";
  if (lifetimePoints >= 5_000) return "silver";
  if (lifetimePoints >= 1_000) return "bronze";
  return "standard";
}
