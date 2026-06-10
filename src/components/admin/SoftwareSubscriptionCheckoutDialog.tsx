/**
 * SoftwareSubscriptionCheckoutDialog — pay for a ZIVO Software plan without
 * leaving the admin. Creates an incomplete subscription on the software project
 * and confirms the card with Stripe's embedded Payment Element. A free trial
 * collects the card via a SetupIntent (nothing charged today).
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Shield, Check, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react";
import { ZIVO_SOFTWARE_ORIGIN } from "@/config/autoRepairDomain";
import {
  getSoftwareStripe,
  createSoftwareSubscription,
  isSoftwareStripeConfigured,
  SoftwareCheckoutError,
} from "@/lib/software/softwareCheckout";
import {
  FREE_TRIAL_DAYS,
  chargedAmount,
  monthlyPrice,
  formatUSD,
  type BillingCycle,
  type SoftwarePlan,
} from "@/lib/software/softwarePlans";

const stripePromise = getSoftwareStripe();

type Phase = "loading" | "ready" | "not_configured" | "error" | "success";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SoftwarePlan | null;
  cycle: BillingCycle;
  email: string | null;
}

export default function SoftwareSubscriptionCheckoutDialog({ open, onOpenChange, plan, cycle, email }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [mode, setMode] = useState<"setup" | "payment">("setup");
  const [error, setError] = useState<string | null>(null);

  // Kick off subscription creation when the dialog opens for a plan.
  useEffect(() => {
    if (!open || !plan) return;
    let cancelled = false;
    setClientSecret(null);
    setError(null);

    if (!isSoftwareStripeConfigured) {
      setPhase("not_configured");
      return;
    }
    if (!email) {
      setPhase("error");
      setError("We couldn't find your account email. Please sign in again.");
      return;
    }

    setPhase("loading");
    createSoftwareSubscription({ planId: plan.id, cycle, email })
      .then((res) => {
        if (cancelled) return;
        setClientSecret(res.clientSecret);
        setMode(res.mode);
        setPhase("ready");
      })
      .catch((e: SoftwareCheckoutError) => {
        if (cancelled) return;
        if (e.code === "stripe_not_configured" || e.code === "price_not_configured") {
          setPhase("not_configured");
        } else {
          setError(e.message);
          setPhase("error");
        }
      });
    return () => { cancelled = true; };
  }, [open, plan, cycle, email]);

  if (!plan) return null;

  const perMonth = monthlyPrice(plan, cycle);
  const charged = chargedAmount(plan, cycle);
  const period = cycle === "annual" ? "year" : "month";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" /> ZIVO {plan.name} — checkout
          </DialogTitle>
        </DialogHeader>

        {/* Order summary */}
        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">ZIVO {plan.name}</p>
              <p className="text-[11px] text-muted-foreground">{cycle === "annual" ? "Annual plan" : "Monthly plan"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{formatUSD(perMonth)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></p>
            </div>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600" /> {FREE_TRIAL_DAYS}-day free trial — $0.00 today</li>
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600" /> Then {formatUSD(charged)} per {period}</li>
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600" /> Cancel anytime before the trial ends</li>
          </ul>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-xs text-muted-foreground">Due today</span>
            <span className="text-sm font-bold">{formatUSD(0)}</span>
          </div>
        </div>

        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing secure checkout…
          </div>
        )}

        {phase === "not_configured" && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Subscriptions are launching soon — secure billing is being connected. You can review plans now and come back to subscribe.</p>
            </div>
            <Button variant="outline" className="w-full gap-1.5" asChild>
              <a href={`${ZIVO_SOFTWARE_ORIGIN}/pricing`} target="_blank" rel="noopener noreferrer">
                View on the software site <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error || "Couldn't start checkout."}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <p className="text-sm font-semibold">You're all set!</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your {plan.name} trial has started. We'll email your receipt and renewal reminders.
            </p>
            <Button className="mt-2 w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}

        {phase === "ready" && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "12px" } } }}
          >
            <PayForm
              mode={mode}
              planName={plan.name}
              onCancel={() => onOpenChange(false)}
              onSucceeded={() => setPhase("success")}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayForm({
  mode,
  planName,
  onCancel,
  onSucceeded,
}: {
  mode: "setup" | "payment";
  planName: string;
  onCancel: () => void;
  onSucceeded: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canPay = useMemo(
    () => Boolean(stripe && elements && accepted && ready && !submitting),
    [stripe, elements, accepted, ready, submitting],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErr(submitError.message || "Please check your card details");
      setSubmitting(false);
      return;
    }

    // Trials collect the card with a SetupIntent (nothing charged today); a
    // due-now amount uses a PaymentIntent. `if_required` keeps us in-app when no
    // redirect-based auth (3DS) is needed.
    const confirmParams = { return_url: window.location.href };
    const result =
      mode === "setup"
        ? await stripe.confirmSetup({ elements, confirmParams, redirect: "if_required" })
        : await stripe.confirmPayment({ elements, confirmParams, redirect: "if_required" });

    if (result.error) {
      setErr(result.error.message || "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }
    onSucceeded();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-xl border bg-card p-3 min-h-[160px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }}
        />
      </div>

      <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <a href={`${ZIVO_SOFTWARE_ORIGIN}/terms`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms</a>{" "}
          and{" "}
          <a href={`${ZIVO_SOFTWARE_ORIGIN}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
        </span>
      </label>

      {err && <p className="text-xs text-destructive">{err}</p>}

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" /> Secured by Stripe · 256-bit encryption
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canPay} className="gap-1.5">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <>Start trial</>}
        </Button>
      </div>
    </form>
  );
}
