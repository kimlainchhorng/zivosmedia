import { motion } from "framer-motion";
import { Coins, ChevronRight, Plus, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCompact = (n: number): string => {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const formatCurrency = (n: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

type Props = {
  balance: number;
  credits?: number;
  transactionCount?: number;
  loading?: boolean;
  currency?: string;
  onOpenWallet: () => void;
  onBuyCoins?: () => void;
  className?: string;
};

const Skeleton = ({ className }: { className?: string }) => (
  <span className={cn("inline-block animate-pulse rounded-md bg-muted/70", className)} aria-hidden />
);

const ProfileWalletCard = ({
  balance,
  credits = 0,
  transactionCount,
  loading = false,
  currency = "USD",
  onOpenWallet,
  onBuyCoins,
  className,
}: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "mx-3 lg:mx-0 overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.10] via-background to-orange-500/[0.06] p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Your wallet</p>
            <p className="text-[11px] text-muted-foreground">Coins, credits & spend</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWallet}
          aria-label="Open wallet"
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/40 active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Open <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenWallet}
          className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Coins className="h-3 w-3" /> Coins
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {loading ? <Skeleton className="h-5 w-12" /> : formatCompact(balance)}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenWallet}
          className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Credits
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {loading ? <Skeleton className="h-5 w-14" /> : formatCurrency(credits, currency)}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenWallet}
          className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3 w-3" /> Activity
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {loading ? <Skeleton className="h-5 w-10" /> : formatCompact(transactionCount ?? 0)}
          </div>
        </button>
      </div>

      {onBuyCoins && (
        <button
          type="button"
          onClick={onBuyCoins}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-[12px] font-bold text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-500/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
        >
          <Plus className="h-3.5 w-3.5" /> Buy ZIVO Coins
        </button>
      )}
    </motion.div>
  );
};

export default ProfileWalletCard;
