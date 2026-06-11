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
import { Check, Sparkles, ExternalLink, CreditCard, CheckCircle2 } from "lucide-react";
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

export default function SoftwareSubscriptionSection({ storeId }: { storeId: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const annual = cycle === "annual";
  const [email, setEmail] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SoftwarePlan | null>(null);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {SOFTWARE_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col overflow-hidden",
              plan.featured && "border-primary/50 ring-1 ring-primary/20"
            )}
          >
            {plan.featured && (
              <div className="absolute right-0 top-0">
                <span className="inline-flex items-center gap-1 rounded-bl-lg bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              </div>
            )}
            <CardContent className="p-4 flex flex-col flex-1">
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 min-h-[32px]">{plan.tagline}</p>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{formatUSD(monthlyPrice(plan, cycle))}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {annual ? (
                  <>
                    <s>{formatUSD(plan.monthly)}/mo</s> · {formatUSD(chargedAmount(plan, cycle))} billed yearly
                  </>
                ) : (
                  "billed monthly"
                )}
              </p>

              <Button
                className="mt-3 w-full gap-1.5"
                variant={plan.featured ? "default" : "outline"}
                onClick={() => setCheckoutPlan(plan)}
              >
                Start free trial
              </Button>

              <ul className="mt-4 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
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
