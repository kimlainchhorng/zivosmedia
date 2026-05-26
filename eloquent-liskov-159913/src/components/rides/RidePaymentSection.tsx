/**
 * RidePaymentSection — Saved cards, add new card, Apple Pay for ride checkout
 * Cambodia: Cash, QR Payment, Card only
 */
import { useState, useEffect, useCallback } from "react";
import { CreditCard, Plus, Trash2, Check, Shield, ChevronRight, Smartphone, LogIn, UserPlus, Banknote, QrCode, Building2 } from "lucide-react";
import AbaPaymentModal from "@/components/rides/AbaPaymentModal";
import { Button } from "@/components/ui/button";
import { CardElement, Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";

const USD_TO_KHR = 4062.5;
function toKHR(usd: number): string {
  return `${Math.round(usd * USD_TO_KHR).toLocaleString()} ៛`;
}
function dualPrice(usd: number, isCambodia: boolean): string {
  if (!isCambodia) return `$${usd.toFixed(2)}`;
  return `${toKHR(usd)} ($${usd.toFixed(2)})`;
}

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface RidePaymentSectionProps {
  price: number;
  vehicleName: string;
  isSubmitting: boolean;
  onAuthorizeWithSavedCard: (paymentMethodId: string) => void;
  onAuthorizeWithNewCard: () => void;
  clientSecret: string | null;
  onPaymentSuccess: () => void;
  paymentFailed: boolean;
  onClearError?: () => void;
  isCambodia?: boolean;
  /** Whether cash payment is allowed (based on IP/location restriction) */
  cashAllowed?: boolean;
  /** Handler for cash ride confirmation — creates ride without Stripe */
  onCashConfirm?: () => void;
  /** Handler for ABA Payway ride confirmation — creates ride without Stripe */
  onAbaConfirm?: () => void;
  /** Go back from card form to payment method selector (Cambodia) */
  onBackToMethods?: () => void;
  /** Callback when Cambodia payment method changes */
  onPaymentMethodChange?: (method: string) => void;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};

type CambodiaPaymentMethod = "aba" | "cash" | "qr" | "card";

/* ─── Cambodia Payment Methods ─── */
function CambodiaPaymentSelector({
  price,
  vehicleName,
  isSubmitting,
  onConfirm,
  cashAllowed = true,
  onMethodChange,
}: {
  price: number;
  vehicleName: string;
  isSubmitting: boolean;
  onConfirm: (method: CambodiaPaymentMethod) => void;
  cashAllowed?: boolean;
  onMethodChange?: (method: string) => void;
}) {
  const [selected, setSelected] = useState<CambodiaPaymentMethod>(() => {
    const initial = cashAllowed ? "cash" : "card";
    onMethodChange?.(initial);
    return initial;
  });

  const allMethods = [
    {
      id: "aba" as CambodiaPaymentMethod,
      label: "ABA KHQR",
      desc: "Scan with ABA / Bakong app",
      icon: QrCode,
      iconColor: "text-[#0066b3]",
      bgColor: "bg-[#0066b3]/10",
      badge: "Popular",
    },
    {
      id: "cash" as CambodiaPaymentMethod,
      label: "សាច់ប្រាក់ (Cash)",
      desc: "Pay driver in cash after ride",
      icon: Banknote,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      id: "card" as CambodiaPaymentMethod,
      label: "Card Payment",
      desc: "Visa, Mastercard, UnionPay",
      icon: CreditCard,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  // Filter out cash if not allowed (international customers must pay by card)
  const methods = cashAllowed ? allMethods : allMethods.filter(m => m.id !== "cash");

  const confirmLabels: Record<CambodiaPaymentMethod, string> = {
    aba: `បង់ ABA · ${dualPrice(price, true)}`,
    cash: `បញ្ជាក់ · ${dualPrice(price, true)}`,
    qr: `បង់ QR · ${dualPrice(price, true)}`,
    card: `បង់កាត · ${dualPrice(price, true)}`,
  };

  const footerLabels: Record<CambodiaPaymentMethod, string> = {
    aba: "បើកទៅ ABA Payway សម្រាប់ការទូទាត់ · Redirected to ABA checkout",
    cash: "បង់សាច់ប្រាក់ដល់អ្នកបើកបរ · Pay cash to driver after ride",
    qr: "ស្កែន QR code ពេលអ្នកបើកបរមកដល់ · Scan QR when driver arrives",
    card: "កាតនឹងត្រូវបានគិតប្រាក់បន្ទាប់ពីជិះ · Card charged after ride",
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mb-2">
        វិធីបង់ប្រាក់ / Payment
      </p>

      <div className="space-y-2 flex-1">
        {methods.map((m) => {
          const Icon = m.icon;
          const isSelected = selected === m.id;
          return (
            <button type="button"
              key={m.id}
              onClick={() => { setSelected(m.id); onMethodChange?.(m.id); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/30 hover:border-border/60"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", m.bgColor)}>
                <Icon className={cn("w-5 h-5", m.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{m.label}</p>
                  {"badge" in m && (m as any).badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {(m as any).badge as string}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>
              </div>
              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="-mx-5 px-5 pt-3 pb-2 bg-background sticky bottom-0">
        <Button
          className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/15 gap-2 active:scale-[0.97] transition-all duration-200"
          onClick={() => onConfirm(selected)}
          disabled={isSubmitting}
        >
          <Shield className="w-5 h-5" />
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              កំពុងដំណើរការ...
            </span>
          ) : (
            confirmLabels[selected]
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {footerLabels[selected]}
        </p>
      </div>
    </div>
  );
}

/* ─── Inline Stripe form for adding new card ─── */
function AddCardForm({ onSuccess, onCancel, setupClientSecret }: {
  onSuccess: () => void;
  onCancel: () => void;
  setupClientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Stripe not loaded yet. Please wait a moment.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Please check your card details");
        setProcessing(false);
        return;
      }

      const { error: setupError } = await stripe.confirmSetup({
        elements,
        clientSecret: setupClientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (setupError) {
        console.error("[AddCardForm] Setup error:", setupError);
        setError(setupError.message || "Failed to save card");
        setProcessing(false);
      } else {
        toast.success("Card saved successfully!");
        setProcessing(false);
        onSuccess();
      }
    } catch (err: any) {
      console.error("[AddCardForm] Unexpected error:", err);
      setError(err?.message || "Something went wrong");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-10 rounded-xl text-xs font-bold"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-10 rounded-xl text-xs font-bold bg-foreground text-background"
          disabled={!stripe || processing}
        >
          {processing ? "Saving..." : "Save Card"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Stripe authorize form for new card payment ─── */
function AuthorizeForm({ onSuccess, price, vehicleName, clientSecret, cardOnly = false }: {
  onSuccess: () => void;
  price: number;
  vehicleName: string;
  clientSecret: string;
  cardOnly?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    if (cardOnly) {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Card form failed to load");
        setProcessing(false);
        return;
      }

      const { error: payError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (payError) {
        setError(payError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent && ["requires_capture", "succeeded", "processing"].includes(paymentIntent.status)) {
        setProcessing(false);
        onSuccess();
        return;
      }

      setError("Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    const { error: payError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (payError) {
      setError(payError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    setProcessing(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {cardOnly ? (
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: "16px",
                  color: "#0f172a",
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  "::placeholder": {
                    color: "#64748b",
                  },
                },
                invalid: {
                  color: "#dc2626",
                },
              },
            }}
          />
        </div>
      ) : (
        <PaymentElement
          options={{
            layout: "accordion",
            paymentMethodOrder: ["card", "apple_pay", "google_pay"],
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      )}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <Button
        type="submit"
        className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg gap-2"
        disabled={!stripe || processing}
      >
        <Shield className="w-5 h-5" />
        {processing ? "Authorizing..." : `Authorize $${price.toFixed(2)} · ${vehicleName}`}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Your card will be pre-authorized. Final charge applied after ride completion.
      </p>
    </form>
  );
}

export default function RidePaymentSection({
  price,
  vehicleName,
  isSubmitting,
  onAuthorizeWithSavedCard,
  onAuthorizeWithNewCard,
  clientSecret,
  onPaymentSuccess,
  paymentFailed,
  onClearError,
  isCambodia = false,
  cashAllowed = true,
  onCashConfirm,
  onAbaConfirm,
  onBackToMethods,
  onPaymentMethodChange,
}: RidePaymentSectionProps) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const [abaModalOpen, setAbaModalOpen] = useState(false);

  // Load saved cards
  const loadCards = useCallback(async () => {
    if (!user) { setLoadingCards(false); return; }
    setLoadingCards(true);
    onClearError?.();
    try {
      const resp = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "list" },
      });
      if (import.meta.env.DEV) console.log("[RidePayment] list cards response:", JSON.stringify(resp));
      if (!resp.error && resp.data?.ok) {
        const cards = resp.data.cards || [];
        setSavedCards(cards);
        const defaultCard = cards.find((c: SavedCard) => c.is_default);
        if (defaultCard) {
          setSelectedCardId(defaultCard.id);
        } else if (cards.length > 0) {
          setSelectedCardId(cards[0].id);
        }
      } else {
        console.warn("[RidePayment] Failed to load cards:", resp.error);
      }
    } catch (e) {
      console.error("[RidePayment] Failed to load cards:", e);
    } finally {
      setLoadingCards(false);
    }
  }, [user, onClearError]);

  useEffect(() => {
    // For Cambodia, skip loading Stripe cards unless card method is chosen
    if (!isCambodia) {
      loadCards();
    } else {
      setLoadingCards(false);
    }
  }, [loadCards, isCambodia]);

  // If auth is still loading, show a spinner
  if (authLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading payment…</p>
      </div>
    );
  }

  // If user is not signed in, show sign-in prompt
  if (!user) {
    return (
      <div className="flex flex-col h-full gap-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Payment</p>
        <div className="rounded-xl bg-card border border-border/20 px-4 py-4 text-center flex flex-col items-center justify-center flex-1 gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Sign in to book your ride</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Create a free account or sign in to save cards, track rides, and earn rewards
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-lg font-bold gap-1.5 text-sm"
              onClick={() => navigate(withRedirectParam("/login", window.location.pathname + window.location.search))}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Button>
            <Button
              className="flex-1 h-10 rounded-lg font-bold gap-1.5 text-sm bg-primary text-primary-foreground"
              onClick={() => navigate(withRedirectParam("/login?mode=signup", window.location.pathname + window.location.search))}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up Free
            </Button>
          </div>
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Your payment info is secured by Stripe</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ CAMBODIA PAYMENT ═══════ */
  if (isCambodia) {
    // If Stripe clientSecret is ready, show inline Stripe payment form
    if (clientSecret) {
      return (
        <div className="flex flex-col h-full gap-2">
          <div className="flex items-center gap-2 shrink-0">
            {onBackToMethods && (
              <button
                type="button"
                onClick={onBackToMethods}
                className="text-xs font-semibold text-primary hover:underline shrink-0"
              >
                ← ផ្សេងទៀត / Other
              </button>
            )}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              វិធីបង់ប្រាក់ / Card Payment
            </p>
          </div>
          <div className="rounded-2xl bg-card border border-border/20 p-4 flex-1">
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#16a34a", borderRadius: "12px" },
                },
              }}
            >
              <AuthorizeForm onSuccess={onPaymentSuccess} price={price} vehicleName={vehicleName} clientSecret={clientSecret} cardOnly />
            </Elements>
          </div>
        </div>
      );
    }

    return (
      <>
        <AbaPaymentModal
          open={abaModalOpen}
          onOpenChange={setAbaModalOpen}
          amountUsd={price}
          reference={`ZIVO-${user?.id?.slice(0, 6) ?? "ride"}-${Date.now().toString().slice(-5)}`}
          onConfirmed={() => {
            setAbaModalOpen(false);
            if (onAbaConfirm) {
              onAbaConfirm();
            } else {
              toast.success("Ride confirmed! Payment via ABA KHQR.");
              onPaymentSuccess();
            }
          }}
        />
      <CambodiaPaymentSelector
        price={price}
        vehicleName={vehicleName}
        isSubmitting={isSubmitting}
        cashAllowed={cashAllowed}
        onMethodChange={onPaymentMethodChange}
        onConfirm={async (method) => {
          if (method === "aba") {
            setAbaModalOpen(true);
          } else if (method === "cash") {
            // Use dedicated cash handler that creates ride_request + job without Stripe
            if (onCashConfirm) {
              onCashConfirm();
            } else {
              toast.success("Ride confirmed! Pay cash to your driver.");
              onPaymentSuccess();
            }
          } else if (method === "qr") {
            toast.success("Ride confirmed! QR code will be shown when driver arrives.");
            onPaymentSuccess();
          } else {
            onAuthorizeWithNewCard();
          }
        }}
      />
      </>
    );
  }

  // Start add card flow
  const handleAddCard = async () => {
    setAddingCard(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Session expired. Please sign in again.");
        navigate(withRedirectParam("/login", window.location.pathname + window.location.search));
        return;
      }
      const expiresAt = sessionData.session.expires_at;
      if (expiresAt && expiresAt * 1000 - Date.now() < 60000) {
        await supabase.auth.refreshSession();
      }

      const resp = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "create_setup_intent" },
      });
      if (import.meta.env.DEV) console.log("[RidePayment] create_setup_intent response:", JSON.stringify(resp));
      
      const data = resp.data;
      const error = resp.error;
      
      if (error) {
        let errMsg = "Failed to start card setup";
        if (typeof error === 'object' && error !== null) {
          try {
            const errorBody = typeof error.message === 'string' ? error.message : String(error);
            errMsg = errorBody || errMsg;
          } catch { /* fallback */ }
        }
        console.error("[RidePayment] Edge function error:", errMsg);
        toast.error(errMsg);
        return;
      }
      if (!data?.ok || !data?.client_secret) {
        toast.error(data?.error || "Failed to start card setup");
        return;
      }
      setSetupClientSecret(data.client_secret);
      setShowAddCard(true);
    } catch (e: any) {
      console.error("[RidePayment] handleAddCard error:", e);
      toast.error(e?.message || "Failed to start card setup");
    } finally {
      setAddingCard(false);
    }
  };

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    setDeletingId(cardId);
    try {
      const { error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "delete", payment_method_id: cardId },
      });
      if (!error) {
        setSavedCards(prev => prev.filter(c => c.id !== cardId));
        if (selectedCardId === cardId) {
          setSelectedCardId(savedCards.find(c => c.id !== cardId)?.id || null);
        }
        toast.success("Card removed");
      }
    } catch {
      toast.error("Failed to remove card");
    } finally {
      setDeletingId(null);
    }
  };

  // After saving a new card, reload list
  const handleCardSaved = () => {
    setShowAddCard(false);
    setSetupClientSecret(null);
    onClearError?.();
    loadCards();
  };

  // If we have a clientSecret for payment (new card authorize flow)
  if (clientSecret) {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Payment</p>
        <div className="rounded-2xl bg-card border border-border/20 p-4">
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#16a34a", borderRadius: "12px" },
              },
            }}
          >
            <AuthorizeForm onSuccess={onPaymentSuccess} price={price} vehicleName={vehicleName} clientSecret={clientSecret} />
          </Elements>
        </div>
      </div>
    );
  }

  // Add card form
  if (showAddCard && setupClientSecret) {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add Payment Method</p>
        <div className="rounded-2xl bg-card border border-border/20 p-4">
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret: setupClientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#16a34a", borderRadius: "12px" },
              },
            }}
          >
            <AddCardForm
              onSuccess={handleCardSaved}
              onCancel={() => { setShowAddCard(false); setSetupClientSecret(null); }}
              setupClientSecret={setupClientSecret}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Payment</p>

      {/* Saved cards */}
      {loadingCards ? (
        <div className="rounded-2xl bg-card border border-border/20 p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : savedCards.length > 0 ? (
        <>
          <div className="rounded-2xl bg-card border border-border/20 overflow-hidden">
            {savedCards.map((card) => (
              <button type="button"
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/10 last:border-0 transition-all text-left",
                  selectedCardId === card.id
                    ? "bg-primary/5"
                    : "hover:bg-muted/10"
                )}
              >
                <div className="w-10 h-7 rounded-md bg-muted/30 border border-border/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-foreground uppercase">{card.brand.slice(0, 4)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {BRAND_LABELS[card.brand] || card.brand} ···· {card.last4}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Expires {card.exp_month}/{card.exp_year}
                  </p>
                </div>
                {selectedCardId === card.id ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                  className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0"
                  disabled={deletingId === card.id}
                >
                  {deletingId === card.id ? (
                    <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  )}
                </button>
              </button>
            ))}

            {/* Add another card */}
            <button type="button"
              onClick={handleAddCard}
              disabled={addingCard}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-all text-left disabled:opacity-50"
            >
              <div className="w-10 h-7 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                {addingCard ? (
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-semibold text-foreground flex-1">
                {addingCard ? "Setting up..." : "Add new card"}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Apple Pay / Google Pay note */}
          <div className="rounded-2xl bg-card border border-border/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Apple Pay & Google Pay available at checkout if no saved card selected
              </span>
            </div>
          </div>
        </>
      ) : null}

      {/* Authorize button */}
      <div className="-mx-5 px-5 pt-3 pb-2 bg-background sticky bottom-0">
        {!loadingCards && savedCards.length === 0 && !selectedCardId ? (
          <>
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 mb-3 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-bold text-foreground">Add a card to continue</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A payment method is required to book your ride. Your card will only be pre-authorized — the final charge is applied after your trip.
              </p>
              <Button
                onClick={handleAddCard}
                disabled={addingCard}
                className="w-full h-12 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mt-1"
              >
                {addingCard ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Payment Card
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>256-bit encryption · Secured by Stripe</span>
            </div>
          </>
        ) : (
          <>
            <Button
              className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/15 gap-2 active:scale-[0.97] transition-all duration-200"
              onClick={() => {
                if (selectedCardId) {
                  onAuthorizeWithSavedCard(selectedCardId);
                } else {
                  onAuthorizeWithNewCard();
                }
              }}
              disabled={isSubmitting}
            >
              <Shield className="w-5 h-5" />
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Authorizing...
                </span>
              ) : (
                `Authorize $${price.toFixed(2)} · ${vehicleName}`
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Pre-authorized · Final charge after ride
            </p>
          </>
        )}
      </div>

      {paymentFailed && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-sm text-destructive font-medium">Payment setup failed. Please try again.</p>
        </div>
      )}
    </div>
  );
}
