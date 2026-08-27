/**
 * Emergency server-side boundary for unapproved creator monetization.
 *
 * This is deliberately independent of the browser. Creator tips, paid tiers,
 * paid-media unlocks, creator payouts, virtual-coin funding/gifts, and peer-to-
 * peer value transfers stay unavailable until the platform has the payment-
 * provider approval and operating controls required for those products.
 *
 * Keep cancellation, refund, dispute, and history/read paths available. They
 * let customers unwind an existing purchase without opening new money movement.
 */

export const CREATOR_MONETIZATION_BLOCKED_CODE =
  "creator_monetization_unavailable";

export const CREATOR_MONETIZATION_BLOCKED_MESSAGE =
  "Creator payments and peer-to-peer value transfers are not available.";

/**
 * Central kill switch used by dedicated creator-value endpoints.
 *
 * Keep this as a function instead of an inline literal so the disabled paths
 * remain lintable and can retain their prior implementation for safe rollback.
 */
export function isCreatorMonetizationDisabled(): boolean {
  return true;
}

export function creatorMonetizationBlockedResponse(
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: CREATOR_MONETIZATION_BLOCKED_CODE,
      code: CREATOR_MONETIZATION_BLOCKED_CODE,
      message: CREATOR_MONETIZATION_BLOCKED_MESSAGE,
    }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Signed provider webhooks must be acknowledged after verification so the
 * provider does not retry forever. This response records that the event was
 * intentionally ignored while guaranteeing that no creator value is credited.
 */
export function creatorMonetizationWebhookAcknowledgement(
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      received: true,
      ignored: true,
      code: CREATOR_MONETIZATION_BLOCKED_CODE,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

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
 * Classifies a signed-in account for shared Connect/wallet payout endpoints.
 *
 * A creator_profiles row is the canonical creator-program enrollment. The
 * profiles fallback catches legacy/self-designated creator accounts. Database
 * errors fail closed; an outage must not turn a shared payout endpoint into an
 * accidental bypass.
 */
export async function isCreatorMonetizationAccount(
  admin: AdminLike,
  userId: string | null | undefined,
): Promise<boolean> {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) return true;

  try {
    const creatorProfile = await admin
      .from("creator_profiles")
      .select("user_id")
      .eq("user_id", id)
      .maybeSingle();
    if (creatorProfile.error) return true;
    if (creatorProfile.data) return true;

    const profile = await admin
      .from("profiles")
      .select("is_of_creator, creator_type")
      .eq("user_id", id)
      .maybeSingle();
    if (profile.error || !profile.data) return true;

    const row = profile.data as {
      is_of_creator?: boolean | null;
      creator_type?: string | null;
    };
    return row.is_of_creator === true ||
      String(row.creator_type ?? "").trim() !== "";
  } catch {
    return true;
  }
}
