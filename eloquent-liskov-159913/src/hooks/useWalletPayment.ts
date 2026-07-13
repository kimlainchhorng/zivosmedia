/**
 * useWalletPayment - Handles deducting ZIVO Wallet balance for Eats orders
 * Uses customer_wallets + customer_wallet_transactions tables
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletPaymentResult {
  success: boolean;
  newBalance?: number;
  transactionId?: string;
}

export async function deductWalletBalance(
  userId: string,
  amountCents: number,
  orderId: string,
  description: string = "Eats order payment"
): Promise<WalletPaymentResult> {
  try {
    // 1. Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("customer_wallets")
      .select("id, balance_cents")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) {
      toast.error("Wallet not found. Please add funds first.");
      return { success: false };
    }

    const currentBalance = wallet.balance_cents || 0;
    if (currentBalance < amountCents) {
      toast.error(`Insufficient wallet balance. You have $${(currentBalance / 100).toFixed(2)} but need $${(amountCents / 100).toFixed(2)}.`);
      return { success: false };
    }

    // 2. Deduct balance
    const newBalance = currentBalance - amountCents;
    const { error: updateError } = await supabase
      .from("customer_wallets")
      .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);

    if (updateError) {
      console.error("[WalletPayment] Balance update error:", updateError);
      toast.error("Failed to deduct wallet balance");
      return { success: false };
    }

    // 3. Record transaction
    const { data: txn, error: txnError } = await supabase
      .from("customer_wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        amount_cents: -amountCents,
        type: "payment",
        description,
        order_id: orderId,
      } as any)
      .select("id")
      .single();

    if (txnError) {
      console.error("[WalletPayment] Transaction record error:", txnError);
      // Balance already deducted, don't fail the payment
    }

    return {
      success: true,
      newBalance,
      transactionId: txn?.id,
    };
  } catch (err: any) {
    console.error("[WalletPayment] Error:", err);
    toast.error("Wallet payment failed");
    return { success: false };
  }
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("customer_wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance_cents || 0;
}
