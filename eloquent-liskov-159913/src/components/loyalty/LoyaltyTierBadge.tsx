/**
 * LoyaltyTierBadge — animated tier chip + progress to next tier.
 *
 * Reads loyalty_accounts row, shows points + tier with the gradient that
 * matches the tier metal. Optional inline mode renders just the chip.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Crown from "lucide-react/dist/esm/icons/crown";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

interface LoyaltyData {
  points: number;
  tier: LoyaltyTier;
  lifetime_points: number;
}

const TIER_META: Record<LoyaltyTier, { label: string; gradient: string; nextAt: number | null }> = {
  bronze:   { label: "Bronze",   gradient: "from-amber-700 to-amber-900",   nextAt: 500 },
  silver:   { label: "Silver",   gradient: "from-slate-400 to-slate-600",   nextAt: 2500 },
  gold:     { label: "Gold",     gradient: "from-amber-400 to-yellow-600",  nextAt: 10000 },
  platinum: { label: "Platinum", gradient: "from-violet-400 via-fuchsia-500 to-pink-500", nextAt: null },
};

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

interface Props {
  inline?: boolean;
}

export default function LoyaltyTierBadge({ inline = false }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<LoyaltyData | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: row } = await (dbFrom("loyalty_accounts") as { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: LoyaltyData | null }> } } })
        .select("points, tier, lifetime_points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setData(row ?? { points: 0, tier: "bronze", lifetime_points: 0 });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!data) return null;
  const meta = TIER_META[data.tier];

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.gradient} text-white text-[10px] font-bold uppercase tracking-wide`}>
        <Crown className="w-3 h-3" />
        {meta.label}
      </span>
    );
  }

  const progressPct = meta.nextAt
    ? Math.min(100, Math.round((data.points / meta.nextAt) * 100))
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl overflow-hidden p-4 text-white shadow-lg bg-gradient-to-br ${meta.gradient}`}
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_70%_30%,white,transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Crown className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{meta.label} member</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums">{data.points.toLocaleString()}</span>
            <span className="text-xs opacity-80">points</span>
          </div>
          {meta.nextAt && (
            <>
              <div className="mt-1.5 h-1 rounded-full bg-white/20 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.6 }} className="h-full bg-white" />
              </div>
              <p className="text-[10px] opacity-80 mt-1">{(meta.nextAt - data.points).toLocaleString()} pts to next tier</p>
            </>
          )}
          {!meta.nextAt && (
            <p className="text-[10px] opacity-80 mt-0.5 inline-flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> Top tier</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
