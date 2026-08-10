/**
 * useShareToEarn — Viral referral system for Reel sharing
 * Tracks shares → first purchase → credits both users
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buildReelDeepLink } from "@/lib/deepLinks";

const REWARD_POINTS = 100;
const REWARD_CREDIT_CENTS = 100; // $1.00

interface ShareToEarnResult {
  shareUrl: string;
  referralCode: string;
}

export function useShareToEarn() {
  const { user } = useAuth();

  /**
   * Generate a trackable share link for a Reel
   */
  const generateShareLink = useCallback(
    async (postId: string, platform: "telegram" | "whatsapp" | "copy"): Promise<ShareToEarnResult | null> => {
      if (!user) {
        toast.error("Please log in to earn rewards from sharing");
        return null;
      }

      try {
        const { data, error } = await supabase.functions.invoke("share-to-earn-manage", {
          body: { action: "generate_share", post_id: postId, platform },
        });

        if (error) throw error;

        const referralCode = typeof data?.referral_code === "string" ? data.referral_code : null;
        if (!referralCode) throw new Error("Missing referral code");

        // Build share URL with tracking params
        const shareBase = buildReelDeepLink(postId);
        const shareUrl = `${shareBase}?ref=${referralCode}&utm_source=${platform}&utm_medium=share&utm_campaign=share_to_earn`;

        return { shareUrl, referralCode };
      } catch (err) {
        console.warn("[ShareToEarn] Error generating link:", err);
        return null;
      }
    },
    [user]
  );

  /**
   * Share to a specific platform
   */
  const shareToEarn = useCallback(
    async (postId: string, storeName: string, platform: "telegram" | "whatsapp" | "copy") => {
      const result = await generateShareLink(postId, platform);
      if (!result) return;

      const shareText = `Check out ${storeName} on ZIVO! 🔥 ${result.shareUrl}`;

      if (platform === "telegram") {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(result.shareUrl)}&text=${encodeURIComponent(`Check out ${storeName} on ZIVO! 🔥`)}`, "_blank", "noopener,noreferrer");
        toast.success("Shared to Telegram! You'll earn $1.00 if they make a purchase.");
      } else if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
        toast.success("Shared to WhatsApp! You'll earn $1.00 if they make a purchase.");
      } else {
        await navigator.clipboard.writeText(result.shareUrl);
        toast.success("Link copied! Share it — earn $1.00 when they buy.");
      }
    },
    [generateShareLink]
  );

  /**
   * Check and credit referral rewards (called after a purchase)
   */
  const creditReferralReward = useCallback(
    async (buyerUserId: string, orderId: string, orderAmountCents: number) => {
      try {
        const { error } = await supabase.functions.invoke("share-to-earn-manage", {
          body: {
            action: "credit_reward",
            buyer_user_id: buyerUserId,
            order_id: orderId,
            order_amount_cents: orderAmountCents,
          },
        });
        if (error) throw error;
      } catch (err) {
        console.warn("[ShareToEarn] Credit error:", err);
      }
    },
    []
  );

  return {
    shareToEarn,
    generateShareLink,
    creditReferralReward,
    rewardAmount: `$${(REWARD_CREDIT_CENTS / 100).toFixed(2)}`,
    rewardPoints: REWARD_POINTS,
  };
}
