/**
 * SoftwareSubscriptionSection — the store-owner "Subscriptions" tab.
 *
 * Shows the ZIVO Software plan catalog (mirrored from the zivosoftware app) so
 * the owner can see what each plan includes and start/upgrade. Billing is run
 * on the software site, so the CTAs deep-link to its checkout; this surface is
 * the read-only catalog + a manage entry point.
 */
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Sparkles, ExternalLink, CreditCard, CheckCircle2, Rocket, Zap, Gem, Crown, type LucideIcon } from "lucide-react";
import { ZIVO_SOFTWARE_ORIGIN } from "@/config/autoRepairDomain";
import { supabase } from "@/integrations/supabase/client";
import { useSoftwareSubscription } from "@/hooks/useSoftwareSubscription";
import SoftwareSubscriptionCheckoutDialog from "./SoftwareSubscriptionCheckoutDialog";
import {
  SOFTWARE_PLANS,
  ANNUAL_DISCOUNT,
  FREE_TRIAL_DAYS,
  monthlyPrice,
  chargedAmount,
  formatUSD,
  type BillingCycle,
  type SoftwarePlan,
} from "@/lib/software/softwarePlans";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}
function statusLabel(s: string): string {
  if (s === "trialing") return "Free trial";
  if (s === "active") return "Active";
  if (s === "past_due") return "Past due";
  if (s === "unpaid") return "Unpaid";
  if (s === "canceled") return "Canceled";
  return s.replace(/_/g, " ");
}

type PlanStyle = {
  Icon: LucideIcon;
  eyebrow: string;
  medallion: string;
  accent: string;
  ring: string;
  glow: string;
  ctaVariant: "default" | "outline";
  cta: string;
  checkBg: string;
  checkText: string;
};

// Per-tier visual identity — medallion gradient, eyebrow, CTA + accent colors.
const PLAN_STYLE: Record<string, PlanStyle> = {
  base: {
    Icon: Rocket,
    eyebrow: "Starter",
    medallion: "bg-gradient-to-br from-sky-500 to-blue-600",
    accent: "text-sky-600",
    ring: "border-border/60",
    glow: "",
    ctaVariant: "outline",
    cta: "hover:border-sky-400 hover:text-sky-600 hover:bg-sky-500/5",
    checkBg: "bg-sky-500/15",
    checkText: "text-sky-600",
  },
  gold: {
    Icon: Zap,
    eyebrow: "Most popular",
    medallion: "bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500",
    accent: "text-orange-600",
    ring: "ring-2 ring-amber-400/50 border-amber-300/50",
    glow: "shadow-lg shadow-amber-500/10",
    ctaVariant: "default",
    cta: "border-0 text-white bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:opacity-95",
    checkBg: "bg-orange-500/15",
    checkText: "text-orange-600",
  },
  platinum: {
    Icon: Gem,
    eyebrow: "Premium",
    medallion: "bg-gradient-to-br from-violet-500 to-indigo-600",
    accent: "text-violet-600",
    ring: "border-violet-300/50",
    glow: "",
    ctaVariant: "outline",
    cta: "hover:border-violet-400 hover:text-violet-600 hover:bg-violet-500/5",
    checkBg: "bg-violet-500/15",
    checkText: "text-violet-600",
  },
  pro: {
    Icon: Crown,
    eyebrow: "Elite",
    medallion: "bg-gradient-to-br from-zinc-700 to-zinc-900",
    accent: "text-amber-600",
    ring: "border-zinc-300/70",
    glow: "",
    ctaVariant: "default",
    cta: "border-0 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
    checkBg: "bg-amber-500/15",
    checkText: "text-amber-600",
  },
};

export default function SoftwareSubscriptionSection({ storeId }: { storeId: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const annual = cycle === "annual";
  const [email, setEmail] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SoftwarePlan | null>(null);
  const { data: currentSub } = useSoftwareSubscription(storeId);

  // The signed-in store owner's email seeds the subscription (Stripe customer).
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    return () => { active = false; };
  }, []);

  const manageUrl = `${ZIVO_SOFTWARE_ORIGIN}/account?store=${encodeURIComponent(storeId)}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Subscriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Your ZIVO Software plan. Start free for {FREE_TRIAL_DAYS} days — no card charged today.
            Change or cancel anytime; billing is handled securely on the software site.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
          <a href={manageUrl} target="_blank" rel="noopener noreferrer">
            Manage billing <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>

      {/* Current plan */}
      {currentSub && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold capitalize">ZIVO {currentSub.plan ?? "plan"}</p>
                  <Badge variant="secondary" className="text-[10px]">{statusLabel(currentSub.status)}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {currentSub.cycle === "annual" ? "Annual" : "Monthly"} plan
                  {currentSub.cancel_at_period_end
                    ? ` · Cancels ${fmtDate(currentSub.current_period_end)}`
                    : currentSub.status === "trialing" && currentSub.trial_end
                      ? ` · Trial ends ${fmtDate(currentSub.trial_end)}`
                      : currentSub.current_period_end
                        ? ` · Renews ${fmtDate(currentSub.current_period_end)}`
                        : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
              <a href={manageUrl} target="_blank" rel="noopener noreferrer">
                Manage <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing cycle toggle */}
      <div className="inline-flex items-center rounded-full border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            !annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={!annual}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setCycle("annual")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors flex items-center gap-1.5",
            annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={annual}
        >
          Annual
          <Badge className="h-4 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            Save {Math.round(ANNUAL_DISCOUNT * 100)}%
          </Badge>
        </button>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
        {SOFTWARE_PLANS.map((plan) => {
          const style = PLAN_STYLE[plan.id] ?? PLAN_STYLE.base;
          const Icon = style.Icon;
          const isCurrent = currentSub?.plan === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                "group relative flex flex-col rounded-2xl bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                style.ring,
                style.glow,
              )}
            >
              {plan.featured && (
                <div className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                </div>
              )}
              <CardContent className="flex flex-1 flex-col p-5">
                {/* Tier graphic */}
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm", style.medallion)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", style.accent)}>{style.eyebrow}</p>
                    <h3 className="text-lg font-bold leading-tight">{plan.name}</h3>
                  </div>
                </div>

                <p className="mt-3 min-h-[32px] text-[11px] text-muted-foreground">{plan.tagline}</p>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums">{formatUSD(monthlyPrice(plan, cycle))}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {annual ? (
                    <><s>{formatUSD(plan.monthly)}/mo</s> · {formatUSD(chargedAmount(plan, cycle))} billed yearly</>
                  ) : (
                    "billed monthly"
                  )}
                </p>

                {/* CTA */}
                {isCurrent ? (
                  <Button className="mt-4 w-full" variant="secondary" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button
                    className={cn("mt-4 h-11 w-full gap-1.5 font-semibold", style.cta)}
                    variant={style.ctaVariant}
                    onClick={() => setCheckoutPlan(plan)}
                  >
                    {currentSub ? "Switch to this plan" : "Start free trial"}
                  </Button>
                )}

                <div className="my-4 h-px bg-border/60" />

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px]">
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", style.checkBg)}>
                        <Check className={cn("h-2.5 w-2.5", style.checkText)} />
                      </span>
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        All plans include secure team access and automatic updates. Prices in USD. You can switch
        plans or cancel anytime from <a href={manageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">billing settings</a>.
      </p>

      <SoftwareSubscriptionCheckoutDialog
        open={!!checkoutPlan}
        onOpenChange={(o) => { if (!o) setCheckoutPlan(null); }}
        plan={checkoutPlan}
        cycle={cycle}
        storeId={storeId}
        email={email}
      />
    </div>
  );
}
