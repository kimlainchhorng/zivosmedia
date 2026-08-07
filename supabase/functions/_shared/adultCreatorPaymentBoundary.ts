/**
 * Keeps adult-creator earnings off the Stripe account.
 *
 * ZIVO lets creators self-designate as adult ("OF") creators, and the platform's
 * own age gate tells visitors those creators "may post explicit 18+ content".
 * Paid access to that content — pay-per-view media unlocks, tier subscriptions,
 * and tips — was being charged through the same Stripe account as rides, food,
 * and travel.
 *
 * Adult content and services sit on Stripe's restricted-businesses list, which
 * names pay-per-view and adult subscription content specifically. Processing it
 * on a general Stripe account risks the account the entire platform depends on:
 * losing it would stop rides and deliveries, not just creator payouts.
 *
 * So this is a boundary, not a content-moderation rule. It takes no view on
 * whether a creator may publish; it decides only which processor may settle
 * their paid content. Everything else on ZIVO is untouched.
 *
 * ── Enforced server-side, deliberately ──
 * The browser knows which creator it is paying, but the browser is not an
 * authorization boundary. `is_of_creator` is read here with the service role,
 * from the creator's own profile row, so a crafted request cannot present an
 * adult creator as an ordinary one.
 *
 * ── Extension point ──
 * When an adult-permitted processor is in place (Stripe will not be one), route
 * these charges to it at the call sites that currently return
 * `adult_creator_payments_unavailable`. Until then the honest answer to the
 * buyer is that this cannot be paid for right now — which is far better than a
 * successful charge that later costs the platform its account.
 */

export const ADULT_CREATOR_PAYMENTS_BLOCKED_CODE = "adult_creator_payments_unavailable";

export const ADULT_CREATOR_PAYMENTS_BLOCKED_MESSAGE =
  "Paid content from this creator is temporarily unavailable to purchase.";

interface AdminLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

/**
 * True when this account is an adult creator, and therefore may not be paid
 * through Stripe.
 *
 * Fails CLOSED. A lookup that errors, or a profile row that cannot be read,
 * returns true and blocks the charge. The alternative — treating an unknown
 * account as ordinary — means a transient database error is all it takes to put
 * a restricted transaction through the platform's Stripe account, and nobody
 * would see it happen.
 */
export async function isAdultCreatorAccount(
  admin: AdminLike,
  creatorUserId: string | null | undefined,
): Promise<boolean> {
  const id = typeof creatorUserId === "string" ? creatorUserId.trim() : "";
  if (!id) return true;

  try {
    const { data, error } = await admin
      .from("profiles")
      .select("is_of_creator, creator_type")
      .eq("user_id", id)
      .maybeSingle();

    if (error || !data) return true;

    const row = data as { is_of_creator?: boolean | null; creator_type?: string | null };
    if (row.is_of_creator === true) return true;
    // `creator_type` is the newer field; useCreatorType derives "of" from either,
    // so both are checked rather than trusting whichever happens to be set.
    return String(row.creator_type ?? "").trim().toLowerCase() === "of";
  } catch {
    return true;
  }
}

/**
 * Ready-made refusal for a call site that has found an adult creator.
 *
 * 409 rather than 403: the buyer is not forbidden and re-authenticating will not
 * help. The request conflicts with the state of the thing being bought, and a
 * client should surface it rather than retry.
 */
export function adultCreatorPaymentBlockedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: ADULT_CREATOR_PAYMENTS_BLOCKED_CODE,
      message: ADULT_CREATOR_PAYMENTS_BLOCKED_MESSAGE,
    }),
    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
