/**
 * Rejects payments connected to prohibited adult creator content.
 *
 * ZIVO lets creators self-designate as adult ("OF") creators, and the platform's
 * own age gate tells visitors those creators "may post explicit 18+ content".
 * Paid access to that content — pay-per-view media unlocks, tier subscriptions,
 * and tips — was being charged through the same Stripe account as rides, food,
 * and travel.
 *
 * Adult content and services are prohibited on ZIVO and by the payment account
 * used by the platform. An age gate does not make those transactions eligible,
 * and a different payment rail is not a workaround for prohibited content.
 *
 * This payment boundary is defense in depth alongside content moderation. It
 * does not authorize publishing, selling, or routing adult content elsewhere.
 *
 * ── Enforced server-side, deliberately ──
 * The browser knows which creator it is paying, but the browser is not an
 * authorization boundary. `is_of_creator` is read here with the service role,
 * from the creator's own profile row, so a crafted request cannot present an
 * adult creator as an ordinary one.
 *
 * Call sites return `adult_creator_payments_unavailable`; they must never fall
 * back to another processor.
 */

export const ADULT_CREATOR_PAYMENTS_BLOCKED_CODE =
  "adult_creator_payments_unavailable";

export const ADULT_CREATOR_PAYMENTS_BLOCKED_MESSAGE =
  "Adult creator content and related payments are prohibited.";

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
 * True when this account is an adult creator, so related content and payments
 * must be rejected.
 *
 * Fails CLOSED. A lookup that errors, or a profile row that cannot be read,
 * returns true and blocks the charge. The alternative — treating an unknown
 * account as ordinary — means a transient database error is all it takes to put
 * a prohibited transaction through a payment provider, and nobody
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

    const row = data as {
      is_of_creator?: boolean | null;
      creator_type?: string | null;
    };
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
export function adultCreatorPaymentBlockedResponse(
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: ADULT_CREATOR_PAYMENTS_BLOCKED_CODE,
      message: ADULT_CREATOR_PAYMENTS_BLOCKED_MESSAGE,
    }),
    {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
