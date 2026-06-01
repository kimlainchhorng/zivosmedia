/**
 * TipSheet — In-app Stripe-powered tip with embedded card form
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Heart, Sparkles, Send, CreditCard, ShieldCheck, LockKeyhole, WalletCards, MessageSquareText, CheckCircle2, BadgeDollarSign, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

interface TipSheetProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | null;
}

const TIP_AMOUNTS_DEFAULT = [100, 200, 500, 1000, 2500, 5000];

function readCreatorTipPresets(): number[] {
  if (typeof window === "undefined") return TIP_AMOUNTS_DEFAULT;
  const raw = window.localStorage.getItem("zivo:of:tip_presets_cents");
  if (!raw) return TIP_AMOUNTS_DEFAULT;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === "number" && v >= 100)) {
      const padded = [...arr, ...TIP_AMOUNTS_DEFAULT.filter((d) => !arr.includes(d))].slice(0, 6);
      return padded;
    }
  } catch {}
  return TIP_AMOUNTS_DEFAULT;
}

function TipForm({
  creatorId,
  creatorName,
  creatorAvatar,
  onClose,
}: {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const tipAmounts = readCreatorTipPresets();
  const [selectedAmount, setSelectedAmount] = useState(tipAmounts[1] ?? tipAmounts[0] ?? 200);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [step, setStep] = useState<"amount" | "pay">("amount");

  const finalAmount = showCustom ? Math.round(parseFloat(customAmount || "0") * 100) : selectedAmount;
  const finalDollars = (finalAmount / 100).toFixed(2);
  const messageLength = message.trim().length;
  const readyToContinue = finalAmount >= 100;
  const stepNumber = step === "amount" ? 1 : 2;
  const stepLabel = step === "amount" ? "Amount" : "Payment";
  const supportSignal =
    finalAmount >= 2500
      ? { label: "Patron move", detail: "High impact tip", width: "100%" }
      : finalAmount >= 500
        ? { label: "Strong support", detail: "Creator boost", width: "68%" }
        : { label: "Quick boost", detail: "Small thank-you", width: "38%" };
  const cardReadiness = stripe && elements ? "Card ready" : "Secure form loading";

  const handleContinue = () => {
    if (finalAmount < 100) {
      toast.error("Minimum tip is $1.00");
      return;
    }
    setStep("pay");
  };

  const handlePay = async () => {
    if (!user || !stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setSending(true);
    try {
      // 1. Create PaymentIntent via edge function
      const { data, error } = await supabase.functions.invoke("create-tip-payment-intent", {
        body: {
          creator_id: creatorId,
          amount_cents: finalAmount,
          message: message || null,
          is_anonymous: isAnonymous,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 2. Confirm payment in-app
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card },
      });

      if (stripeError) {
        toast.error(stripeError.message || "Payment failed");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        toast.success(`Sent $${(finalAmount / 100).toFixed(2)} tip to ${creatorName}! 🎉`);
        // Notify creator they received a tip
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: creatorId,
              notification_type: "tip_received",
              title: "You received a tip! 💰",
              body: `${isAnonymous ? "Someone" : (sp?.full_name || "Someone")} sent you $${(finalAmount / 100).toFixed(2)}`,
              data: { type: "tip_received", amount_cents: finalAmount, sender_id: isAnonymous ? null : user.id, avatar_url: isAnonymous ? null : sp?.avatar_url, action_url: "/wallet" },
            },
          });
        } catch {}
        onClose();
      } else {
        toast.error("Payment not completed");
      }
    } catch (err: any) {
      console.error("[TipSheet] Pay error:", err);
      toast.error(err?.message || "Payment failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-4 pb-1">
      <div className="zivo-social-header-glass mb-4 flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="zivo-social-avatar-ring h-12 w-12 shrink-0 p-0.5">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-rose-400 to-fuchsia-500">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <Heart className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase text-amber-500">Creator support</p>
            <h3 className="truncate text-base font-black tracking-tight text-foreground">Send a Tip</h3>
            <p className="truncate text-xs font-semibold text-muted-foreground">to {creatorName}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="zivo-social-module-tile mb-3 rounded-2xl px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Step {stepNumber} of 2
          </span>
          <span className="zivo-social-chip rounded-full px-2 py-1 text-[10px] font-black text-primary">
            {stepLabel}
          </span>
        </div>
        <div className="zivo-social-chip h-1.5 overflow-hidden rounded-full p-0">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 transition-[width] duration-300"
            style={{ width: step === "amount" ? "50%" : "100%" }}
          />
        </div>
      </div>

      {step === "amount" ? (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <DollarSign className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">${finalDollars}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Amount</p>
              </div>
            </div>
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">{isAnonymous ? "Private" : "Named"}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Sender</p>
              </div>
            </div>
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${readyToContinue ? "bg-fuchsia-500/10 text-fuchsia-500" : "bg-muted text-muted-foreground"}`}>
                <MessageSquareText className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">{messageLength}/200</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Message</p>
              </div>
            </div>
          </div>

          {/* Amount Grid */}
          {!showCustom ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {tipAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  aria-label={`Select ${(amt / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} tip`}
                  aria-pressed={!showCustom && selectedAmount === amt}
                  className={`rounded-2xl py-3 text-sm font-black transition-all active:scale-[0.98] ${
                    selectedAmount === amt
                      ? "bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-500 text-white shadow-[0_18px_40px_rgba(245,158,11,0.28)] scale-[1.02]"
                      : "zivo-social-module-tile text-foreground hover:scale-[1.01]"
                  }`}
                >
                  ${(amt / 100).toFixed(0)}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-4">
              <div className="zivo-social-sheet-input relative rounded-2xl">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  aria-label="Custom tip amount in dollars"
                  className="w-full bg-transparent py-3 pl-10 pr-4 text-lg font-black text-foreground focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}

          <button type="button" onClick={() => setShowCustom(!showCustom)} className="zivo-social-chip mb-4 rounded-full px-3 py-1.5 text-xs font-black text-primary active:scale-95">
            {showCustom ? "← Choose preset amount" : "Enter custom amount →"}
          </button>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={2}
            maxLength={200}
            className="zivo-social-sheet-input mb-2 w-full resize-none rounded-2xl p-3 text-sm font-semibold text-foreground focus:outline-none"
          />
          <div className="zivo-social-chip mb-3 h-1.5 overflow-hidden rounded-full p-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, (message.length / 200) * 100)}%` }}
            />
          </div>

          <label className="zivo-social-module-tile mb-5 flex cursor-pointer items-center gap-3 rounded-2xl p-3">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-border" />
            <span className="text-sm font-semibold text-muted-foreground">Send anonymously</span>
            <ShieldCheck className="ml-auto h-4 w-4 text-emerald-500" />
          </label>

          <div className="zivo-social-module-tile mb-4 rounded-[1.25rem] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                  <BadgeDollarSign className="h-4 w-4 text-amber-600" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{supportSignal.label}</p>
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">{supportSignal.detail}</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600">
                Ready
              </span>
            </div>
            <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-fuchsia-500 transition-[width] duration-300"
                style={{ width: supportSignal.width }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={finalAmount < 100}
            aria-label={`Continue to card payment for ${finalDollars} dollars`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 py-3.5 text-sm font-black text-white shadow-[0_20px_44px_rgba(245,158,11,0.28)] disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            Continue with Card · ${finalDollars}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                if (finalAmount < 100) return toast.error("Minimum tip is $1.00");
                setSending(true);
                try {
                  const returnUrl = `${window.location.origin}${window.location.pathname}?tip_paypal_return=1`;
                  const cancelUrl = `${window.location.origin}${window.location.pathname}?tip_paypal_cancel=1`;
                  const { data, error } = await supabase.functions.invoke("create-tip-paypal-order", {
                    body: { creator_id: creatorId, amount_cents: finalAmount, message, is_anonymous: isAnonymous, return_url: returnUrl, cancel_url: cancelUrl },
                  });
                  if (error) throw error;
                  if ((data as any)?.error) throw new Error((data as any).error);
                  if (!(data as any)?.approve_url) throw new Error("PayPal did not return approval URL");
                  window.location.assign((data as any).approve_url);
                } catch (e: any) {
                  toast.error(e?.message || "PayPal could not start");
                  setSending(false);
                }
              }}
              disabled={sending || finalAmount < 100}
              aria-label={`Pay ${finalDollars} dollars with PayPal`}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#FFC439] py-2.5 text-xs font-black text-[#003087] shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <WalletCards className="h-3.5 w-3.5" />
              PayPal
            </button>
            <button
              type="button"
              onClick={async () => {
                if (finalAmount < 100) return toast.error("Minimum tip is $1.00");
                setSending(true);
                try {
                  const returnUrl = `${window.location.origin}${window.location.pathname}?tip_square_return=1`;
                  const { data, error } = await supabase.functions.invoke("create-tip-square-checkout", {
                    body: { creator_id: creatorId, amount_cents: finalAmount, message, is_anonymous: isAnonymous, return_url: returnUrl },
                  });
                  if (error) throw error;
                  if ((data as any)?.error) throw new Error((data as any).error);
                  if (!(data as any)?.url) throw new Error("Square did not return URL");
                  window.location.assign((data as any).url);
                } catch (e: any) {
                  toast.error(e?.message || "Square could not start");
                  setSending(false);
                }
              }}
              disabled={sending || finalAmount < 100}
              aria-label={`Pay ${finalDollars} dollars with Square`}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-950 py-2.5 text-xs font-black text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <WalletCards className="h-3.5 w-3.5" />
              Square
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="zivo-social-module mb-3 flex items-center gap-1.5 rounded-[1.25rem] px-3 py-2 text-sm text-muted-foreground">
            <button type="button" onClick={() => setStep("amount")} className="zivo-social-chip rounded-full px-3 py-1 text-xs font-black text-primary active:scale-95">← Back</button>
            <span className="ml-auto rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-black text-foreground">
              ${finalDollars}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <CreditCard className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">${finalDollars}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <LockKeyhole className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">Stripe</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Secure</p>
              </div>
            </div>
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                <Heart className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">{isAnonymous ? "Anon" : "Public"}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Receipt</p>
              </div>
            </div>
          </div>

          <div className="zivo-social-module-tile mb-4 rounded-[1.25rem] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="zivo-social-share-orb flex h-8 w-8 items-center justify-center rounded-2xl">
                <LockKeyhole className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">Secure card payment</p>
                <p className="text-[11px] font-semibold text-muted-foreground">Card details are encrypted by Stripe.</p>
              </div>
            </div>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#1a1a1a",
                    "::placeholder": { color: "#9ca3af" },
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>

          <div className="zivo-social-module-tile mb-4 flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gauge className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-foreground">{cardReadiness}</p>
                <p className="truncate text-[11px] font-semibold text-muted-foreground">Final check before sending ${finalDollars}</p>
              </div>
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-600">
              Stripe
            </span>
          </div>

          <button
            type="button"
            onClick={handlePay}
            disabled={sending || !stripe}
            aria-label={`Send ${finalDollars} dollar tip by card`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 py-3.5 text-sm font-black text-white shadow-[0_20px_44px_rgba(245,158,11,0.28)] disabled:opacity-50"
          >
            {sending ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Pay ${finalDollars}
              </>
            )}
          </button>
        </>
      )}

      <p className="zivo-social-chip mx-auto mt-3 w-fit rounded-full px-3 py-1.5 text-center text-[10px] font-bold uppercase text-muted-foreground">
        Powered by Stripe · Secure payment
      </p>
    </div>
  );
}

/* ── Outer wrapper with Elements provider ── */
export default function TipSheet({ open, onClose, creatorId, creatorName, creatorAvatar }: TipSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="zivo-social-sheet-backdrop fixed inset-0 z-[200] flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="zivo-social-sheet-panel w-full max-w-md overflow-hidden rounded-t-[1.75rem] pb-8 sm:rounded-[1.75rem]"
          >
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <Elements stripe={getStripe()}>
              <TipForm creatorId={creatorId} creatorName={creatorName} creatorAvatar={creatorAvatar} onClose={onClose} />
            </Elements>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
