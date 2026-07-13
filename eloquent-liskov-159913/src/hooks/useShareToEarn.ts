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
        // Get or create user's referral code
        const db = supabase as any;
        const { data: existing } = await db
          .from("user_referral_codes")
          .select("referral_code")
          .eq("user_id", user.id)
          .maybeSingle();

        let referralCode = existing?.referral_code;

        if (!referralCode) {
          // Generate unique 8-char code
          referralCode = `Z${user.id.substring(0, 3).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
          await db.from("user_referral_codes").insert({
            user_id: user.id,
            referral_code: referralCode,
          });
        }

        // Build share URL with tracking params
        const shareBase = buildReelDeepLink(postId);
        const shareUrl = `${shareBase}?ref=${referralCode}&utm_source=${platform}&utm_medium=share&utm_campaign=share_to_earn`;

        // Log the share event
        await db.from("referral_shares").insert({
          referrer_id: user.id,
          referral_code: referralCode,
          post_id: postId,
          platform,
          shared_at: new Date().toISOString(),
        });

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
        window.open(`https://t.me/share/url?url=${encodeURIComponent(result.shareUrl)}&text=${encodeURIComponent(`Check out ${storeName} on ZIVO! 🔥`)}`, "_blank");
        toast.success("Shared to Telegram! You'll earn $1.00 if they make a purchase.");
      } else if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
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
        const db = supabase as any;

        // Check if this buyer came from a referral
        const { data: referralEntry } = await db
          .from("referral_conversions")
          .select("id, referrer_id, status")
          .eq("buyer_id", buyerUserId)
          .eq("status", "pending")
          .maybeSingle();

        if (!referralEntry) return; // Not a referral purchase

        // Credit the referrer
        await db.from("customer_wallet_transactions").insert({
          user_id: referralEntry.referrer_id,
          amount_cents: REWARD_CREDIT_CENTS,
          type: "credit",
          category: "referral_reward",
          description: `Share-to-Earn reward — your friend made a purchase!`,
          reference_id: orderId,
        });

        // Credit the buyer too
        await db.from("customer_wallet_transactions").insert({
          user_id: buyerUserId,
          amount_cents: REWARD_CREDIT_CENTS,
          type: "credit",
          category: "referral_welcome",
          description: `Welcome reward — $1.00 credit for your first purchase!`,
          reference_id: orderId,
        });

        // Credit loyalty points to both
        await Promise.all([
          db.from("loyalty_points").insert({
            user_id: referralEntry.referrer_id,
            points: REWARD_POINTS,
            reason: "referral_share",
            reference_id: orderId,
          }),
          db.from("loyalty_points").insert({
            user_id: buyerUserId,
            points: REWARD_POINTS,
            reason: "referral_welcome",
            reference_id: orderId,
          }),
        ]);

        // Mark conversion as credited
        await db
          .from("referral_conversions")
          .update({ status: "credited", credited_at: new Date().toISOString(), order_id: orderId })
          .eq("id", referralEntry.id);
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
