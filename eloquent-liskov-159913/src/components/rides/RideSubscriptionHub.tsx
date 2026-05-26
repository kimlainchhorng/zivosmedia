/**
 * RideSubscriptionHub — Subscription tiers, auto-renew, usage dashboard, perks
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Zap, Star, Check, TrendingUp, Calendar, Gift, Shield, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const plans = [
  {
    id: "basic",
    name: "Rider Basic",
    price: "$9.99",
    period: "/mo",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    icon: Zap,
    iconColor: "text-blue-500",
    features: ["5% off all rides", "Priority support", "No surge on 3 rides/mo", "Ride history export"],
    current: false,
  },
  {
    id: "premium",
    name: "Rider Premium",
    price: "$19.99",
    period: "/mo",
    color: "from-primary/20 to-purple-500/20",
    borderColor: "border-primary/30",
    icon: Crown,
    iconColor: "text-primary",
    features: ["15% off all rides", "No surge pricing", "Priority matching", "Free cancellations", "Premium vehicles"],
    current: true,
    popular: true,
  },
  {
    id: "elite",
    name: "Rider Elite",
    price: "$39.99",
    period: "/mo",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    icon: Star,
    iconColor: "text-amber-500",
    features: ["25% off all rides", "Unlimited no-surge", "Dedicated driver pool", "Airport lounge access", "Concierge support", "Guest passes"],
    current: false,
  },
];

const usageStats = {
  ridesUsed: 18,
  ridesIncluded: 30,
  savingsThisMonth: 67,
  totalSaved: 342,
  surgeSaved: 5,
  freeCancel: 2,
  nextBilling: "Mar 28, 2026",
  memberSince: "Jan 2026",
};

const perks = [
  { id: 1, name: "Birthday Ride", desc: "Free ride on your birthday", icon: Gift, redeemed: false },
  { id: 2, name: "Airport Priority", desc: "Skip the queue at airports", icon: Shield, redeemed: true },
  { id: 3, name: "Guest Pass", desc: "Share 1 free ride/month", icon: Sparkles, redeemed: false },
];

type View = "plans" | "usage" | "perks";

const SUB_KEY = "zivo_subscription";
const PERKS_KEY = "zivo_sub_perks";

export default function RideSubscriptionHub() {
  const [view, setView] = useState<View>("plans");
  const [currentPlan, setCurrentPlan] = useState<string>(() => {
    try { return localStorage.getItem(SUB_KEY) || "premium"; } catch { return "premium"; }
  });
  const [redeemedPerks, setRedeemedPerks] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(PERKS_KEY) || "[2]"); } catch { return [2]; }
  });

  const switchPlan = (planId: string, planName: string) => {
    setCurrentPlan(planId);
    localStorage.setItem(SUB_KEY, planId);
    toast.success(`Switched to ${planName}!`);
  };

  const redeemPerk = (id: number, name: string) => {
    setRedeemedPerks(prev => { const next = [...prev, id]; localStorage.setItem(PERKS_KEY, JSON.stringify(next)); return next; });
    toast.success(`${name} activated!`);
  };

  const views: { id: View; label: string; icon: typeof Crown }[] = [
    { id: "plans", label: "Plans", icon: Crown },
    { id: "usage", label: "Usage", icon: TrendingUp },
    { id: "perks", label: "Perks", icon: Gift },
  ];

  return (
    <div className="space-y-4">
      {/* Current plan badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/20 to-primary/20 rounded-2xl p-4 border border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Current Plan</p>
            <p className="text-lg font-black text-foreground">Rider Premium</p>
            <p className="text-xs text-primary font-semibold">$19.99/mo • Renews {usageStats.nextBilling}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button type="button"
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                view === v.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {view === "plans" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id} className={cn("rounded-xl border overflow-hidden", isCurrent ? plan.borderColor : "border-border/30")}>
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-[10px] font-bold">Most Popular</div>
                )}
                <div className={cn("p-4 space-y-3", isCurrent ? `bg-gradient-to-br ${plan.color}` : "bg-card")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center">
                      <Icon className={cn("w-5 h-5", plan.iconColor)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{plan.name}</p>
                      <p className="text-lg font-black text-foreground">{plan.price}<span className="text-xs text-muted-foreground font-normal">{plan.period}</span></p>
                    </div>
                    {isCurrent && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Your Plan</span>}
                  </div>
                  <div className="space-y-1.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-xs text-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                  {!isCurrent && (
                    <button type="button"
                      onClick={() => switchPlan(plan.id, plan.name)}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                    >
                      {plans.findIndex((p) => p.id === plan.id) > plans.findIndex((p) => p.id === currentPlan) ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {view === "usage" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
            <div className="flex justify-between">
              <p className="text-sm font-bold text-foreground">Included Rides</p>
              <p className="text-sm font-black text-foreground">{usageStats.ridesUsed}/{usageStats.ridesIncluded}</p>
            </div>
            <Progress value={(usageStats.ridesUsed / usageStats.ridesIncluded) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{usageStats.ridesIncluded - usageStats.ridesUsed} rides remaining this cycle</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Saved This Month", value: `$${usageStats.savingsThisMonth}`, color: "text-green-600" },
              { label: "Total Saved", value: `$${usageStats.totalSaved}`, color: "text-primary" },
              { label: "Surge Avoided", value: `${usageStats.surgeSaved}x`, color: "text-foreground" },
              { label: "Free Cancels", value: `${usageStats.freeCancel} used`, color: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl p-3 border border-border/30 text-center">
                <p className={cn("text-xl font-black", s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Member since {usageStats.memberSince}</p>
              <p className="text-[11px] text-muted-foreground">Auto-renews on {usageStats.nextBilling}</p>
            </div>
            <button type="button" onClick={() => setView("plans")} className="text-xs font-bold text-primary">Manage</button>
          </div>
        </motion.div>
      )}

      {view === "perks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm font-bold text-foreground">Member Perks</p>
          {perks.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.id} className={cn("bg-card rounded-xl p-3 border flex items-center gap-3", perk.redeemed ? "border-border/30 opacity-60" : "border-primary/20")}>
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{perk.name}</p>
                  <p className="text-xs text-muted-foreground">{perk.desc}</p>
                </div>
                {redeemedPerks.includes(perk.id) ? (
                  <span className="text-[10px] text-muted-foreground font-bold">Redeemed</span>
                ) : (
                  <button type="button"
                    onClick={() => redeemPerk(perk.id, perk.name)}
                    className="text-xs font-bold text-primary"
                  >
                    Redeem
                  </button>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
