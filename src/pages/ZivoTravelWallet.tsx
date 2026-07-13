import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, ArrowUpRight, Gift, Hash, Loader2, LogIn, Plus, Receipt, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import { useWalletSummary, useWalletTransactions, type WalletTransaction as ZivoWalletTransaction } from "@/hooks/useZivoWallet";
import { TravelUtilityShell } from "@/components/zivo-travel/TravelUtilityShell";
import { TravelWalletTopupDialog } from "@/components/zivo-travel/TravelWalletTopupDialog";

function formatPrice(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

type ActivityRow = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  credit: boolean;
  created_at: string;
};

function TransactionRow({ tx }: { tx: ActivityRow }) {
  return (
    <div className="zt-glass flex items-center gap-3 rounded-2xl p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900/[0.04]">
        <ArrowUpRight className={tx.credit ? "h-5 w-5 rotate-180 text-emerald-600" : "h-5 w-5 text-sky-600"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900">{tx.title}</p>
        <p className="text-xs text-slate-500">{tx.subtitle}</p>
      </div>
      <p className={tx.credit ? "shrink-0 font-black text-emerald-600" : "shrink-0 font-black text-slate-900"}>
        {tx.credit ? "+" : "-"}{formatPrice(Math.abs(tx.amount), tx.currency)}
      </p>
    </div>
  );
}

export default function ZivoTravelWallet() {
  const { user } = useAuth();
  const [topupOpen, setTopupOpen] = useState(false);
  const {
    balanceDollars,
    transactions: customerTransactions,
    isLoading: customerWalletLoading,
    error: customerWalletError,
  } = useCustomerWallet();
  const { data: summary, isLoading: summaryLoading } = useWalletSummary();
  const { data: transactions = [], isLoading: txLoading, isError: txError } = useWalletTransactions();

  const activityRows = useMemo<ActivityRow[]>(() => {
    const customerRows = customerTransactions.map((tx) => ({
      id: `customer-${tx.id}`,
      title: tx.description || (tx.amount_cents >= 0 ? "Wallet top-up" : "Wallet payment"),
      subtitle: `Wallet - ${format(new Date(tx.created_at), "MMM d, yyyy")}`,
      amount: tx.amount,
      currency: "USD",
      credit: tx.amount_cents >= 0,
      created_at: tx.created_at,
    }));

    const travelRows = (transactions as ZivoWalletTransaction[]).map((tx) => ({
      id: `travel-${tx.id}`,
      title: tx.description || tx.transaction_type,
      subtitle: `${tx.service_type} - ${format(new Date(tx.created_at), "MMM d, yyyy")}`,
      amount: Number(tx.amount),
      currency: tx.currency,
      credit: tx.transaction_type !== "payment",
      created_at: tx.created_at,
    }));

    return [...customerRows, ...travelRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [customerTransactions, transactions]);

  const balance = user ? balanceDollars : 0;

  return (
    <TravelUtilityShell
      eyebrow="Your travel"
      title="Wallet"
      icon={Wallet}
      subtitle="Your Zivo Travel balance and rewards - use them toward flights, hotels, and cars at checkout."
    >
      <div className="zt-glass zt-depth relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="zt-aurora" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Available balance</p>
            {user && (summaryLoading || customerWalletLoading) ? (
              <div className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-slate-900/5 sm:h-12" />
            ) : (
              <p className="mt-2 text-4xl font-black sm:text-5xl">
                <span className="zt-gradient-text">{formatPrice(balance)}</span>
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
              <Gift className="h-4 w-4 text-violet-500" />{" "}
              {user ? (balance > 0 ? "Balance ready at checkout" : "0 ZIVO Miles") : "Sign in to see your balance"}
            </p>
          </div>
          <div className="flex gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => setTopupOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <Plus className="h-4 w-4" /> Add funds
              </button>
            ) : (
              <Link
                to="/login?redirect=/wallet"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <LogIn className="h-4 w-4" /> Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="zt-glass flex min-w-0 items-center gap-3 rounded-2xl px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/15">
            <ArrowUpRight className="h-5 w-5 text-sky-600" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Spent</p>
            <p className="truncate text-lg font-black text-slate-900">{formatPrice(user ? summary?.totalSpent ?? 0 : 0)}</p>
          </div>
        </div>
        <div className="zt-glass flex min-w-0 items-center gap-3 rounded-2xl px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15">
            <Hash className="h-5 w-5 text-violet-600" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Transactions</p>
            <p className="truncate text-lg font-black text-slate-900">{user ? activityRows.length : 0}</p>
          </div>
        </div>
      </div>

      <h3 className="mb-3 mt-10 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Recent activity</h3>
      {!user ? (
        <EmptyActivity icon={LogIn} title="Sign in to see your activity" />
      ) : txLoading || customerWalletLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="zt-glass flex items-center gap-3 rounded-2xl p-4">
              <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-900/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-900/5" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-900/5" />
              </div>
            </div>
          ))}
        </div>
      ) : txError || customerWalletError ? (
        <EmptyActivity icon={AlertCircle} title="Could not load activity" subtitle="Please try again in a moment." />
      ) : activityRows.length === 0 ? (
        <EmptyActivity icon={Receipt} title="No transactions yet" subtitle="Top-ups, rewards, and the credit you use at checkout will show up here." />
      ) : (
        <div className="space-y-3">
          {activityRows.slice(0, 15).map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      <TravelWalletTopupDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </TravelUtilityShell>
  );
}

function EmptyActivity({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Receipt;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="zt-glass flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20">
        <Icon className="h-7 w-7 text-sky-600" />
      </span>
      <h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2>
      {subtitle && <p className="mt-2 max-w-md text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}
