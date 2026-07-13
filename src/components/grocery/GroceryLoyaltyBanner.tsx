/**
 * GroceryLoyaltyBanner - ZIVO+ membership and loyalty points display
 * Shows points earned, tier progress, and exclusive member deals
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Gift, Star, ChevronRight, Sparkles, TrendingUp, X } from "lucide-react";

interface LoyaltyState {
  points: number;
  tier: "Explorer" | "Traveler" | "Elite";
  nextTier: string;
  pointsToNext: number;
  memberSince: string;
}

function getLoyaltyState(): LoyaltyState {
  try {
    const raw = localStorage.getItem("zivo_loyalty");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    points: 0,
    tier: "Explorer",
    nextTier: "Traveler",
    pointsToNext: 500,
    memberSince: new Date().toISOString(),
  };
}

function saveLoyaltyState(state: LoyaltyState) {
  localStorage.setItem("zivo_loyalty", JSON.stringify(state));
}

export function addLoyaltyPoints(amount: number): number {
  const state = getLoyaltyState();
  const earned = Math.floor(amount); // 1 point per dollar
  state.points += earned;
  // Tier progression
  if (state.points >= 2000) { state.tier = "Elite"; state.nextTier = "Max"; state.pointsToNext = 0; }
  else if (state.points >= 500) { state.tier = "Traveler"; state.nextTier = "Elite"; state.pointsToNext = 2000 - state.points; }
  else { state.tier = "Explorer"; state.nextTier = "Traveler"; state.pointsToNext = 500 - state.points; }
  saveLoyaltyState(state);
  return earned;
}

const TIER_COLORS: Record<string, string> = {
  Explorer: "from-blue-500/20 to-blue-600/10",
  Traveler: "from-amber-500/20 to-amber-600/10",
  Elite: "from-purple-500/20 to-purple-600/10",
};

const TIER_ICONS: Record<string, typeof Star> = {
  Explorer: Star,
  Traveler: Crown,
  Elite: Sparkles,
};

const MEMBER_PERKS = [
  { label: "Free delivery on $35+", icon: Gift },
  { label: "2x points on weekends", icon: Zap },
  { label: "Early access to deals", icon: TrendingUp },
];

export function GroceryLoyaltyBanner({ cartTotal }: { cartTotal?: number }) {
  const [state, setState] = useState(getLoyaltyState);
  const [showPerks, setShowPerks] = useState(false);
  const TierIcon = TIER_ICONS[state.tier] || Star;
  const progress = state.tier === "Elite" ? 100 : state.nextTier === "Traveler"
    ? ((state.points / 500) * 100)
    : (((state.points - 500) / 1500) * 100);

  const potentialPoints = cartTotal ? Math.floor(cartTotal) : 0;

  return (
    <div className="mx-4 mb-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${TIER_COLORS[state.tier]} border border-border/20 p-3.5`}
      >
        {/* Decorative glow */}
        <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />

        <div className="flex items-center gap-3 relative">
          <div className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center shrink-0">
            <TierIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-foreground">ZIVO+ {state.tier}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                {state.points.toLocaleString()} pts
              </span>
            </div>
            {state.tier !== "Elite" && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-muted-foreground">{state.pointsToNext} pts to {state.nextTier}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            )}
            {potentialPoints > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-primary font-semibold mt-1 flex items-center gap-1"
              >
                <Zap className="h-2.5 w-2.5" />
                Earn {potentialPoints} pts with this order
              </motion.p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPerks(!showPerks)}
            className="p-1.5 rounded-xl bg-background/50 hover:bg-background/70 transition-colors shrink-0"
          >
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showPerks ? "rotate-90" : ""}`} />
          </motion.button>
        </div>

        <AnimatePresence>
          {showPerks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border/15 space-y-2">
                <p className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider">Member Perks</p>
                {MEMBER_PERKS.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-primary/70" />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** Exclusive member deals carousel */
export function GroceryMemberDeals({ products, onAdd, cartProductIds }: {
  products: Array<{ productId: string; name: string; price: number; image: string; brand: string; rating: number | null; inStock: boolean; store: string }>;
  onAdd: (p: any) => void;
  cartProductIds: Set<string>;
}) {
  if (products.length < 8) return null;

  // Simulate "member price" with a small discount on select items
  const deals = products
    .filter(p => p.price > 5 && p.price < 30)
    .slice(0, 6)
    .map(p => ({ ...p, memberPrice: +(p.price * 0.9).toFixed(2), savings: +(p.price * 0.1).toFixed(2) }));

  if (deals.length < 3) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-2.5 px-4">
        <Crown className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[12px] font-bold text-foreground/80 uppercase tracking-wider">Member Deals</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold ml-1">ZIVO+</span>
      </div>
      <div
        className="flex gap-2.5 overflow-x-auto pb-2 px-4 snap-x"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {deals.map((d, i) => (
          <motion.button
            key={d.productId}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAdd(d)}
            className="snap-start shrink-0 w-[130px] rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/5 to-transparent p-2.5 text-left hover:border-amber-500/30 transition-all"
          >
            {d.image && (
	              <img src={d.image} alt={d.name} className="h-16 w-full object-contain mb-2" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            )}
            <p className="text-[10px] font-semibold line-clamp-2 leading-snug mb-1">{d.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-extrabold text-primary">${d.memberPrice}</span>
              <span className="text-[9px] text-muted-foreground line-through">${d.price}</span>
            </div>
            <span className="text-[8px] text-amber-600 font-bold">Save ${d.savings}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
