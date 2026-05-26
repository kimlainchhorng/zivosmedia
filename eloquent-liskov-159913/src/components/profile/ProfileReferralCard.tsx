import { motion } from "framer-motion";
import { Gift, Copy, Share2, Users, DollarSign } from "lucide-react";
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
  code?: string | null;
  totalReferrals?: number | null;
  totalEarnings?: number | null;
  loading?: boolean;
  currency?: string;
  onCopy: () => void;
  onShare: () => void;
  className?: string;
};

const Skeleton = ({ className }: { className?: string }) => (
  <span className={cn("inline-block animate-pulse rounded-md bg-muted/70", className)} aria-hidden />
);

const ProfileReferralCard = ({
  code,
  totalReferrals = 0,
  totalEarnings = 0,
  loading = false,
  currency = "USD",
  onCopy,
  onShare,
  className,
}: Props) => {
  const display = (code ?? "").trim() || (loading ? "" : "GET CODE");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "mx-3 lg:mx-0 overflow-hidden rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-fuchsia-500/[0.10] via-background to-pink-500/[0.06] p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
          <Gift className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Invite friends, earn credits</p>
          <p className="text-[11px] text-muted-foreground">Share your referral code with friends</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3 w-3" /> Referrals
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {loading ? <Skeleton className="h-5 w-10" /> : formatCompact(totalReferrals ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <DollarSign className="h-3 w-3" /> Earned
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {loading ? <Skeleton className="h-5 w-14" /> : formatCurrency(totalEarnings ?? 0, currency)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div
          aria-label="Your referral code"
          className="flex-1 rounded-xl border border-dashed border-border bg-background/70 px-3 py-2.5 text-center font-mono text-sm font-bold tracking-[0.2em] text-foreground"
        >
          {loading ? <Skeleton className="h-5 w-24 align-middle" /> : display}
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={!code || loading}
          aria-label="Copy referral link"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background/70 text-foreground transition-colors hover:bg-muted/40 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={!code || loading}
          aria-label="Share referral link"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-foreground active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/60"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
    </motion.div>
  );
};

export default ProfileReferralCard;
