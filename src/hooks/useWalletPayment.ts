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
      toast.error(message);
      return { success: false };
    }

    return {
      success: true,
      newBalance: data.newBalance,
      transactionId: data.transactionId,
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
