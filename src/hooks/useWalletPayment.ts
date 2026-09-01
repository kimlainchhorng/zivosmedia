/**
 * useWalletPayment - Handles deducting ZIVO Wallet balance for Eats orders
 * Uses customer_wallets + customer_wallet_transactions tables
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WalletPaymentResult {
  success: boolean;
  outcome: "charged" | "not_charged" | "unknown";
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
    const { data, error } = await supabase.functions.invoke("wallet-payment-deduct", {
      body: {
        user_id: userId,
        amount_cents: amountCents,
        order_id: orderId,
        description,
      },
    });

    if (error || !data?.ok) {
      const message = data?.error || error?.message || "Wallet payment failed";
      console.error("[WalletPayment] Deduct error:", message);
      if (!error && data?.not_charged === true) {
        toast.error(message);
        return { success: false, outcome: "not_charged" };
      }

      // A transport/server error cannot prove whether the locked database
      // transaction committed. Never tell checkout to debit again. The saved
      // order is reconciled by its order ID on the tracking screen instead.
      toast.error("We could not verify the wallet payment. Checking the saved order now.");
      return { success: false, outcome: "unknown" };
    }

    return {
      success: true,
      outcome: "charged",
      newBalance: data.newBalance,
      transactionId: data.transactionId,
    };
  } catch (err: any) {
    console.error("[WalletPayment] Error:", err);
    toast.error("We could not verify the wallet payment. Checking the saved order now.");
    return { success: false, outcome: "unknown" };
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
