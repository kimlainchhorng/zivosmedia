import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZIVO_SOFTWARE_ORIGIN } from "@/config/autoRepairDomain";
import {
  createSoftwareCheckoutUrl,
  newSoftwareBillingIdempotencyKey,
  SoftwareCheckoutError,
} from "@/lib/software/softwareCheckout";
import {
  catalogBillingAmountCents,
  catalogMonthlyAmountCents,
  formatTrialLabel,
  formatUSDCents,
  type SoftwareBillingCycle,
  type SoftwarePricingCatalogPlan,
} from "@/lib/software/publicPricingCatalog";
import NativeDigitalPurchaseNotice from "@/components/payments/NativeDigitalPurchaseNotice";
import { isNativeDigitalPurchaseRestricted } from "@/lib/nativeDigitalPurchasePolicy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SoftwarePricingCatalogPlan | null;
  cycle: SoftwareBillingCycle;
  storeId: string;
};

export default function SoftwareSubscriptionCheckoutDialog({
  open,
  onOpenChange,
  plan,
  cycle,
  storeId,
}: Props) {
  const idempotencyKey = useRef(newSoftwareBillingIdempotencyKey("checkout"));
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nativeDigitalPurchasesDisabled = isNativeDigitalPurchaseRestricted();

  useEffect(() => {
    if (!open) return;
    idempotencyKey.current = newSoftwareBillingIdempotencyKey("checkout");
    setRedirecting(false);
    setError(null);
  }, [open, plan?.id, cycle]);

  if (!plan) return null;

  const selectedPlanId =
    cycle === "annual" ? plan.annualPlanId : plan.monthlyPlanId;
  const billingAmount = catalogBillingAmountCents(plan, cycle);
  const monthlyAmount = catalogMonthlyAmountCents(plan, cycle);
  const period = cycle === "annual" ? "year" : "month";

  const startCheckout = async () => {
    if (nativeDigitalPurchasesDisabled) return;
    setRedirecting(true);
    setError(null);
    try {
      const returnPath = `/admin/stores/${encodeURIComponent(storeId)}?tab=subscriptions`;
      const result = await createSoftwareCheckoutUrl({
        planId: selectedPlanId,
        cycle,
        businessId: storeId,
        idempotencyKey: idempotencyKey.current,
        returnUrl: returnPath,
      });
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof SoftwareCheckoutError
          ? checkoutError.message
          : "Couldn't start checkout. Please try again.",
      );
      // Keep this attempt's key for an explicit retry. If the browser lost the
      // response after Stripe accepted the request, the server/provider cache
      // returns the original Session instead of creating another subscription.
      setRedirecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" /> ZIVO{" "}
            {plan.displayName} checkout
          </DialogTitle>
        </DialogHeader>

        {nativeDigitalPurchasesDisabled ? (
          <>
            <NativeDigitalPurchaseNotice
              title="Software checkout is unavailable in this app"
              description="Existing business access remains available. The installed app does not offer a digital software subscription purchase or an external purchase link."
            />
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    ZIVO {plan.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cycle === "annual" ? "Annual billing" : "Monthly billing"}
                  </p>
                </div>
                <p className="text-right text-sm font-bold tabular-nums">
                  {formatUSDCents(monthlyAmount)}
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </div>

              <ul className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                {plan.trialDays > 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {formatTrialLabel(plan.trialDays)}; Stripe confirms the
                    first charge date before you submit.
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {formatUSDCents(billingAmount)} per {period} after any trial.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {plan.cancellationTerms}
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Your selected plan is revalidated against the active server
              catalog. You will review the final price, trial, renewal date, and
              payment method on Stripe before subscribing.
            </p>

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              className="min-h-11 w-full gap-2"
              onClick={startCheckout}
              disabled={redirecting}
            >
              {redirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening secure
                  checkout…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Continue to Stripe{" "}
                  <ExternalLink className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => onOpenChange(false)}
              disabled={redirecting}
            >
              Cancel
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Stripe-hosted checkout
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              By continuing, you can review the{" "}
              <a
                href={`${ZIVO_SOFTWARE_ORIGIN}/terms-of-service`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href={`${ZIVO_SOFTWARE_ORIGIN}/privacy-policy`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
