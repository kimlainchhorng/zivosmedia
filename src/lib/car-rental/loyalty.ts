/**
 * Loyalty tier computation for car-rental renters.
 * Tiers are based purely on lifetime total_rentals — no extra DB column needed.
 */

export type LoyaltyTier = "none" | "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  label: string;
  rentalsToNext: number | null;
  nextLabel: string | null;
  /** Tailwind classes for a badge */
  className: string;
  /** Single emoji/icon character */
  emoji: string;
}

const TIERS: Array<{ min: number; tier: LoyaltyTier; label: string; className: string; emoji: string }> = [
  { min: 0,  tier: "none",     label: "New",      className: "border-border bg-muted text-muted-foreground", emoji: "✨" },
  { min: 1,  tier: "bronze",   label: "Bronze",   className: "border-orange-500/40 bg-orange-500/12 text-orange-700 dark:text-orange-300", emoji: "🥉" },
  { min: 5,  tier: "silver",   label: "Silver",   className: "border-slate-400/40 bg-slate-400/12 text-slate-700 dark:text-slate-300", emoji: "🥈" },
  { min: 15, tier: "gold",     label: "Gold",     className: "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300", emoji: "🥇" },
  { min: 30, tier: "platinum", label: "Platinum", className: "border-violet-500/40 bg-violet-500/12 text-violet-700 dark:text-violet-300", emoji: "💎" },
];

export function getLoyaltyTier(totalRentals: number): LoyaltyTierInfo {
  const safe = Math.max(0, totalRentals | 0);
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (safe >= TIERS[i].min) { idx = i; break; }
  }
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  return {
    tier: current.tier,
    label: current.label,
    className: current.className,
    emoji: current.emoji,
    rentalsToNext: next ? next.min - safe : null,
    nextLabel: next ? next.label : null,
  };
}
