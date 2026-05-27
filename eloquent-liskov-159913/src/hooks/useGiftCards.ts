/**
 * Gift Cards Hook
 * Manages gift card purchase, redemption, and listing
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GiftCard {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  purchaser_user_id: string | null;
  purchaser_email: string | null;
  purchaser_name: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface PurchaseGiftCardInput {
  amount_cents: number;
  recipient_email?: string;
  recipient_name?: string;
  message?: string;
  sender_name?: string;
  success_url?: string;
  cancel_url?: string;
}

export function useGiftCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's gift cards (purchased or received)
  const { data: myGiftCards, isLoading: cardsLoading } = useQuery({
    queryKey: ["my-gift-cards", user?.id],
    queryFn: async (): Promise<GiftCard[]> => {
      if (!user?.id) return [];

      // Get cards purchased by user
      const { data: purchased, error: purchasedError } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("purchaser_user_id", user.id)
        .order("created_at", { ascending: false });

      if (purchasedError) throw purchasedError;

      // Get cards received by user's email
      const { data: received, error: receivedError } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("recipient_email", user.email || "")
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      // Merge and deduplicate
      const allCards = [...(purchased || []), ...(received || [])];
      const unique = Array.from(new Map(allCards.map((c) => [c.id, c])).values());
      return unique as GiftCard[];
    },
    enabled: !!user?.id,
  });

  // Purchase gift card — returns Stripe checkout URL
  const purchaseGiftCard = useMutation({
    mutationFn: async (input: PurchaseGiftCardInput) => {
      const { data, error } = await supabase.functions.invoke("purchase-gift-card", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string; gift_card_id: string };
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start gift card purchase");
    },
  });

  // Verify purchase after Stripe redirect
  const verifyPurchase = useMutation({
    mutationFn: async (session_id: string) => {
      const { data, error } = await supabase.functions.invoke("verify-gift-card-purchase", {
        body: { session_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        gift_card: {
          id: string;
          code: string;
          amount: number;
          recipient_email: string | null;
          recipient_name: string | null;
          message: string | null;
        };
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-gift-cards"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify gift card purchase");
    },
  });

  // Redeem gift card code
  const redeemGiftCard = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("redeem-gift-card", {
        body: { code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        credited_amount_cents: number;
        credited_amount_dollars: number;
        new_wallet_balance_cents: number;
        new_wallet_balance_dollars: number;
      };
    },
    onSuccess: (data) => {
      toast.success(`$${data.credited_amount_dollars.toFixed(2)} added to your wallet!`);
      queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["my-gift-cards"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to redeem gift card");
    },
  });

  return {
    myGiftCards: myGiftCards || [],
    cardsLoading,
    purchaseGiftCard,
    verifyPurchase,
    redeemGiftCard,
  };
}
