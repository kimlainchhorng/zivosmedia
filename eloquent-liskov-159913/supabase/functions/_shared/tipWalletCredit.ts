/**
 * Shared helper — credit a successful creator tip to the creator's customer_wallets.
 *
 * Idempotent via reference_id = "creator_tip:{tipId}". Calling this twice for
 * the same tip is a no-op the second time, so it is safe to call from every
 * webhook + capture path (Stripe checkout, Stripe PI, PayPal capture/webhook,
 * Square webhook).
 *
 * Returns true if the wallet was credited (or already credited), false on
 * unrecoverable error.
 */

export interface TipForWalletCredit {
  id: string;
  creator_id: string;
  amount_cents: number;
  tipper_id?: string | null;
  is_anonymous?: boolean | null;
  message?: string | null;
}

export async function creditCreatorTipToWallet(
  supabase: any,
  tip: TipForWalletCredit,
): Promise<boolean> {
  if (!tip?.id || !tip?.creator_id || !tip?.amount_cents || tip.amount_cents <= 0) {
    console.warn("[tipWalletCredit] invalid tip payload", tip);
    return false;
  }

  const referenceId = `creator_tip:${tip.id}`;

  try {
    // Idempotency: bail early if a wallet tx for this tip already exists.
    const { data: existingTx } = await supabase
      .from("customer_wallet_transactions")
      .select("id")
      .eq("reference_id", referenceId)
      .maybeSingle();
    if (existingTx) {
      console.log("[tipWalletCredit] already applied", { tip: tip.id });
      return true;
    }

    const { data: wallet } = await supabase
      .from("customer_wallets")
      .select("balance_cents, lifetime_credits_cents")
      .eq("user_id", tip.creator_id)
      .maybeSingle();

    const oldBalance = wallet?.balance_cents ?? 0;
    const oldLifetime = wallet?.lifetime_credits_cents ?? 0;
    const newBalance = oldBalance + tip.amount_cents;
    const newLifetime = oldLifetime + tip.amount_cents;

    const { error: upErr } = await supabase
      .from("customer_wallets")
      .upsert(
        {
          user_id: tip.creator_id,
          balance_cents: newBalance,
          lifetime_credits_cents: newLifetime,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (upErr) {
      console.error("[tipWalletCredit] wallet upsert failed", upErr);
      return false;
    }

    const description = tip.message
      ? `Tip received — "${String(tip.message).slice(0, 80)}"`
      : "Tip received";

    const { error: txErr } = await supabase
      .from("customer_wallet_transactions")
      .insert({
        user_id: tip.creator_id,
        amount_cents: tip.amount_cents,
        balance_after_cents: newBalance,
        type: "tip",
        description,
        reference_id: referenceId,
      });
    if (txErr) {
      console.error("[tipWalletCredit] tx insert failed; rolling back balance", txErr);
      // Roll back the balance bump so we don't end up with credit but no record
      await supabase
        .from("customer_wallets")
        .update({ balance_cents: oldBalance, lifetime_credits_cents: oldLifetime })
        .eq("user_id", tip.creator_id);
      return false;
    }

    console.log("[tipWalletCredit] credited", {
      tip: tip.id,
      creator: tip.creator_id,
      cents: tip.amount_cents,
      new_balance: newBalance,
    });
    return true;
  } catch (e) {
    console.error("[tipWalletCredit] unexpected error", e);
    return false;
  }
}
