/**
 * DailyRewardCard — claim today's coin login bonus and show streak.
 * Real backend via `claim_daily_coin_reward` / `get_daily_reward_status`.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Gift from "lucide-react/dist/esm/icons/gift";
import Flame from "lucide-react/dist/esm/icons/flame";
import { useDailyCoinReward } from "@/hooks/useDailyCoinReward";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";

export default function DailyRewardCard() {
  const { user } = useAuth();
  const { status, loading, submitting, claim } = useDailyCoinReward();
  const [justClaimed, setJustClaimed] = useState<{ amount: number; streak: number } | null>(null);

  if (!user?.id) return null;
  if (loading || !status) return null;

  const handleClaim = async () => {
    try {
      const res = await claim();
      if (res) {
        setJustClaimed(res);
        toast.success(`+${res.amount.toLocaleString()} coins`, {
          description: `Streak day ${res.streak}`,
        });
      }
    } catch (e: any) {
      toast.error("Couldn't claim", { description: e?.message });
    }
  };

  const isClaimed = !!status.claimedToday || !!justClaimed;

  return (
    <div className="px-4 pt-4 pb-1">
      <motion.button
        onClick={isClaimed ? undefined : handleClaim}
        disabled={submitting || isClaimed}
        whileTap={isClaimed ? undefined : { scale: 0.98 }}
        className={cn(
          "w-full rounded-2xl p-3 flex items-center gap-3 text-left shadow-md transition-all border",
          isClaimed
            ? "bg-emerald-500/10 border-emerald-500/30 cursor-default"
            : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 border-transparent shadow-amber-500/30"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm",
          isClaimed ? "bg-emerald-500/20" : "bg-white/25"
        )}>
          {isClaimed ? <Flame className="w-6 h-6 text-emerald-300" /> : <Gift className="w-6 h-6 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-[14px] leading-tight", isClaimed ? "text-emerald-300" : "text-white")}>
            {isClaimed ? `Day ${justClaimed?.streak ?? status.streak} claimed` : "Daily login bonus"}
          </p>
          <p className={cn("text-[11px] leading-tight mt-0.5", isClaimed ? "text-emerald-300/70" : "text-white/85")}>
            {isClaimed
              ? `Come back tomorrow for ${(status.nextAmount ?? 0).toLocaleString()} coins`
              : `Claim ${(status.nextAmount ?? 0).toLocaleString()} coins · Streak day ${status.nextStreak ?? 1}`}
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1.5 shrink-0 shadow-md",
          isClaimed ? "bg-emerald-500/20 text-emerald-300" : "bg-white text-amber-700"
        )}>
	          <img src={goldCoinIcon} alt="" className="w-4 h-4" loading="lazy" decoding="async" />
          <span className="text-[11px] font-bold">
            {isClaimed
              ? `+${(justClaimed?.amount ?? status.todayAmount ?? 0).toLocaleString()}`
              : "Claim"}
          </span>
        </div>
      </motion.button>
    </div>
  );
}
