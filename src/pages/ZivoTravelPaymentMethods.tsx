import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CreditCard, Loader2, Lock, LogIn, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteStripeCard,
  useSetDefaultStripeCard,
  useStripePaymentMethods,
  type StripeCard,
} from "@/hooks/useStripePaymentMethods";
import { TravelUtilityShell } from "@/components/zivo-travel/TravelUtilityShell";
import AddCardForm from "@/components/wallet/AddCardForm";

function brandLabel(brand: string) {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[brand?.toLowerCase()] || brand || "Card";
}

function CardRow({
  card,
  displayDefault,
  onSetDefault,
  onDelete,
  busy,
}: {
  card: StripeCard;
  displayDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div className="zt-glass flex min-w-0 items-center gap-3 rounded-2xl p-4">
      <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-slate-900/[0.05] text-[10px] font-black uppercase tracking-wide text-slate-700">
        {brandLabel(card.brand).slice(0, 6)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-bold text-slate-900">{brandLabel(card.brand)} **** {card.last4}</p>
          {displayDefault && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">Default</span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Expires {String(card.exp_month).padStart(2, "0")}/{String(card.exp_year).slice(-2)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!card.is_default && (
          <button
            type="button"
            aria-label="Set as default"
            disabled={busy}
            onClick={onSetDefault}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-amber-500/10 hover:text-amber-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          aria-label="Remove card"
          disabled={busy}
          onClick={onDelete}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ZivoTravelPaymentMethods() {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: cards = [], isLoading, isError } = useStripePaymentMethods();
  const setDefault = useSetDefaultStripeCard();
  const deleteCard = useDeleteStripeCard();
  const hasDefault = cards.some((card) => card.is_default);

  return (
    <TravelUtilityShell
      eyebrow="Your travel"
      title="Payment Methods"
      icon={CreditCard}
      subtitle="Save a card for faster, secure checkout across flights, hotels, and cars."
    >
      {!user ? (
        <EmptyCard icon={LogIn} title="Sign in to manage cards" subtitle="Log in to add and manage your saved payment methods.">
          <Link
            to="/login?redirect=/payment-methods"
            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <LogIn className="h-4 w-4" /> Log in
          </Link>
        </EmptyCard>
      ) : isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="zt-glass flex items-center gap-3 rounded-2xl p-4">
              <span className="h-11 w-14 shrink-0 animate-pulse rounded-lg bg-slate-900/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-900/5" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-900/5" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyCard icon={AlertCircle} title="Could not load your cards" subtitle="Please try again in a moment." />
      ) : (
        <div className="space-y-3">
          {showAddForm && (
            <div className="zt-glass rounded-3xl p-3 sm:p-4">
              <AddCardForm makeDefault={cards.length === 0} onClose={() => setShowAddForm(false)} />
            </div>
          )}

          {cards.length === 0 && !showAddForm ? (
            <EmptyCard
              icon={CreditCard}
              title="No payment methods saved"
              subtitle="Add a card once and check out in a tap. Your details are encrypted and never stored on Zivo Travel servers."
            >
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <Plus className="h-4 w-4" /> Add payment method
              </button>
            </EmptyCard>
          ) : (
            <>
              {cards.map((card, index) => (
                <CardRow
                  key={card.id}
                  card={card}
                  displayDefault={card.is_default || (!hasDefault && index === 0)}
                  busy={setDefault.isPending || deleteCard.isPending}
                  onSetDefault={() => setDefault.mutate(card.id)}
                  onDelete={() => {
                    if (window.confirm("Remove this card?")) {
                      deleteCard.mutate(card.id);
                    }
                  }}
                />
              ))}
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="zt-glass flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                >
                  <Plus className="h-4 w-4 text-sky-600" /> Add another card
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="zt-glass mt-4 flex items-start gap-3 rounded-2xl px-5 py-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-bold text-slate-900">Bank-grade security</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Payments are processed by our PCI-compliant partners. Zivo Travel never sees your full card number.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Accepted:
        </span>
        {["Visa", "Mastercard", "Amex", "KHQR"].map((brand) => (
          <span key={brand} className="zt-glass rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700">
            {brand}
          </span>
        ))}
      </div>
    </TravelUtilityShell>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="zt-glass zt-depth relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-14 text-center">
      <div className="zt-aurora" aria-hidden />
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20">
        <Icon className="h-8 w-8 text-sky-600" />
      </span>
      <h2 className="relative mt-5 text-xl font-black text-slate-900">{title}</h2>
      {subtitle && <p className="relative mt-2 max-w-md text-sm text-slate-600">{subtitle}</p>}
      {children}
    </div>
  );
}
