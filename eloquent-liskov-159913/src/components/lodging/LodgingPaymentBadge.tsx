/**
 * LodgingPaymentBadge — Stripe payment_status chip for lodging reservations.
 * Surfaces refund + retry states; renders a "processing" spinner while a Stripe
 * webhook is in flight, plus a micro-caption with the last received event time.
 *
 * Retry hardening: when the deposit retry returns 423 Locked, surfaces an inline
 * countdown alert (data-testid="lodge-retry-locked") and auto-re-enables when the
 * cooldown elapses.
 */
import { ShieldCheck, CheckCircle2, Clock, XCircle, RotateCcw, Undo2, Loader2, Lock, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { cn } from "@/lib/utils";

type PaymentStatus =
  | "unpaid"
  | "pending"
  | "processing"
  | "authorized"
  | "paid"
  | "captured"
  | "refunded"
  | "refund_pending"
  | "failed"
  | string
  | null;

interface RetryResult {
  locked?: boolean;
  retry_after_seconds?: number;
  error?: string;
  lock_attempt_id?: string | null;
  lock_started_at?: string | null;
  lock_owner_hint?: "self" | "other" | null;
  lock_admin_hint?: string | null;
}

interface Props {
  status: PaymentStatus;
  reservationStatus?: string | null;
  amountCents?: number | null;
  className?: string;
  /**
   * Retry handler. May return a `RetryResult` describing a 423 Locked outcome
   * so the badge can render an inline countdown alert. Returning `void` keeps
   * the existing happy-path behaviour.
   */
  onRetry?: () => Promise<RetryResult | void> | RetryResult | void;
  /** ISO timestamp of last Stripe webhook touching this reservation. */
  lastEventAt?: string | null;
  /** Stripe event type, e.g. "payment_intent.succeeded". */
  lastEventType?: string | null;
}

const fmt = (c?: number | null) => (c == null ? "" : `$${(c / 100).toFixed(2)}`);

const timeAgo = (iso: string): string => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const PROCESSING_WINDOW_MS = 8_000;
const TRANSITIONAL = new Set(["pending", "processing"]);
const CLOSED_RESERVATION_STATUSES = new Set(["cancelled", "checked_out", "no_show"]);

export function LodgingPaymentBadge({
  status,
  reservationStatus,
  amountCents,
  className,
  onRetry,
  lastEventAt,
  lastEventType,
}: Props) {
  const [retrying, setRetrying] = useState(false);
  const retryInFlightRef = useRef(false);
  const [, setTick] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockInfo, setLockInfo] = useState<RetryResult | null>(null);

  // Re-render every 1s while locked or every 5s for stale-time refresh.
  const needsFastTick = lockedUntil !== null;
  const needsSlowTick = !!lastEventAt || TRANSITIONAL.has(String(status));
  const tickDelay = needsFastTick ? 1_000 : needsSlowTick ? 5_000 : null;
  useVisibleInterval(() => setTick((t) => t + 1), tickDelay, { tickOnVisible: true });

  // Auto-clear lock when its countdown elapses
  useEffect(() => {
    if (lockedUntil && Date.now() >= lockedUntil) { setLockedUntil(null); setLockInfo(null); }
  });

  if (!status || status === "unpaid") return null;

  const rawStatus = String(status);
  const reservationClosed = CLOSED_RESERVATION_STATUSES.has(String(reservationStatus || ""));
  const effectiveStatus = reservationClosed && (TRANSITIONAL.has(rawStatus) || rawStatus === "failed") ? "payment_review" : rawStatus;

  const eventFresh = lastEventAt
    ? Date.now() - new Date(lastEventAt).getTime() < PROCESSING_WINDOW_MS
    : false;
  const isProcessing = !reservationClosed && (TRANSITIONAL.has(rawStatus) || eventFresh);
  const lockSecondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;

  const config: Record<string, { tone: string; icon: typeof Clock; label: string }> = {
    pending: {
      tone: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      icon: Clock,
      label: "Awaiting Stripe confirmation",
    },
    processing: {
      tone: "bg-muted text-muted-foreground border-border",
      icon: Loader2,
      label: "Processing Stripe update…",
    },
    authorized: {
      tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      icon: ShieldCheck,
      label: `Deposit authorized${amountCents ? ` · ${fmt(amountCents)}` : ""}`,
    },
    paid: {
      tone: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30",
      icon: CheckCircle2,
      label: `Payment captured${amountCents ? ` · ${fmt(amountCents)}` : ""}`,
    },
    captured: {
      tone: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30",
      icon: CheckCircle2,
      label: `Payment captured${amountCents ? ` · ${fmt(amountCents)}` : ""}`,
    },
    refund_pending: {
      tone: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      icon: RotateCcw,
      label: "Refund in progress",
    },
    refunded: {
      tone: "bg-muted text-muted-foreground border-border",
      icon: Undo2,
      label: `Deposit refunded${amountCents ? ` · ${fmt(amountCents)}` : ""}`,
    },
    failed: {
      tone: "bg-destructive/10 text-destructive border-destructive/30",
      icon: XCircle,
      label: "Payment failed — retry",
    },
    payment_review: {
      tone: "bg-muted text-muted-foreground border-border",
      icon: Clock,
      label: "Payment review",
    },
  };

  const cfg = config[effectiveStatus] || {
    tone: "bg-muted text-muted-foreground border-border",
    icon: Clock,
    label: rawStatus,
  };
  const Icon = cfg.icon;
  const baseCls = cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold",
    cfg.tone,
    className,
  );

  const handleRetryClick = async () => {
    if (!onRetry) return;
    if (retryInFlightRef.current || retrying || lockedUntil) return;
    retryInFlightRef.current = true;
    setRetrying(true);
    try {
      const result = await onRetry();
      if (result && typeof result === "object" && (result as RetryResult).locked) {
        const r = result as RetryResult;
        const seconds = Math.max(2, Math.min(120, Number(r.retry_after_seconds) || 5));
        setLockedUntil(Date.now() + seconds * 1000);
        setLockInfo(r);
      }
    } finally {
      // 5s cool-down before another retry can fire
      setTimeout(() => {
        retryInFlightRef.current = false;
        setRetrying(false);
      }, 5_000);
    }
  };

  const renderProcessingPill = isProcessing && rawStatus !== "failed";
  const wrapperCls = "inline-flex flex-col items-start gap-0.5";

  // Locked alert (shown above the badge when a parallel retry is in progress)
  const isSelf = lockInfo?.lock_owner_hint === "self";
  const OwnerIcon = isSelf ? User : Users;
  const lockedAlert = lockedUntil ? (
    <div
      data-testid="lodge-retry-locked"
      data-lock-owner={lockInfo?.lock_owner_hint || "unknown"}
      className="inline-flex items-start gap-1.5 px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 text-[10px] max-w-[280px]"
    >
      <Lock className="h-3 w-3 mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-semibold">
          {isSelf ? "Same-tab retry already running" : "Retry already in progress"}
        </p>
        {!isSelf && (
          <p className="opacity-80">
            Another retry is running. Re-enabling in {lockSecondsLeft}s…
          </p>
        )}
        {lockInfo?.lock_attempt_id && (
          <p className="opacity-80 inline-flex items-center gap-1 font-mono">
            <OwnerIcon className="h-2.5 w-2.5" />
            {isSelf ? "self" : "other tab"} · {lockInfo.lock_attempt_id.slice(0, 8)}
            {lockInfo.lock_started_at && (
              <span className="opacity-70"> · started {timeAgo(lockInfo.lock_started_at)}</span>
            )}
          </p>
        )}
        {lockInfo?.lock_admin_hint && (
          <p className="opacity-70 font-mono">admin …{lockInfo.lock_admin_hint}</p>
        )}
      </div>
    </div>
  ) : null;

  // Retry-failed clickable variant
  if (rawStatus === "failed" && !reservationClosed && onRetry) {
    return (
      <span className={wrapperCls}>
        {lockedAlert}
        <button
          type="button"
          onClick={handleRetryClick}
          disabled={retrying || !!lockedUntil}
          className={cn(
            baseCls,
            "hover:bg-destructive/15 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : lockedUntil ? <Lock className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
          {retrying ? "Retrying…" : lockedUntil ? `Locked · ${lockSecondsLeft}s` : cfg.label}
        </button>
        {lastEventAt && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground pl-1">
            <Clock className="h-2.5 w-2.5" />
            Updated {timeAgo(lastEventAt)}{lastEventType ? ` · ${lastEventType}` : ""}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={wrapperCls}>
      {lockedAlert}
      <span className={baseCls}>
        {renderProcessingPill ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className={cn("h-3 w-3", cfg.icon === Loader2 && "animate-spin")} />
        )}
        {renderProcessingPill ? "Processing Stripe update…" : cfg.label}
      </span>
      {lastEventAt && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground pl-1">
          <Clock className="h-2.5 w-2.5" />
          Updated {timeAgo(lastEventAt)}{lastEventType ? ` · ${lastEventType}` : ""}
        </span>
      )}
    </span>
  );
}
