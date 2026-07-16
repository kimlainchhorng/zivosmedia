import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Gem,
  Loader2,
  Rocket,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import SoftwareSubscriptionCheckoutDialog from "./SoftwareSubscriptionCheckoutDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSoftwarePricingCatalog } from "@/hooks/useSoftwarePricingCatalog";
import { useSoftwareSubscription } from "@/hooks/useSoftwareSubscription";
import {
  createSoftwareBillingPortalUrl,
  newSoftwareBillingIdempotencyKey,
  SoftwareCheckoutError,
} from "@/lib/software/softwareCheckout";
import {
  catalogAnnualSavingsPercent,
  catalogBillingAmountCents,
  catalogMonthlyAmountCents,
  formatTrialLabel,
  formatUSDCents,
  type SoftwareBillingCycle,
  type SoftwarePricingCatalogPlan,
} from "@/lib/software/publicPricingCatalog";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const value = new Date(iso);
  return Number.isNaN(value.getTime())
    ? ""
    : value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: string): string {
  if (status === "trialing") return "Free trial";
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "unpaid") return "Unpaid";
  if (status === "cancelled" || status === "canceled") return "Canceled";
  return status.replace(/_/g, " ");
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

const PLAN_STYLE: Record<string, PlanStyle> = {
  base: {
    Icon: Rocket,
    eyebrow: "Core",
    medallion: "bg-gradient-to-br from-sky-500 to-blue-600",
    accent: "text-sky-600",
    ring: "border-border/60",
    glow: "",
    ctaVariant: "outline",
    cta: "hover:border-sky-400 hover:bg-sky-500/5 hover:text-sky-600",
    checkBg: "bg-sky-500/15",
    checkText: "text-sky-600",
  },
  gold: {
    Icon: Zap,
    eyebrow: "Featured",
    medallion: "bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500",
    accent: "text-orange-600",
    ring: "border-amber-300/50 ring-2 ring-amber-400/50",
    glow: "shadow-lg shadow-amber-500/10",
    ctaVariant: "default",
    cta: "border-0 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white hover:opacity-95",
    checkBg: "bg-orange-500/15",
    checkText: "text-orange-600",
  },
  platinum: {
    Icon: Gem,
    eyebrow: "Advanced",
    medallion: "bg-gradient-to-br from-violet-500 to-indigo-600",
    accent: "text-violet-600",
    ring: "border-violet-300/50",
    glow: "",
    ctaVariant: "outline",
    cta: "hover:border-violet-400 hover:bg-violet-500/5 hover:text-violet-600",
    checkBg: "bg-violet-500/15",
    checkText: "text-violet-600",
  },
  pro: {
    Icon: Crown,
    eyebrow: "Full",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [cycle, setCycle] = useState<SoftwareBillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<SoftwarePricingCatalogPlan | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const portalKey = useRef(newSoftwareBillingIdempotencyKey("portal"));
  const annual = cycle === "annual";
  const { data: currentSub, isLoading: subscriptionLoading } = useSoftwareSubscription(storeId);
  const { data: plans, isLoading: plansLoading, isError: plansFailed } = useSoftwarePricingCatalog();

  useEffect(() => {
    const requestedPlanId = searchParams.get("plan_id");
    if (!plans?.length || !requestedPlanId || subscriptionLoading) return;
    const requestedCycle = searchParams.get("cycle") === "annual" ? "annual" : "monthly";
    const selectedPlan = plans.find((plan) =>
      requestedCycle === "annual"
        ? plan.annualPlanId === requestedPlanId
        : plan.monthlyPlanId === requestedPlanId,
    );
    if (!selectedPlan) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("plan_id");
    nextParams.delete("cycle");
    setSearchParams(nextParams, { replace: true });
    if (currentSub) {
      setCheckoutPlan(null);
      setPortalError(
        currentSub.billing_portal_available
          ? "An existing subscription must be changed from Manage billing; a second checkout was not opened."
          : "Existing Software access must be reconciled by support before a new checkout can be opened.",
      );
      return;
    }

    setCycle(requestedCycle);
    setCheckoutPlan(selectedPlan);
  }, [currentSub, plans, searchParams, setSearchParams, subscriptionLoading]);

  const openBillingPortal = async () => {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const url = await createSoftwareBillingPortalUrl({
        businessId: storeId,
        idempotencyKey: portalKey.current,
        returnUrl: window.location.href,
      });
      window.location.assign(url);
    } catch (error) {
      setPortalError(
        error instanceof SoftwareCheckoutError
          ? error.message
          : "Couldn't open billing settings. Please try again.",
      );
      setPortalBusy(false);
    }
  };

  const currentPlanKey = String(currentSub?.plan || "").trim().toLowerCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-5 w-5 text-primary" /> Subscriptions
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Prices, billing intervals, and trial terms below come from the active server billing catalog.
          </p>
        </div>
        {currentSub?.billing_portal_available && (
          <Button variant="outline" size="sm" className="min-h-11 shrink-0 gap-1.5" onClick={openBillingPortal} disabled={portalBusy}>
            {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Manage billing
          </Button>
        )}
      </div>

      {portalError && <p className="text-sm text-destructive" role="alert">{portalError}</p>}

      {currentSub && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold capitalize">ZIVO {currentSub.plan ?? "plan"}</p>
                  <Badge variant="secondary" className="text-[10px]">{statusLabel(currentSub.status)}</Badge>
                  {currentSub.reconciliation_required && (
                    <Badge variant="outline" className="text-[10px]">Billing review required</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentSub.cycle === "annual" ? "Annual" : "Monthly"} plan
                  {currentSub.cancel_at_period_end
                    ? ` · Cancels ${formatDate(currentSub.current_period_end)}`
                    : currentSub.status === "trialing" && currentSub.trial_end
                      ? ` · Trial ends ${formatDate(currentSub.trial_end)}`
                      : currentSub.current_period_end
                        ? ` · Renews ${formatDate(currentSub.current_period_end)}`
                        : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="inline-flex items-center rounded-full border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          className={cn("min-h-11 rounded-full px-4 font-medium transition-colors", !annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          aria-pressed={!annual}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setCycle("annual")}
          className={cn("min-h-11 rounded-full px-4 font-medium transition-colors", annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          aria-pressed={annual}
        >
          Annual
        </button>
      </div>

      {plansLoading && (
        <div className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading current plans…
        </div>
      )}

      {plansFailed && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-sm text-amber-950" role="status">
          Current plan pricing is unavailable. Checkout is disabled until the server catalog is available and valid.
        </div>
      )}

      {plans && (
        <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 md:grid-cols-4">
          {plans.map((plan) => {
            const style = PLAN_STYLE[plan.id] ?? PLAN_STYLE.base;
            const Icon = style.Icon;
            const isCurrent = currentPlanKey === plan.id || currentPlanKey === plan.displayName.toLowerCase();
            const monthlyAmount = catalogMonthlyAmountCents(plan, cycle);
            const billingAmount = catalogBillingAmountCents(plan, cycle);
            const savings = catalogAnnualSavingsPercent(plan);
            return (
              <Card key={plan.id} className={cn("group relative flex flex-col rounded-2xl bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", style.ring, style.glow)}>
                {plan.featured && (
                  <div className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                      <Sparkles className="h-3 w-3" /> Featured
                    </span>
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm", style.medallion)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider", style.accent)}>{style.eyebrow}</p>
                      <h3 className="text-lg font-bold leading-tight">{plan.displayName}</h3>
                    </div>
                  </div>

                  <p className="mt-3 min-h-12 text-xs text-muted-foreground">{plan.tagline}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight tabular-nums">{formatUSDCents(monthlyAmount)}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 min-h-8 text-[11px] text-muted-foreground">
                    {annual ? `${formatUSDCents(billingAmount)} billed yearly${savings ? ` · save ${savings}%` : ""}` : `${formatUSDCents(billingAmount)} billed monthly`}
                  </p>
                  {plan.trialDays > 0 && <p className="text-[11px] font-medium text-emerald-700">{formatTrialLabel(plan.trialDays)}</p>}

                  <Button
                    className={cn("mt-4 min-h-11 w-full gap-1.5 font-semibold", style.cta)}
                    variant={isCurrent ? "secondary" : style.ctaVariant}
                    disabled={isCurrent || Boolean(currentSub && !currentSub.billing_portal_available)}
                    onClick={() => {
                      if (currentSub?.billing_portal_available) {
                        void openBillingPortal();
                      } else if (!currentSub) {
                        setCheckoutPlan(plan);
                      }
                    }}
                  >
                    {isCurrent
                      ? "Current plan"
                      : currentSub?.billing_portal_available
                        ? "Manage plan"
                        : currentSub
                          ? "Billing review required"
                          : "Review checkout"}
                  </Button>

                  <div className="my-4 h-px bg-border/60" />
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", style.checkBg)}>
                          <Check className={cn("h-2.5 w-2.5", style.checkText)} />
                        </span>
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] text-muted-foreground">{plan.support}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{plan.cancellationTerms}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Prices are USD. Exact renewal date, trial terms, taxes, amount due, and cancellation terms are shown before you subscribe.
      </p>

      <SoftwareSubscriptionCheckoutDialog
        open={Boolean(checkoutPlan)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setCheckoutPlan(null); }}
        plan={checkoutPlan}
        cycle={cycle}
        storeId={storeId}
      />
    </div>
  );
}
