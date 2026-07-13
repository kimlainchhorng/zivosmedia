import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

function formatTopupAmount(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function topupReturnUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${window.location.pathname}?topup=success`;
}

function TopupPaymentForm({
  amountCents,
  paymentIntentId,
  onBack,
  onPaid,
}: {
  amountCents: number;
  paymentIntentId: string | null;
  onBack: () => void;
  onPaid: (data: unknown) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentLoadError, setPaymentLoadError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !paymentReady) {
      toast.message("Payment form is still loading");
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: topupReturnUrl(),
        },
      });

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      const resolvedPaymentIntentId = paymentIntent?.id || paymentIntentId;
      if (!resolvedPaymentIntentId) {
        throw new Error("Payment could not be verified");
      }

      if (paymentIntent && paymentIntent.status !== "succeeded") {
        toast.message("Payment is processing. Your balance will update shortly.");
        onPaid({ credited: false });
        return;
      }

      const { data, error: verifyError } = await supabase.functions.invoke("verify-user-wallet-topup", {
        body: { payment_intent_id: resolvedPaymentIntentId },
      });

      if (verifyError || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error || verifyError?.message || "Could not credit wallet");
      }

      onPaid(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <PaymentElement
            onReady={() => {
              setPaymentReady(true);
              setPaymentLoadError(null);
            }}
            onLoadError={(event) => {
              setPaymentReady(false);
              setPaymentLoadError(event.error.message || "Payment form could not load");
            }}
            options={{
              layout: "accordion",
              wallets: { applePay: "auto", googlePay: "auto" },
            }}
          />
        </div>
        {!paymentReady && !paymentLoadError && (
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading secure payment form...</p>
        )}
        {paymentLoadError && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700">
            {paymentLoadError}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-slate-900/10 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="h-11 flex-1 rounded-2xl border border-slate-900/10 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || !paymentReady || submitting}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${formatTopupAmount(amountCents)}`}
        </button>
      </div>
    </form>
  );
}

export function TravelWalletTopupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const dragControls = useDragControls();
  const [amount, setAmount] = useState("25");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"amount" | "payment">("amount");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number.parseFloat(amount || "0");
  const amountCents = Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : 0;

  const close = () => {
    if (busy) return;
    onOpenChange(false);
    setStep("amount");
    setClientSecret(null);
    setPaymentIntentId(null);
    setError(null);
  };

  const startTopup = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      setError("Wallet top-up is not configured for this build.");
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents < 500) {
      setError("Minimum top-up is $5.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-user-wallet-topup", {
        body: {
          amount_cents: amountCents,
          currency: "USD",
          ui_mode: "embedded",
        },
      });
      if (fnError || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error || fnError?.message || "Could not start top-up");
      }

      const secret = (data as { client_secret?: string } | null)?.client_secret;
      if (!secret) {
        throw new Error("No in-app payment form returned.");
      }

      setClientSecret(secret);
      setPaymentIntentId((data as { payment_intent_id?: string } | null)?.payment_intent_id || null);
      setStep("payment");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start top-up";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const completeTopup = (data: unknown) => {
    const payload = data as { credited?: boolean; balance_cents?: number } | null;
    if (payload?.credited) {
      toast.success(`Wallet credited - balance ${formatTopupAmount(payload.balance_cents ?? 0)}`);
    } else {
      toast.success("Payment received");
    }
    void queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
    void queryClient.invalidateQueries({ queryKey: ["customer-wallet-transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1450] flex items-end justify-center bg-slate-950/55 px-0 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 650) close();
            }}
            onClick={(event) => event.stopPropagation()}
            className="zivo-travel-3d zivo-travel-light flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-slate-950 shadow-2xl shadow-slate-950/20 sm:max-w-md sm:rounded-3xl"
          >
            <button
              type="button"
              aria-label="Swipe down to close"
              onPointerDown={(event) => dragControls.start(event)}
              className="shrink-0 cursor-grab touch-none px-5 pb-1 pt-3 active:cursor-grabbing"
            >
              <span className="mx-auto block h-1 w-11 rounded-full bg-slate-900/15" />
            </button>

            <div className="shrink-0 border-b border-slate-900/10 px-5 pb-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20">
                  <Wallet className="h-5 w-5 text-sky-600" />
                </span>
                <div>
                  <h3 className="text-lg font-black">Top up wallet</h3>
                  <p className="text-xs font-semibold text-slate-500">Pay inside Zivo Travel. Balance updates after payment.</p>
                </div>
              </div>
            </div>

            {step === "amount" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
                  <div className="grid grid-cols-5 gap-2">
                    {QUICK_AMOUNTS.map((quickAmount) => (
                      <button
                        type="button"
                        key={quickAmount}
                        onClick={() => setAmount(String(quickAmount))}
                        className={`h-10 rounded-xl border text-sm font-black transition ${
                          amount === String(quickAmount)
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-slate-900/10 bg-slate-50 text-slate-700 hover:bg-white"
                        }`}
                      >
                        ${quickAmount}
                      </button>
                    ))}
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Amount</span>
                    <span className="mt-2 flex h-12 items-center rounded-2xl border border-slate-900/10 bg-white px-4 shadow-sm">
                      <span className="mr-2 text-sm font-black text-slate-400">$</span>
                      <input
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        inputMode="decimal"
                        type="number"
                        min={5}
                        step={1}
                        className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-900 outline-none"
                        placeholder="25"
                      />
                    </span>
                  </label>

                  <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-slate-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Stripe handles the payment form. Zivo Travel never sees your full card number.
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700">{error}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2 border-t border-slate-900/10 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  <button
                    type="button"
                    className="h-11 flex-1 rounded-2xl border border-slate-900/10 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    disabled={busy}
                    onClick={close}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                    disabled={busy || amountCents < 500}
                    onClick={startTopup}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Continue ${formatTopupAmount(amountCents)}`}
                  </button>
                </div>
              </div>
            )}

            {step === "payment" && clientSecret && (
              <Elements
                stripe={getStripe()}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      borderRadius: "12px",
                    },
                  },
                }}
              >
                <TopupPaymentForm
                  amountCents={amountCents}
                  paymentIntentId={paymentIntentId}
                  onBack={() => {
                    setStep("amount");
                    setClientSecret(null);
                    setPaymentIntentId(null);
                  }}
                  onPaid={completeTopup}
                />
              </Elements>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TravelWalletTopupDialog;
