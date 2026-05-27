/**
 * CoinRechargeSheet — In-live Stripe payment.
 * Uses Stripe PaymentElement (auto-renders Apple Pay / Google Pay / cards)
 * and ExpressCheckoutElement for one-tap wallet pay.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { X, ShieldCheck, Sparkles, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";
import { coinPackages, type CoinPackage } from "@/config/coinPackages";
import { supabase } from "@/integrations/supabase/client";
import { getStripe } from "@/lib/stripe";
import { useAuth } from "@/contexts/AuthContext";

interface CoinRechargeSheetProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchase?: (coins: number) => Promise<void> | void;
}

interface IntentInfo {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  coins: number;
}

function PayForm({
  selected,
  intent,
  onBack,
  onSuccess,
}: {
  selected: CoinPackage;
  intent: IntentInfo;
  onBack: () => void;
  onSuccess: (coins: number) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const queryClient = useQueryClient();

  const verifyAndCredit = useCallback(
    async (paymentIntentId: string) => {
      const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
        body: { payment_intent_id: paymentIntentId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Verification failed");
      if (!data?.credited) throw new Error("Payment received, but coins are still processing");
      queryClient.invalidateQueries();
      const credited = data.coins ?? selected.coins + (selected.bonus || 0);
      toast.success("Coins added", {
        description: `+${credited.toLocaleString()} Z Coins`,
      });
      onSuccess(credited);
    },
    [queryClient, selected, onSuccess],
  );

  const handleConfirm = useCallback(async () => {
    if (!stripe || !elements) {
      toast.error("Payment form is still loading");
      return;
    }
    setSubmitting(true);
    try {
      const { error: submitErr } = await elements.submit();
      if (submitErr) throw new Error(submitErr.message || "Please complete the card form");

      const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (confirmErr) throw new Error(confirmErr.message || "Payment failed");
      if (!paymentIntent) throw new Error("Payment confirmation incomplete");
      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Payment ${paymentIntent.status.replace(/_/g, " ")}`);
      }
      await verifyAndCredit(paymentIntent.id);
    } catch (e: any) {
      const msg = e?.message ?? "Please try again.";
      // Auto-reopen the card form so the user can try another card.
      toast.error("Card declined", {
        description: `${msg} — please enter another card.`,
      });
      try {
        const el = elements?.getElement(PaymentElement);
        // @ts-expect-error PaymentElement supports collapse() at runtime
        el?.collapse?.();
      } catch {}
    } finally {
      setSubmitting(false);
    }
  }, [stripe, elements, intent.clientSecret, verifyAndCredit]);

  const handleExpressConfirm = useCallback(async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (confirmErr) throw new Error(confirmErr.message || "Payment failed");
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error("Wallet payment did not complete");
      }
      await verifyAndCredit(paymentIntent.id);
    } catch (e: any) {
      toast.error("Payment failed", { description: e?.message ?? "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }, [stripe, elements, intent.clientSecret, verifyAndCredit]);

  return (
    <div className="px-6 pb-8 flex flex-col items-center max-h-[80vh] overflow-y-auto">
      <h3 className="text-white font-bold text-lg mb-4">Pay in Live</h3>

      <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 mb-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/50">Coins</span>
          <div className="flex items-center gap-1.5">
	            <img src={goldCoinIcon} alt="" className="w-4 h-4" loading="lazy" decoding="async" />
            <span className="text-amber-300 font-bold">{selected.coins.toLocaleString()}</span>
          </div>
        </div>
        {selected.bonus ? (
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/50">Bonus</span>
            <span className="text-green-400 font-bold">+{selected.bonus.toLocaleString()}</span>
          </div>
        ) : null}
        <div className="border-t border-white/10 pt-2 flex items-center justify-between">
          <span className="text-white/50 text-sm">Total</span>
          <span className="text-white font-bold text-lg">
            {(selected.coins + (selected.bonus || 0)).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Express Checkout (Apple Pay / Google Pay) */}
      <div className="w-full mb-3 min-h-[8px]">
        <ExpressCheckoutElement
          onConfirm={handleExpressConfirm}
          options={{ layout: { maxColumns: 1, maxRows: 1 } }}
        />
      </div>

      {/* Card form */}
      <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-white/70" />
          <span className="text-sm font-semibold text-white">Pay with card</span>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <PaymentElement
            options={{
              layout: "tabs",
              wallets: { applePay: "never", googlePay: "never" },
            }}
            onReady={() => setPaymentReady(true)}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-white/45">
          <ShieldCheck className="w-3 h-3" />
          Your payment stays inside live and is processed by Stripe.
        </div>
      </div>

      <div className="w-full bg-white/5 rounded-2xl p-3 border border-white/10 mb-5 flex items-center justify-between">
        <span className="text-white/60 text-sm">Amount</span>
        <span className="text-white font-bold text-xl">${selected.price.toFixed(2)}</span>
      </div>

      <div className="flex gap-3 w-full">
        <button type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3 rounded-2xl bg-white/10 text-white/70 font-semibold text-sm disabled:opacity-50"
        >
          Back
        </button>
        <button type="button"
          onClick={handleConfirm}
          disabled={!stripe || submitting || !paymentReady}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing…
            </>
          ) : (
            <>Pay ${selected.price.toFixed(2)}</>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CoinRechargeSheet({ open, onClose, currentBalance, onPurchase }: CoinRechargeSheetProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<CoinPackage | null>(null);
  const [intent, setIntent] = useState<IntentInfo | null>(null);
  const [step, setStep] = useState<"select" | "loading" | "pay">("select");

  const stripePromise = useMemo(() => getStripe(), []);

  const reset = useCallback(() => {
    setSelected(null);
    setIntent(null);
    setStep("select");
  }, []);

  const handleClose = useCallback(() => {
    if (step === "loading") return;
    reset();
    onClose();
  }, [step, reset, onClose]);

  const handleSelect = useCallback(
    async (pkg: CoinPackage) => {
      if (!user) {
        toast.error("Please sign in to buy coins");
        return;
      }
      setSelected(pkg);
      setStep("loading");
      try {
        const { data, error } = await supabase.functions.invoke("create-coin-payment-intent", {
          body: { package_id: pkg.id },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Failed to start payment");
        if (!data?.client_secret) throw new Error("No payment secret returned");
        setIntent({
          clientSecret: data.client_secret,
          paymentIntentId: data.payment_intent_id,
          amountCents: data.amount_cents,
          coins: data.coins,
        });
        setStep("pay");
      } catch (e: any) {
        toast.error("Couldn't start payment", { description: e?.message ?? "Please try again." });
        reset();
      }
    },
    [user, reset],
  );

  // Reset when sheet closes
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200]"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 to-black rounded-t-3xl max-h-[88vh] overflow-hidden safe-area-bottom"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {step === "select" && (
              <div className="px-4 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
	                    <img src={goldCoinIcon} alt="" className="w-6 h-6" loading="lazy" decoding="async" />
                    <div>
                      <h3 className="text-white font-bold text-base">Get Z Coins</h3>
                      <p className="text-white/40 text-[10px]">
                        Balance: {currentBalance.toLocaleString()} coins
                      </p>
                    </div>
                  </div>
                  <button type="button"
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {coinPackages.map((pkg) => (
                    <button type="button"
                      key={pkg.id}
                      onClick={() => handleSelect(pkg)}
                      className={`relative rounded-2xl border p-3 text-left transition-all active:scale-[0.97] ${
                        pkg.popular
                          ? "border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {pkg.badge && (
                        <span
                          className={`absolute -top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            pkg.popular
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black"
                              : "bg-white/15 text-white/70"
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5">
	                        <img src={goldCoinIcon} alt="" className="w-5 h-5" loading="lazy" decoding="async" />
                        <span className="text-amber-300 font-bold text-lg">{pkg.coins.toLocaleString()}</span>
                      </div>
                      {pkg.bonus ? (
                        <p className="text-green-400 text-[10px] font-semibold mb-1.5">
                          +{pkg.bonus.toLocaleString()} bonus
                        </p>
                      ) : (
                        <p className="text-white/30 text-[10px] mb-1.5">&nbsp;</p>
                      )}
                      <div className="bg-white/10 rounded-xl py-1.5 text-center">
                        <span className="text-white font-bold text-sm">${pkg.price.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-4 mt-4 text-white/30">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[9px]">Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[9px]">Instant delivery</span>
                  </div>
                </div>
              </div>
            )}

            {step === "loading" && (
              <div className="px-6 pb-12 flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
                <p className="text-white/70 text-sm">Preparing secure payment…</p>
              </div>
            )}

            {step === "pay" && selected && intent && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: intent.clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#f59e0b",
                      colorBackground: "#0f0f10",
                      colorText: "#ffffff",
                      colorDanger: "#ef4444",
                      borderRadius: "12px",
                    },
                  },
                }}
              >
                <PayForm
                  selected={selected}
                  intent={intent}
                  onBack={reset}
                  onSuccess={async (coins) => {
                    try {
                      await onPurchase?.(coins);
                    } catch {
                      // Realtime balance subscription will reconcile; don't block the close.
                    }
                    reset();
                    onClose();
                  }}
                />
              </Elements>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
