/**
 * ZIVO Wallet — Premium 2026 redesign
 * Real Supabase/Stripe data throughout
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  ArrowLeft, Wallet, CreditCard, Star, Trash2, Plus, Shield,
  Users, Gift, Trophy,
  Clock, DollarSign, ChevronRight, Eye, EyeOff,
  TrendingUp, Zap, Banknote, Building2, Send, AlertCircle,
  Radio, Coins, CheckCircle, MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import { useStripePaymentMethods, useDeleteStripeCard, useSetDefaultStripeCard } from "@/hooks/useStripePaymentMethods";
import { useWalletTransactions, useWalletCredits, useWalletSummary } from "@/hooks/useZivoWallet";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useLiveEarnings } from "@/hooks/useLiveEarnings";
import AddCardForm from "@/components/wallet/AddCardForm";
import UnifiedPayoutCard from "@/components/wallet/UnifiedPayoutCard";
import WithdrawalReceipt, { type WithdrawalReceiptData } from "@/components/wallet/WithdrawalReceipt";
import { getStripe } from "@/lib/stripe";
import { useStepUpMfa } from "@/hooks/useStepUpMfa";
import SEOHead from "@/components/SEOHead";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

/** Validate a payout-method form and return a map of field → error message. Empty when valid. */
function validatePayoutForm(form: {
  method_type: "bank_transfer" | "aba";
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  aba_account_id: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const holder = form.account_holder_name.trim();
  if (!holder) {
    errors.account_holder_name = "Account holder name is required";
  } else if (holder.length < 3) {
    errors.account_holder_name = "Name must be at least 3 characters";
  } else if (!/^[\p{L}][\p{L}\s.'\-]+$/u.test(holder)) {
    errors.account_holder_name = "Name can only contain letters, spaces, '-', '.' and apostrophes";
  }

  if (form.method_type === "bank_transfer") {
    if (!form.bank_name.trim()) errors.bank_name = "Bank name is required";
    const acct = form.account_number.replace(/[\s-]/g, "");
    if (!acct) {
      errors.account_number = "Account number is required";
    } else if (!/^\d{6,20}$/.test(acct)) {
      errors.account_number = "Enter 6–20 digits, no letters";
    }
  } else {
    const aba = form.aba_account_id.replace(/[\s-]/g, "");
    if (!aba) {
      errors.aba_account_id = "ABA ID or phone number is required";
    } else if (!/^(\+?855)?\d{6,10}$/.test(aba)) {
      errors.aba_account_id = "Enter 6–10 digits (optionally with +855 country code)";
    }
  }

  return errors;
}

function brandIcon(brand: string) {
  const b = brand?.toLowerCase();
  if (b === "visa") return "💳";
  if (b === "mastercard") return "🔶";
  if (b === "amex") return "💎";
  return "💳";
}

function brandLabel(brand: string) {
  const map: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover",
  };
  return map[brand?.toLowerCase()] || brand?.toUpperCase() || "Card";
}

const TAB_ITEMS = [
  { key: "cards", label: "Cards", icon: CreditCard },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "cashout", label: "Cash Out", icon: Banknote },
  { key: "history", label: "History", icon: Clock },
  { key: "credits", label: "Credits", icon: Gift },
] as const;

const CASHOUT_METHODS = [
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, desc: "Transfer to your bank account" },
  { id: "aba", label: "ABA / KHQR", icon: Banknote, desc: "Withdraw via ABA PayWay" },
] as const;

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

function formatTopupAmount(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function WalletTopupPaymentForm({
  amountCents,
  paymentIntentId,
  onBack,
  onPaid,
}: {
  amountCents: number;
  paymentIntentId: string | null;
  onBack: () => void;
  onPaid: (data: any) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentLoadError, setPaymentLoadError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
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
          return_url: `${window.location.origin}/wallet?topup=success`,
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

      if (verifyError) {
        throw new Error(verifyError.message || "Could not credit wallet");
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
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <PaymentElement
            onReady={() => {
              setPaymentReady(true);
              setPaymentLoadError(null);
            }}
            onLoadError={(event) => {
              setPaymentReady(false);
              setPaymentLoadError(event.error.message || "Payment form could not load");
            }}
          />
        </div>
        {!paymentReady && !paymentLoadError && (
          <p className="mt-3 text-[12px] font-medium text-muted-foreground">
            Loading secure payment form...
          </p>
        )}
        {paymentLoadError && (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
            {paymentLoadError}
          </p>
        )}
      </div>
      <div className="shrink-0 border-t border-border/30 bg-background/95 px-5 pb-[max(1rem,var(--zivo-safe-bottom,0px))] pt-3 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={!stripe || !elements || !paymentReady || submitting}>
          {submitting ? "Paying..." : paymentReady ? `Pay ${formatTopupAmount(amountCents)}` : "Loading..."}
        </Button>
      </div>
    </form>
  );
}

export default function WalletPage() {
  const navigate = useNavigate();
  const [showAddCard, setShowAddCard] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<"cards" | "gifts" | "cashout" | "history" | "credits">("cards");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [cashoutMethod, setCashoutMethod] = useState<string>("bank_transfer");
  const [cashoutNote, setCashoutNote] = useState("");
  const [cashoutSubmitting, setCashoutSubmitting] = useState(false);
  const [withdrawalDone, setWithdrawalDone] = useState<{ amount: string; method: string } | null>(null);
  const [receipt, setReceipt] = useState<WithdrawalReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    method_type: "bank_transfer" as "bank_transfer" | "aba",
    label: "",
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    aba_account_id: "",
  });
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [refundTx, setRefundTx] = useState<{ id: string; description: string | null; service_type: string | null; amount: number | string } | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "in" | "out">("all");
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundDone, setRefundDone] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { ensureAal2, dialog: mfaDialog } = useStepUpMfa();
  const { balanceDollars, lifetimeEarnedDollars, isLoading: walletLoading } = useCustomerWallet();
  const { data: stripeCards = [], isLoading: cardsLoading } = useStripePaymentMethods();
  const deleteCard = useDeleteStripeCard();
  const setDefault = useSetDefaultStripeCard();
  const { data: walletTransactions = [], isLoading: txLoading } = useWalletTransactions();
  const { data: walletCredits = [], isLoading: creditsLoading } = useWalletCredits();
  const { data: summary, isLoading: summaryLoading } = useWalletSummary();
  const { points, isLoading: pointsLoading } = useLoyaltyPoints();
  const { totals: liveEarnings, payouts: liveGiftPayouts } = useLiveEarnings();

  // ── Wallet topup (in-ZIVO Stripe Elements) ─────────────────────────────
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("25");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupStep, setTopupStep] = useState<"amount" | "payment">("amount");
  const [topupClientSecret, setTopupClientSecret] = useState<string | null>(null);
  const [topupPaymentIntentId, setTopupPaymentIntentId] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const topupDragControls = useDragControls();
  const TOPUP_QUICK = [10, 25, 50, 100, 250];
  const parsedTopupAmount = Number.parseFloat(topupAmount || "0");
  const topupAmountCents = Number.isFinite(parsedTopupAmount) ? Math.round(parsedTopupAmount * 100) : 0;

  const openTopup = () => {
    setTopupAmount((current) => current || "25");
    setTopupStep("amount");
    setTopupClientSecret(null);
    setTopupPaymentIntentId(null);
    setTopupError(null);
    setTopupOpen(true);
  };

  const closeTopup = () => {
    if (topupBusy) return;
    setTopupOpen(false);
    setTopupStep("amount");
    setTopupClientSecret(null);
    setTopupPaymentIntentId(null);
    setTopupError(null);
  };

  // Run a one-shot verify when Stripe returns from an auth challenge.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get("topup");
    const sid = url.searchParams.get("session_id");
    const paymentIntentId = url.searchParams.get("payment_intent");
    const redirectStatus = url.searchParams.get("redirect_status");
    const shouldVerify = (status === "success" || redirectStatus === "succeeded") && (sid || paymentIntentId);
    if (shouldVerify) {
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verify-user-wallet-topup", {
            body: paymentIntentId ? { payment_intent_id: paymentIntentId } : { session_id: sid },
          });
          if (error) {
            toast.error("Could not verify topup");
          } else if ((data as any)?.credited) {
            toast.success(`Wallet credited · balance $${(((data as any).balance_cents ?? 0) / 100).toFixed(2)}`);
          } else {
            toast.message("Topup already credited");
          }
        } finally {
          // Strip the params so we don't re-run on every reload.
          url.searchParams.delete("topup");
          url.searchParams.delete("session_id");
          url.searchParams.delete("payment_intent");
          url.searchParams.delete("payment_intent_client_secret");
          url.searchParams.delete("redirect_status");
          window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
          queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
        }
      })();
    } else if (status === "cancel") {
      toast.message("Topup cancelled");
      url.searchParams.delete("topup");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTopup = async () => {
    const cents = topupAmountCents;
    if (!Number.isFinite(cents) || cents < 500) {
      toast.error("Minimum topup is $5");
      return;
    }
    setTopupBusy(true);
    setTopupError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-user-wallet-topup", {
        body: {
          amount_cents: cents,
          currency: "USD",
          ui_mode: "embedded",
        },
      });
      if (error) throw error;
      const clientSecret = (data as any)?.client_secret;
      const paymentIntentId = (data as any)?.payment_intent_id || null;
      if (!clientSecret) {
        const message = (data as any)?.url
          ? "Payment backend needs deployment before in-ZIVO top up can start."
          : "No in-app payment form returned.";
        throw new Error(message);
      }

      setTopupClientSecret(clientSecret);
      setTopupPaymentIntentId(paymentIntentId);
      setTopupStep("payment");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start topup";
      setTopupError(message);
      toast.error(message);
    } finally {
      setTopupBusy(false);
    }
  };

  // Payout methods
  const { data: payoutMethods = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ["payout-methods", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("customer_payout_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addPayoutMethod = useMutation({
    mutationFn: async (form: typeof payoutForm) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("customer_payout_methods")
        .insert({
          user_id: user.id,
          method_type: form.method_type,
          label: form.label || (form.method_type === "aba" ? "ABA Account" : "Bank Account"),
          bank_name: form.bank_name || null,
          account_number: form.account_number || null,
          account_holder_name: form.account_holder_name || null,
          aba_account_id: form.aba_account_id || null,
          is_default: payoutMethods.length === 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-methods"] });
      setShowAddPayout(false);
      setPayoutForm({ method_type: "bank_transfer", label: "", bank_name: "", account_number: "", account_holder_name: "", aba_account_id: "" });
      toast.success("Payout method added!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add"),
  });

  const deletePayoutMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("customer_payout_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-methods"] });
      if (selectedPayoutId) setSelectedPayoutId(null);
      toast.success("Payout method removed");
    },
  });

  // Auto-select first payout method or default
  useEffect(() => {
    if (payoutMethods.length > 0 && !selectedPayoutId) {
      const def = payoutMethods.find((p: any) => p.is_default) || payoutMethods[0];
      setSelectedPayoutId(def.id);
      setCashoutMethod(def.method_type);
    }
  }, [payoutMethods, selectedPayoutId]);

  const totalSpent = summary?.totalSpent ?? 0;
  const txCount = summary?.transactionCount ?? 0;

  const earnedCredits = walletCredits
    .filter((c) => !c.expires_at || new Date(c.expires_at) > new Date())
    .reduce((sum, c) => sum + Number(c.amount), 0);


  return (
    <>
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead title="ZIVO Wallet" description="Payments & credits" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center px-5 py-3.5 gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-[17px] leading-tight">Wallet</h1>
          </div>
          <button
            type="button"
            aria-label={balanceHidden ? "Show balance" : "Hide balance"}
            onClick={() => setBalanceHidden(!balanceHidden)}
            className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center"
          >
            {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 pb-4 space-y-5">

        {/* ── BALANCE HERO ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-[22px] overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/8" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5 blur-xl" />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[14px] bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[11px] font-medium tracking-wide uppercase">Available Balance</p>
                </div>
              </div>
              <Badge className="bg-white/15 text-white border-0 text-[9px] font-semibold gap-1 backdrop-blur-sm">
                <Shield className="w-2.5 h-2.5" /> Encrypted
              </Badge>
            </div>

            <div className="mb-6">
              <motion.p
                key={balanceHidden ? "hidden" : "visible"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[42px] font-extrabold text-white leading-none tracking-tight"
              >
                {walletLoading ? "..." : balanceHidden ? "••••••" : `$${balanceDollars.toFixed(2)}`}
              </motion.p>
              <button
                type="button"
                onClick={openTopup}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#0a0a0a] text-[12px] font-bold active:scale-95 transition-transform shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Top up
              </button>
              {lifetimeEarnedDollars > 0 && (
                <p className="text-white/50 text-[11px] mt-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  ${lifetimeEarnedDollars.toFixed(2)} lifetime earned
                </p>
              )}
            </div>

            <div className="flex gap-0 border-t border-white/15 -mx-6 px-6 pt-4">
              <div className="flex-1">
                <p className="text-white/45 text-[10px] font-medium uppercase tracking-wider">Total Spent</p>
                <p className="text-white font-bold text-lg mt-0.5">
                  {summaryLoading ? "..." : balanceHidden ? "••••" : `$${totalSpent.toFixed(0)}`}
                </p>
              </div>
              <div className="w-px bg-white/15 mx-4" />
              <div className="flex-1">
                <p className="text-white/45 text-[10px] font-medium uppercase tracking-wider">Transactions</p>
                <p className="text-white font-bold text-lg mt-0.5">
                  {summaryLoading ? "..." : txCount}
                </p>
              </div>
              <div className="w-px bg-white/15 mx-4" />
              <div className="flex-1">
                <p className="text-white/45 text-[10px] font-medium uppercase tracking-wider">Points</p>
                <p className="text-white font-bold text-lg mt-0.5 flex items-center gap-1">
                  {pointsLoading ? "..." : points.points_balance.toLocaleString()}
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── TABS ── */}
        <div className="flex bg-muted/40 rounded-2xl p-1 gap-0.5">
          {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
            <button type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2.5 rounded-[14px] transition-all duration-200 touch-manipulation ${
                activeTab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          {activeTab === "cards" && (
            <motion.div key="cards" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-[15px]">Payment Methods</h2>
                {!showAddCard && (
                  <Button size="sm" className="rounded-xl font-semibold gap-1.5 h-8 text-xs" onClick={() => setShowAddCard(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Card
                  </Button>
                )}
              </div>

              {showAddCard && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <AddCardForm onClose={() => setShowAddCard(false)} />
                </motion.div>
              )}

              {cardsLoading ? (
                <div className="space-y-2.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[72px] bg-muted/30 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : stripeCards.length === 0 && !showAddCard ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-sm">No payment methods</p>
                  <p className="text-xs text-muted-foreground mt-1">Add a card for fast checkout</p>
                  <Button size="sm" variant="outline" className="mt-4 rounded-xl text-xs font-semibold gap-1.5" onClick={() => setShowAddCard(true)}>
                    <Plus className="w-3 h-3" /> Add Your First Card
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {stripeCards.map((card, i) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl border p-4 flex items-center gap-3.5 transition-all ${
                        card.is_default
                          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                          : "border-border/40 bg-card"
                      }`}
                    >
                      <div className="text-2xl w-10 h-10 flex items-center justify-center">
                        {brandIcon(card.brand)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{brandLabel(card.brand)}</p>
                          <span className="text-muted-foreground text-sm">•••• {card.last4}</span>
                          {card.is_default && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] font-bold px-1.5 py-0">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Expires {card.exp_month}/{card.exp_year}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {!card.is_default && (
                          <button type="button"
                            onClick={() => setDefault.mutate(card.id)}
                            disabled={setDefault.isPending}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-amber-500 transition-colors"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button type="button"
                          onClick={() => { if (confirm("Remove this card?")) deleteCard.mutate(card.id); }}
                          disabled={deleteCard.isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "gifts" && (
            <motion.div key="gifts" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
              {/* Live gift earnings hero */}
              <button type="button"
                onClick={() => navigate("/creator/live-earnings")}
                className="w-full text-left relative rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500" />
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15" />
                <div className="relative z-10 p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Gift className="w-4.5 h-4.5" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                        Live Gift Earnings
                      </p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 text-[9px]">70% share</Badge>
                  </div>
                  <p className="text-3xl font-extrabold leading-none">
                    ${((liveEarnings?.earnings_cents ?? 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-white/75 mt-1.5 flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {(liveEarnings?.total_coins_received ?? 0).toLocaleString()} coins from{" "}
                    {(liveEarnings?.total_gifts_received ?? 0).toLocaleString()} gifts
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold">
                    Open Live Earnings
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-card border border-border/30 p-3 text-center">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-bold text-sm tabular-nums">
                    {(liveEarnings?.unique_gifters ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gifters</p>
                </div>
                <div className="rounded-2xl bg-card border border-border/30 p-3 text-center">
                  <Gift className="w-4 h-4 text-foreground mx-auto mb-1" />
                  <p className="font-bold text-sm tabular-nums">
                    {(liveEarnings?.total_gifts_received ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gifts</p>
                </div>
                <div className="rounded-2xl bg-card border border-border/30 p-3 text-center">
                  <Banknote className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <p className="font-bold text-sm tabular-nums">
                    {liveGiftPayouts.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Payouts</p>
                </div>
              </div>

              {/* Recent live-gift withdrawals */}
              {liveGiftPayouts.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-bold text-[13px] text-muted-foreground">Recent Withdrawals</h3>
                  {liveGiftPayouts.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="rounded-xl bg-card border border-border/30 p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[13px]">${(p.amount_cents / 100).toFixed(2)}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {p.status} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
                  <Radio className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No live earnings yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Go live and let viewers send Z Coin gifts
                  </p>
                  <Button
                    onClick={() => navigate("/go-live")}
                    size="sm"
                    className="rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" /> Go Live Now
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "cashout" && (
            <motion.div key="cashout" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
              {/* Withdrawal success card */}
              {withdrawalDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 flex flex-col items-center gap-3 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-foreground">${withdrawalDone.amount} Submitted</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">via {withdrawalDone.method}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Processing 1–3 business days</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-2xl h-9 px-5 text-[12px]" onClick={() => setWithdrawalDone(null)}>
                    New Withdrawal
                  </Button>
                </motion.div>
              )}
              {/* Available to withdraw */}
              <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Available to Withdraw</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {walletLoading ? "..." : `$${balanceDollars.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Unified payout — Stripe (instant card) + PayPal (global) */}
              <UnifiedPayoutCard balanceDollars={balanceDollars} />

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Or use bank / ABA</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Saved Payout Methods */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-bold text-[13px]">Payout Account</h3>
                  {!showAddPayout && (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1 h-7" onClick={() => setShowAddPayout(true)}>
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  )}
                </div>

                {/* Add Payout Method Form */}
                {showAddPayout && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-3">
                    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                      <h4 className="font-semibold text-[13px]">Add Payout Method</h4>
                      
                      {/* Type toggle */}
                      <div className="flex gap-2">
                        {CASHOUT_METHODS.map(({ id, label, icon: Icon }) => (
                          <button type="button"
                            key={id}
                            onClick={() => setPayoutForm(f => ({ ...f, method_type: id as any }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                              payoutForm.method_type === id
                                ? "bg-emerald-500 text-white"
                                : "bg-muted/50 text-foreground border border-border/40"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const errs = validatePayoutForm(payoutForm);
                        const showErr = (field: string) =>
                          errs[field] && payoutForm[field as keyof typeof payoutForm] ? errs[field] : null;
                        return (
                          <>
                            <div>
                              <Input
                                placeholder="Account holder name"
                                value={payoutForm.account_holder_name}
                                onChange={(e) => setPayoutForm(f => ({ ...f, account_holder_name: e.target.value }))}
                                className="rounded-xl h-10 text-sm"
                              />
                              {showErr("account_holder_name") && (
                                <p className="text-[11px] text-destructive mt-1 ml-1">{showErr("account_holder_name")}</p>
                              )}
                            </div>

                            {payoutForm.method_type === "bank_transfer" ? (
                              <>
                                <div>
                                  <Input
                                    placeholder="Bank name (e.g. Chase, ABA)"
                                    value={payoutForm.bank_name}
                                    onChange={(e) => setPayoutForm(f => ({ ...f, bank_name: e.target.value }))}
                                    className="rounded-xl h-10 text-sm"
                                  />
                                  {showErr("bank_name") && (
                                    <p className="text-[11px] text-destructive mt-1 ml-1">{showErr("bank_name")}</p>
                                  )}
                                </div>
                                <div>
                                  <Input
                                    placeholder="Account number"
                                    inputMode="numeric"
                                    value={payoutForm.account_number}
                                    onChange={(e) => setPayoutForm(f => ({ ...f, account_number: e.target.value }))}
                                    className="rounded-xl h-10 text-sm"
                                  />
                                  {showErr("account_number") && (
                                    <p className="text-[11px] text-destructive mt-1 ml-1">{showErr("account_number")}</p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div>
                                <Input
                                  placeholder="ABA Account ID / Phone number"
                                  inputMode="numeric"
                                  value={payoutForm.aba_account_id}
                                  onChange={(e) => setPayoutForm(f => ({ ...f, aba_account_id: e.target.value }))}
                                  className="rounded-xl h-10 text-sm"
                                />
                                {showErr("aba_account_id") && (
                                  <p className="text-[11px] text-destructive mt-1 ml-1">{showErr("aba_account_id")}</p>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <Input
                        placeholder="Nickname (optional, e.g. 'My ABA')"
                        value={payoutForm.label}
                        onChange={(e) => setPayoutForm(f => ({ ...f, label: e.target.value }))}
                        className="rounded-xl h-10 text-sm"
                      />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl"
                          onClick={() => setShowAddPayout(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                          disabled={
                            addPayoutMethod.isPending ||
                            Object.keys(validatePayoutForm(payoutForm)).length > 0
                          }
                          onClick={() => {
                            const errs = validatePayoutForm(payoutForm);
                            if (Object.keys(errs).length > 0) {
                              toast.error(Object.values(errs)[0]);
                              return;
                            }
                            addPayoutMethod.mutate(payoutForm);
                          }}
                        >
                          {addPayoutMethod.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Saved payout methods list */}
                {payoutsLoading ? (
                  <div className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
                ) : payoutMethods.length === 0 && !showAddPayout ? (
                  <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-2">
                      <Building2 className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <p className="font-semibold text-sm">No payout account</p>
                    <p className="text-xs text-muted-foreground mt-1">Add your bank or ABA account to withdraw</p>
                    <Button size="sm" variant="outline" className="mt-3 rounded-xl text-xs font-semibold gap-1" onClick={() => setShowAddPayout(true)}>
                      <Plus className="w-3 h-3" /> Add Payout Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payoutMethods.map((pm: any) => (
                      <button type="button"
                        key={pm.id}
                        onClick={() => {
                          setSelectedPayoutId(pm.id);
                          setCashoutMethod(pm.method_type);
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left active:scale-[0.98] ${
                          selectedPayoutId === pm.id
                            ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                            : "border-border/40 bg-card"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedPayoutId === pm.id ? "bg-emerald-500/15" : "bg-muted/60"
                        }`}>
                          {pm.method_type === "aba"
                            ? <Banknote className={`w-5 h-5 ${selectedPayoutId === pm.id ? "text-emerald-500" : "text-muted-foreground"}`} />
                            : <Building2 className={`w-5 h-5 ${selectedPayoutId === pm.id ? "text-emerald-500" : "text-muted-foreground"}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[13px]">{pm.label || (pm.method_type === "aba" ? "ABA Account" : "Bank Account")}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {pm.method_type === "aba"
                              ? pm.aba_account_id
                              : `${pm.bank_name || ""} •••• ${pm.account_number?.slice(-4) || ""}`
                            }
                            {pm.account_holder_name ? ` · ${pm.account_holder_name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Remove this payout method?")) deletePayoutMethod.mutate(pm.id);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPayoutId === pm.id ? "border-emerald-500" : "border-muted-foreground/30"
                          }`}>
                            {selectedPayoutId === pm.id && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount — only show if they have a payout method */}
              {payoutMethods.length > 0 && (
                <>
                  <div>
                    <h3 className="font-bold text-[13px] mb-2.5">Amount</h3>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {QUICK_AMOUNTS.filter(a => a <= balanceDollars).map((amt) => (
                        <button type="button"
                          key={amt}
                          onClick={() => setCashoutAmount(String(amt))}
                          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
                            cashoutAmount === String(amt)
                              ? "bg-emerald-500 text-white"
                              : "bg-muted/50 text-foreground border border-border/40"
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                      {balanceDollars >= 5 && (
                        <button type="button"
                          onClick={() => setCashoutAmount(balanceDollars.toFixed(2))}
                          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
                            cashoutAmount === balanceDollars.toFixed(2)
                              ? "bg-emerald-500 text-white"
                              : "bg-muted/50 text-foreground border border-border/40"
                          }`}
                        >
                          All (${balanceDollars.toFixed(2)})
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      placeholder="Enter custom amount"
                      value={cashoutAmount}
                      onChange={(e) => setCashoutAmount(e.target.value)}
                      className="rounded-xl h-11"
                      min="5"
                      max={balanceDollars}
                    />
                    {Number(cashoutAmount) > 0 && Number(cashoutAmount) < 5 && (
                      <p className="text-[11px] text-destructive mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Minimum withdrawal is $5.00
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <h3 className="font-bold text-[13px] mb-2.5">Note (optional)</h3>
                    <Input
                      placeholder="Reference or message"
                      value={cashoutNote}
                      onChange={(e) => setCashoutNote(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full h-12 rounded-2xl font-bold text-[15px] gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={
                      cashoutSubmitting ||
                      !cashoutAmount ||
                      Number(cashoutAmount) < 5 ||
                      Number(cashoutAmount) > balanceDollars ||
                      !selectedPayoutId
                    }
                    onClick={async () => {
                      if (!user) { toast.error("Please sign in"); return; }
                      const ok = await ensureAal2("Authorize withdrawal");
                      if (!ok) return;
                      setCashoutSubmitting(true);
                      try {
                        const amountCents = Math.round(Number(cashoutAmount) * 100);
                        const selectedPayout = payoutMethods.find((p: any) => p.id === selectedPayoutId);
                        const { data, error } = await supabase.functions.invoke("process-withdrawal", {
                          body: {
                            amount_cents: amountCents,
                            method: selectedPayout?.method_type || cashoutMethod,
                            note: cashoutNote || undefined,
                            payout_method_id: selectedPayoutId,
                          },
                        });
                        if (error) throw new Error(error.message || "Withdrawal failed");
                        if (data?.error) throw new Error(data.error);

                        const selectedPayout2 = payoutMethods.find((p: any) => p.id === selectedPayoutId);
                        const payoutLabel = selectedPayout2?.label || selectedPayout2?.method_type || cashoutMethod;
                        setWithdrawalDone({
                          amount: Number(cashoutAmount).toFixed(2),
                          method: payoutLabel,
                        });
                        if (data?.transaction_id) {
                          setReceipt({
                            transaction_id: data.transaction_id,
                            amount_cents: data.amount_cents ?? amountCents,
                            method: data.method ?? payoutLabel,
                            method_type: data.method_type ?? selectedPayout2?.method_type ?? cashoutMethod,
                            estimated_arrival: data.estimated_arrival ?? new Date(Date.now() + 3 * 86400000).toISOString(),
                            estimated_business_days: data.estimated_business_days ?? 3,
                            payout_label: payoutLabel,
                          });
                          setReceiptOpen(true);
                        }
                        setCashoutAmount("");
                        setCashoutNote("");
                        queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
                        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
                        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
                      } catch (err: any) {
                        toast.error(err?.message || "Withdrawal failed");
                      } finally {
                        setCashoutSubmitting(false);
                      }
                    }}
                  >
                    <Send className="w-4.5 h-4.5" />
                    {cashoutSubmitting ? "Processing..." : `Withdraw $${Number(cashoutAmount || 0).toFixed(2)}`}
                  </Button>
                </>
              )}

              {/* Info */}
              <div className="text-[11px] text-muted-foreground/60 space-y-0.5">
                <p>• Minimum withdrawal: $5.00</p>
                <p>• Processing time: 1-3 business days</p>
                <p>• Bank Transfer available worldwide</p>
                <p>• ABA / KHQR for Cambodia accounts</p>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-[15px]">Recent Transactions</h2>
                <button type="button"
                  onClick={() => {
                    const rows = walletTransactions
                      .filter(tx => {
                        const isIn = tx.transaction_type !== "payment";
                        if (txFilter === "in") return isIn;
                        if (txFilter === "out") return !isIn;
                        return true;
                      })
                      .map(tx => [
                        tx.created_at ? format(new Date(tx.created_at), "yyyy-MM-dd HH:mm") : "",
                        tx.description || tx.service_type || "",
                        tx.transaction_type !== "payment" ? "In" : "Out",
                        Math.abs(Number(tx.amount)).toFixed(2),
                      ]);
                    const csv = ["Date,Description,Type,Amount", ...rows.map(r => r.join(","))].join("\n");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                    a.download = "transactions.csv";
                    a.click();
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 transition-opacity">
                  <TrendingUp className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              <div className="flex gap-1.5">
                {(["all", "in", "out"] as const).map(f => (
                  <button type="button" key={f} onClick={() => setTxFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                      txFilter === f ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground border border-border/40"
                    }`}>
                    {f === "all" ? "All" : f === "in" ? "↓ Money In" : "↑ Money Out"}
                  </button>
                ))}
              </div>
              {txLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : walletTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-sm">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your payment history appears here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {walletTransactions.filter(tx => {
                    const isIn = tx.transaction_type !== "payment";
                    if (txFilter === "in") return isIn;
                    if (txFilter === "out") return !isIn;
                    return true;
                  }).map((tx, i) => {
                    const isCredit = tx.transaction_type !== "payment";
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-xl bg-card border border-border/30 p-3.5 flex items-center gap-3"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit ? "bg-emerald-500/10" : "bg-muted/60"
                        }`}>
                          {isCredit
                            ? <DollarSign className="w-4.5 h-4.5 text-emerald-500" />
                            : <Wallet className="w-4.5 h-4.5 text-muted-foreground" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[13px] truncate">
                            {tx.description || tx.service_type}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className={`font-bold text-sm tabular-nums ${isCredit ? "text-emerald-500" : "text-foreground"}`}>
                            {isCredit ? "+" : "−"}${Math.abs(Number(tx.amount)).toFixed(2)}
                          </p>
                          {!isCredit && (
                            <button type="button" aria-label="Request refund"
                              onClick={() => { setRefundTx(tx); setRefundReason(""); setRefundNote(""); setRefundDone(false); }}
                              className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {/* Refund request sheet */}
              <Sheet open={!!refundTx} onOpenChange={open => !open && setRefundTx(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-10">
                  {refundDone ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <p className="font-bold text-lg">Request submitted</p>
                      <p className="text-sm text-muted-foreground mt-1">We'll review and respond within 2–3 business days.</p>
                      <button type="button" onClick={() => setRefundTx(null)}
                        className="mt-5 w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm">
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <SheetHeader className="mb-4">
                        <SheetTitle className="text-left">Request Refund</SheetTitle>
                        {refundTx && (
                          <p className="text-sm text-muted-foreground">
                            {refundTx.description || refundTx.service_type} · ${Math.abs(Number(refundTx.amount)).toFixed(2)}
                          </p>
                        )}
                      </SheetHeader>
                      <div className="space-y-3">
                        <select aria-label="Refund reason" value={refundReason} onChange={e => setRefundReason(e.target.value)}
                          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                          <option value="">Select reason…</option>
                          <option value="wrong_charge">Wrong amount charged</option>
                          <option value="duplicate">Duplicate payment</option>
                          <option value="service_not_received">Service not received</option>
                          <option value="unauthorized">Unauthorized charge</option>
                          <option value="other">Other</option>
                        </select>
                        <textarea value={refundNote} onChange={e => setRefundNote(e.target.value)}
                          placeholder="Additional details (optional)" rows={3}
                          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm resize-none outline-none focus:ring-1 focus:ring-foreground/20" />
                        <button type="button" disabled={!refundReason || refundSubmitting}
                          onClick={async () => {
                            if (!refundTx) return;
                            setRefundSubmitting(true);
                            const refundDetails = [
                              refundReason,
                              refundNote,
                              `TX: ${refundTx.id}`,
                              `Amount: $${Math.abs(Number(refundTx.amount)).toFixed(2)}`,
                              refundTx.description ? `Service: ${refundTx.description}` : null,
                            ].filter(Boolean).join(" | ");
                            const { error } = await (supabase as any).from("feedback_submissions").insert({
                              user_id: user?.id ?? null,
                              category: "refund_request",
                              message: refundDetails,
                            });
                            setRefundSubmitting(false);
                            if (error) { toast.error("Failed to submit"); return; }
                            setRefundDone(true);
                          }}
                          className="w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
                          {refundSubmitting ? "Submitting…" : "Submit Request"}
                        </button>
                      </div>
                    </>
                  )}
                </SheetContent>
              </Sheet>
            </motion.div>
          )}

          {activeTab === "credits" && (
            <motion.div key="credits" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
              {/* Credits summary */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">${earnedCredits.toFixed(0)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Available</p>
                </div>
                <div className="flex-1 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{points.points_balance.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Points</p>
                </div>
              </div>

              <h2 className="font-bold text-[15px]">Credit History</h2>
              {creditsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 bg-muted/30 rounded-2xl animate-pulse" />)}
                </div>
              ) : walletCredits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-sm">No credits yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Earn credits from referrals & promos</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {walletCredits.map((credit) => (
                    <div key={credit.id} className="rounded-xl bg-card border border-border/30 p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Gift className="w-4.5 h-4.5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px]">{credit.source_description || credit.credit_type}</p>
                        {credit.expires_at && (
                          <p className="text-[11px] text-amber-600 mt-0.5">
                            Expires {format(new Date(credit.expires_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-sm text-emerald-500">+${Number(credit.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Earn more */}
              <div className="space-y-2">
                <h3 className="font-bold text-[13px] text-muted-foreground">Earn More</h3>
                {[
                  { label: "Refer Friends", desc: "Earn when they book", icon: Users, path: "/account/referrals" },
                  { label: "Achievements", desc: "Milestones & rewards", icon: Trophy, path: "/account/rewards" },
                  { label: "Gift Cards", desc: "Buy, send, or redeem", icon: Gift, path: "/account/gift-cards" },
                ].map(({ label, desc, icon: Icon, path }) => (
                  <button type="button"
                    key={path}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/30 hover:border-primary/20 transition-colors text-left active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[13px]">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Footer */}
        <div className="text-[11px] text-muted-foreground/50 space-y-0.5 pt-2">
          <p>• Credits auto-applied at checkout</p>
          <p>• Cards secured by Stripe</p>
        </div>
      </div>
    </div>
    {mfaDialog}

    <WithdrawalReceipt
      open={receiptOpen}
      onOpenChange={setReceiptOpen}
      data={receipt}
      onViewHistory={() => setActiveTab("history")}
    />

    {/* Wallet topup modal */}
    <AnimatePresence>
      {topupOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          onClick={closeTopup}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            drag="y"
            dragControls={topupDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 650) {
                closeTopup();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[calc(100dvh-var(--zivo-safe-top,0px)-0.75rem)] bg-background rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
          >
            <button
              type="button"
              aria-label="Swipe down to close"
              onPointerDown={(event) => topupDragControls.start(event)}
              className="shrink-0 cursor-grab touch-none px-5 pt-3 pb-1 active:cursor-grabbing"
            >
              <span className="mx-auto block h-1 w-11 rounded-full bg-muted-foreground/20" />
            </button>

            <div className="shrink-0 px-5 pt-2 pb-3 border-b border-border/30">
              <h3 className="text-lg font-bold">Top up wallet</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Pay securely inside ZIVO. Your balance updates after payment.
              </p>
            </div>

            {topupStep === "amount" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3 [-webkit-overflow-scrolling:touch]">
                  <div className="grid grid-cols-5 gap-2">
                    {TOPUP_QUICK.map((amt) => (
                      <button type="button"
                        key={amt}
                        onClick={() => setTopupAmount(String(amt))}
                        className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                          topupAmount === String(amt)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:bg-muted"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Or enter amount
                    </label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={5}
                        step={1}
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="pl-7 text-base font-semibold"
                      />
                    </div>
                    {topupAmount && topupAmountCents > 0 && topupAmountCents < 500 && (
                      <p className="text-[11px] text-foreground dark:text-foreground mt-1">Minimum is $5</p>
                    )}
                    {topupError && (
                      <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
                        {topupError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/30 bg-background/95 px-5 pb-[max(1rem,var(--zivo-safe-bottom,0px))] pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={topupBusy}
                    onClick={closeTopup}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={topupBusy || topupAmountCents < 500}
                    onClick={handleTopup}
                  >
                    {topupBusy ? "Preparing..." : `Continue ${formatTopupAmount(topupAmountCents)}`}
                  </Button>
                </div>
              </div>
            )}

            {topupStep === "payment" && topupClientSecret && (
              <Elements
                stripe={getStripe()}
                options={{
                  clientSecret: topupClientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      borderRadius: "12px",
                    },
                  },
                }}
              >
                <WalletTopupPaymentForm
                  amountCents={topupAmountCents}
                  paymentIntentId={topupPaymentIntentId}
                  onBack={() => {
                    setTopupStep("amount");
                    setTopupClientSecret(null);
                    setTopupPaymentIntentId(null);
                  }}
                  onPaid={(data) => {
                    if (data?.credited) {
                      toast.success(`Wallet credited · balance $${(((data as any).balance_cents ?? 0) / 100).toFixed(2)}`);
                    } else {
                      toast.success("Payment received");
                    }
                    queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
                    queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
                    queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
                    closeTopup();
                  }}
                />
              </Elements>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
