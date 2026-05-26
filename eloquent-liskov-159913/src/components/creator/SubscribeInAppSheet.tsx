import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, CreditCard, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

interface Props {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  tier: {
    id: string;
    name: string;
    price_cents: number;
    billing_interval?: string;
    badge_emoji?: string | null;
    welcome_message?: string | null;
    benefits?: any;
  } | null;
}

function intervalLabel(interval?: string): string {
  switch (interval) {
    case "month": return "month";
    case "3_months": return "3 months";
    case "6_months": return "6 months";
    case "year": return "year";
    case "lifetime": return "one-time";
    default: return "month";
  }
}

function SubscribeForm({ creatorId, creatorName, tier, onClose }: Omit<Props, "open">) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!tier) return null;

  const handleSubscribe = async () => {
    if (!user) { toast.error("Sign in to subscribe"); return; }
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-to-tier-intent", {
        body: { tier_id: tier.id, creator_id: creatorId, amount_cents: tier.price_cents },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const clientSecret: string | null = data?.client_secret ?? null;
      if (!clientSecret) throw new Error("Missing client secret");

      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (stripeErr) {
        toast.error(stripeErr.message || "Payment failed");
        return;
      }
      if (paymentIntent?.status !== "succeeded" && paymentIntent?.status !== "processing") {
        toast.error("Payment not completed");
        return;
      }

      // Record the subscription in our DB so the visitor preview reflects it.
      await (supabase as any).from("creator_subscriptions").insert({
        creator_id: creatorId,
        subscriber_id: user.id,
        tier_id: tier.id,
        status: "active",
        price_cents: tier.price_cents,
        stripe_subscription_id: data?.subscription_id ?? null,
      });

      setDone(true);
      toast.success(`Subscribed to ${creatorName}!`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-active-subscription", creatorId, user.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-subscriptions", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["creator-top-supporters", creatorId] }),
      ]);
    } catch (err: any) {
      console.error("[SubscribeInApp]", err);
      toast.error(err?.message || "Subscribe failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="px-5 pb-6 text-center">
        <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Check className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="text-lg font-extrabold">Welcome to {tier.name}!</h3>
        {tier.welcome_message && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {tier.welcome_message}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-11 rounded-full bg-foreground text-background font-bold text-sm active:scale-[0.99]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00AEEF] to-[#0099D9] flex items-center justify-center text-white text-lg">
            {tier.badge_emoji || <Crown className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Subscribe to {tier.name}</h3>
            <p className="text-xs text-muted-foreground">{creatorName}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-2xl bg-muted/40 p-4 mb-4">
        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Subscription</p>
        <p className="text-2xl font-extrabold mt-1">
          ${(tier.price_cents / 100).toFixed(2)}
          <span className="text-sm font-semibold text-muted-foreground"> / {intervalLabel(tier.billing_interval)}</span>
        </p>
        {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
          <ul className="mt-3 space-y-1">
            {tier.benefits.slice(0, 4).map((b: string, i: number) => (
              <li key={i} className="text-[12px] flex items-start gap-1.5 text-foreground/80">
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block text-[11px] font-bold text-foreground/80 uppercase tracking-wide mb-1">
        Card details
      </label>
      <div className="rounded-xl border border-border/50 bg-white px-3 py-3.5 mb-4 focus-within:ring-2 focus-within:ring-[#00AEEF]/40 min-h-[48px]">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: "16px",
                color: "#0f172a",
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: { color: "#ef4444" },
            },
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={submitting || !stripe}
        className="w-full h-12 rounded-full bg-gradient-to-r from-[#00AEEF] to-[#0099D9] text-white font-extrabold text-sm uppercase tracking-wide active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#00AEEF]/30"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {submitting ? "Processing..." : `Pay $${(tier.price_cents / 100).toFixed(2)}`}
      </button>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Secured by Stripe. Cancel anytime.
      </p>
    </div>
  );
}

export default function SubscribeInAppSheet({ open, onClose, creatorId, creatorName, tier }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-t-3xl pb-[calc(2rem+var(--zivo-safe-bottom,0px))] max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex justify-center py-3 sticky top-0 bg-background z-10">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <Elements stripe={getStripe()}>
              <SubscribeForm
                creatorId={creatorId}
                creatorName={creatorName}
                tier={tier}
                onClose={onClose}
              />
            </Elements>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
