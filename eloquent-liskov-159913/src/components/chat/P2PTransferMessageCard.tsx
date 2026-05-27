/**
 * P2PTransferMessageCard
 * ----------------------
 * Renders an in-chat money transfer card. Reads live status from the
 * `p2p_transfers` row referenced by `transferId` so Accept / Decline
 * actions update both peers' bubbles via Realtime. The bubble shows:
 *   - the amount + optional note
 *   - sender/receiver context
 *   - Accept / Decline / Cancel buttons gated on the viewer's role
 *   - a status badge once settled
 *
 * Settlement is performed by the `accept_p2p_transfer`,
 * `decline_p2p_transfer`, and `cancel_p2p_transfer` Postgres RPCs which
 * atomically debit/credit the user_wallets and write ledger rows.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, X, ArrowDownToLine, AlertCircle, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { topicForGroupSync } from "@/lib/security/channelName";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  transferId: string;
  amountCents: number;
  note?: string | null;
  /** "send" = sender->receiver flow, "request" = receiver->sender flow. */
  mode?: "send" | "request";
  /** True when the current viewer authored the chat message. */
  isMe: boolean;
  /** Current user's id, used to decide which buttons to show. */
  currentUserId: string;
  time: string;
}

interface TransferRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount_cents: number;
  status: "pending" | "completed" | "declined" | "cancelled";
  completed_at: string | null;
}

const STATUS_LABEL: Record<TransferRow["status"], string> = {
  pending: "Pending",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<TransferRow["status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  declined: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-muted dark:text-muted-foreground dark:ring-border",
};

const CARD_TONE: Record<TransferRow["status"], string> = {
  pending: "border-amber-200/80 bg-white shadow-amber-950/5 dark:bg-card",
  completed: "border-emerald-200/90 bg-white shadow-emerald-950/5 dark:bg-card",
  declined: "border-rose-200/90 bg-white shadow-rose-950/5 dark:bg-card",
  cancelled: "border-zinc-200 bg-white shadow-zinc-950/5 dark:bg-card",
};

const ICON_TONE: Record<TransferRow["status"], string> = {
  pending: "bg-amber-50 text-amber-600 ring-amber-100",
  completed: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  declined: "bg-rose-50 text-rose-600 ring-rose-100",
  cancelled: "bg-zinc-50 text-zinc-500 ring-zinc-100",
};

const STRIPE_TONE: Record<TransferRow["status"], string> = {
  pending: "bg-amber-400",
  completed: "bg-emerald-500",
  declined: "bg-rose-500",
  cancelled: "bg-zinc-300",
};

function fmtUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function P2PTransferMessageCard({
  transferId, amountCents, note, mode = "send", isMe, currentUserId, time,
}: Props) {
  const navigate = useNavigate();
  const [row, setRow] = useState<TransferRow | null>(null);
  const [busy, setBusy] = useState<"accept" | "decline" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsTopup, setNeedsTopup] = useState(false);

  const refreshTransfer = useCallback(async () => {
    const { data, error: lErr } = await (supabase as any)
      .from("p2p_transfers")
      .select("id, sender_id, receiver_id, amount_cents, status, completed_at")
      .eq("id", transferId)
      .maybeSingle();

    if (!lErr && data) setRow(data as TransferRow);
    return data as TransferRow | null;
  }, [transferId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: lErr } = await (supabase as any)
        .from("p2p_transfers")
        .select("id, sender_id, receiver_id, amount_cents, status, completed_at")
        .eq("id", transferId)
        .maybeSingle();
      if (cancelled) return;
      if (lErr) setError("Could not load transfer");
      else setRow(data as TransferRow);
    }
    load();

    const channelName = topicForGroupSync(transferId, "p2p");
    const channel = (supabase as any)
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "p2p_transfers", filter: `id=eq.${transferId}` },
        (payload: { new: TransferRow }) => setRow(payload.new),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [transferId]);

  useEffect(() => {
    if (row?.status !== "pending") return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "hidden") void refreshTransfer();
    };
    const timer = window.setInterval(refreshIfVisible, 7000);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshTransfer, row?.status]);

  const handleAccept = async () => {
    setBusy("accept");
    setError(null);
    setNeedsTopup(false);
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc("accept_p2p_transfer", { p_transfer_id: transferId });
      if (rpcErr) {
        const code = (rpcErr as any).message || "";
        if (code.includes("insufficient_funds")) {
          toast.error("Add money to your wallet first");
          setError("Not enough wallet balance to accept this request.");
          setNeedsTopup(true);
        } else if (code.includes("not_pending")) {
          await refreshTransfer();
          toast.info("Transfer is already updated");
        } else {
          toast.error("Could not accept transfer");
          setError("Settlement failed");
        }
      } else {
        if (data) setRow(data as TransferRow);
        toast.success("Transfer accepted");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    setBusy("decline");
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc("decline_p2p_transfer", { p_transfer_id: transferId });
      if (rpcErr) {
        const code = (rpcErr as any).message || "";
        await refreshTransfer();
        if (code.includes("not_pending")) toast.info("Transfer is already updated");
        else toast.error("Could not decline");
      } else {
        if (data) setRow(data as TransferRow);
        toast.success("Transfer declined");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    setBusy("cancel");
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc("cancel_p2p_transfer", { p_transfer_id: transferId });
      if (rpcErr) {
        const code = (rpcErr as any).message || "";
        await refreshTransfer();
        if (code.includes("not_pending")) toast.info("Transfer is already updated");
        else toast.error("Could not cancel");
      } else {
        if (data) setRow(data as TransferRow);
        toast.success("Transfer cancelled");
      }
    } finally {
      setBusy(null);
    }
  };

  const isReceiver = !!row && row.receiver_id === currentUserId;
  const isSender = !!row && row.sender_id === currentUserId;
  const canSettle = mode === "request" ? isSender : isReceiver;
  const canCancel = mode === "request" ? isReceiver : isSender;
  const status = row?.status ?? "pending";
  const title = mode === "request" ? "Money request" : "Money transfer";
  const statusCopy =
    status === "pending"
      ? mode === "request"
        ? "Waiting for response in chat."
        : "Waiting for recipient to accept."
      : status === "completed"
        ? "Transfer completed."
        : status === "declined"
          ? mode === "request"
            ? "This request was declined."
            : "Recipient declined this transfer."
          : mode === "request"
            ? "This request was cancelled."
            : "This transfer was cancelled.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative w-[min(78vw,292px)] overflow-hidden rounded-[1.25rem] border shadow-[0_10px_24px_-20px_rgba(15,23,42,0.7)]",
          CARD_TONE[status],
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1.5", STRIPE_TONE[status])} />

        <div className="px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1", ICON_TONE[status])}>
              {mode === "request" ? <ArrowDownToLine className="h-[18px] w-[18px]" strokeWidth={2.35} /> : <Wallet className="h-[18px] w-[18px]" strokeWidth={2.35} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">
                  ZIVO Pay
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] ring-1",
                    STATUS_TONE[status],
                  )}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>

              <div className="mt-1.5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold leading-tight text-foreground">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    {statusCopy}
                  </p>
                </div>
                <p className="shrink-0 text-2xl font-black leading-none tracking-normal text-foreground tabular-nums">
                  {fmtUsd(amountCents)}
                </p>
              </div>
            </div>
          </div>

          {note && (
            <div className="mt-2.5 rounded-xl bg-muted/45 px-3 py-2 text-[13px] leading-snug text-foreground/80">
              {note}
            </div>
          )}

          {error && (
          <div className="mt-2.5 rounded-xl bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">
            <div className="flex items-start gap-1.5 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            {needsTopup && (
              <button
                type="button"
                onClick={() => navigate("/wallet")}
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
              >
                <Wallet className="h-3.5 w-3.5" />
                Top up wallet
              </button>
            )}
          </div>
          )}

          {row && status === "pending" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {canSettle && (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-extrabold text-foreground transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Decline
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!!busy}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-extrabold text-foreground transition-transform active:scale-95 disabled:opacity-50"
                >
                  {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Cancel transfer
                </button>
              )}
            </div>
          )}

          {row && status === "completed" && row.completed_at && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Settled {new Date(row.completed_at).toLocaleString()}
            </p>
          )}

          <div className="mt-2.5 text-right text-[11px] font-semibold text-muted-foreground/75">{time}</div>
        </div>
      </div>
    </motion.div>
  );
}
