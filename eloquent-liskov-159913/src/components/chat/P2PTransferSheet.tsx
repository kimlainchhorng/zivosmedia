/**
 * P2PTransferSheet — Venmo/Cash App-style "send money to a friend" UI.
 *
 * Opens via a global event so any chat can request it. A backend function
 * creates the transfer plus companion chat message because money requests
 * need to create a payer-side transfer row that RLS should not allow from
 * the browser directly.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import X from "lucide-react/dist/esm/icons/x";
import Send from "lucide-react/dist/esm/icons/send";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import {
  P2P_TRANSFER_EVENT,
  openP2PTransfer,
  subscribeP2PTransfer,
  type P2PTransferDetail,
} from "@/lib/p2pTransfer";

export { P2P_TRANSFER_EVENT, openP2PTransfer };
export type { P2PTransferDetail };

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function P2PTransferSheet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<P2PTransferDetail | null>(null);
  const [activeMode, setActiveMode] = useState<"send" | "request">("send");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  // Sender's available balance from customer_wallets — same table the
  // accept_p2p_transfer RPC debits from. Shown inline so users don't blindly
  // submit an amount they can't cover.
  const [availableCents, setAvailableCents] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    const subscribe = (d: P2PTransferDetail) => {
      setDetail(d);
      setActiveMode(d.mode || "send");
      setOpen(true);
    };
    const unsubscribe = subscribeP2PTransfer(subscribe);
    // Belt-and-braces: still listen on the window event in case the function
    // import path was mocked or hot-replaced.
    const winHandler = (e: Event) => {
      const d = (e as CustomEvent<P2PTransferDetail>).detail;
      if (d) subscribe(d);
    };
    window.addEventListener(P2P_TRANSFER_EVENT, winHandler as EventListener);
    return () => {
      unsubscribe();
      window.removeEventListener(P2P_TRANSFER_EVENT, winHandler as EventListener);
    };
  }, []);

  // Refresh balance every time the sheet opens.
  useEffect(() => {
    if (!open || !user?.id) { setAvailableCents(null); return; }
    let cancelled = false;
    setBalanceLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("customer_wallets")
        .select("balance_cents")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setAvailableCents(typeof data?.balance_cents === "number" ? data.balance_cents : 0);
      setBalanceLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const close = () => {
    setOpen(false);
    setDetail(null);
    setActiveMode("send");
    setAmount("");
    setNote("");
  };

  const send = async () => {
    if (!user?.id || !detail) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) { toast.error("Enter an amount"); return; }
    const isRequest = activeMode === "request";
    // Pre-check sender's wallet so we fail fast in the composer instead of
    // letting the recipient hit "insufficient_funds" on accept.
    if (!isRequest && availableCents != null && cents > availableCents) {
      toast.error(`Not enough balance — you have ${(availableCents / 100).toFixed(2)} available`);
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-p2p-transfer", {
        body: {
          counterparty_id: detail.receiverId,
          amount_cents: cents,
          note,
          mode: isRequest ? "request" : "send",
        },
      });
      if (error) throw new Error(error.message || "Couldn't complete transfer");
      if ((data as { error?: string; message?: string } | null)?.error) {
        const payload = data as { error?: string; message?: string };
        throw new Error(payload.message || payload.error || "Couldn't complete transfer");
      }

      toast.success(isRequest ? `Requested from ${detail.receiverName}` : `Sent to ${detail.receiverName}`);
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't complete transfer";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const numericAmount = parseFloat(amount || "0");
  const amountInputWidth = `${Math.max((amount || "0.00").length, 4)}ch`;
  const formatAmount = () => {
    const value = parseFloat(amount);
    if (Number.isFinite(value) && value > 0) setAmount(value.toFixed(2));
  };

  return (
    <AnimatePresence>
      {open && detail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[1600] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 180 }}
            dragElastic={0.16}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 700) close();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-[1.75rem] sm:rounded-2xl pb-[max(1.5rem,calc(var(--zivo-safe-bottom,0px)+1rem))] flex flex-col overflow-hidden"
          >
            <div className="flex justify-center pt-2">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="flex items-start justify-between px-4 pt-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">{activeMode === "request" ? "Request from" : "Send to"} {detail.receiverName}</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {activeMode === "request"
                    ? "They'll get a notification and can accept in chat."
                    : "They'll see it in chat and accept to settle."}
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="h-10 w-10 -mr-1.5 flex shrink-0 items-center justify-center rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mx-auto mb-7 grid w-full max-w-[260px] grid-cols-2 rounded-full bg-muted/60 p-1">
                {(["send", "request"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`rounded-full px-3 py-2.5 text-base font-bold transition ${
                      activeMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={activeMode === mode}
                  >
                    {mode === "send" ? "Send" : "Request"}
                  </button>
                ))}
              </div>

              <div className="mb-5 flex items-baseline justify-center">
                <span className="mr-1 text-5xl font-extrabold leading-none text-muted-foreground">$</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={formatAmount}
                  placeholder="0.00"
                  style={{ width: amountInputWidth }}
                  className="min-w-[4ch] max-w-[8ch] text-5xl font-extrabold tracking-normal text-left bg-transparent outline-none placeholder:text-muted-foreground/35 tabular-nums"
                />
              </div>

              <div className="mb-5 flex gap-2 justify-center">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setAmount(v.toFixed(2))}
                    className={`px-4 py-2 rounded-full text-sm font-extrabold active:scale-95 transition ${
                      numericAmount === v
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 hover:bg-muted text-foreground"
                    }`}
                    aria-pressed={numericAmount === v}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              {activeMode !== "request" && (
                <div className="flex items-center justify-center gap-1.5 mb-4 text-[12px]">
                  <span className="text-muted-foreground">Available:</span>
                  <span className={`font-semibold tabular-nums ${availableCents != null && parseFloat(amount || "0") * 100 > availableCents ? "text-rose-500" : "text-foreground"}`}>
                    {balanceLoading
                      ? "…"
                      : availableCents == null
                        ? "—"
                        : `$${(availableCents / 100).toFixed(2)}`}
                  </span>
                  {availableCents != null && availableCents > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount((availableCents / 100).toFixed(2))}
                      className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-primary hover:bg-primary/10"
                    >
                      Max
                    </button>
                  )}
                </div>
              )}

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's it for?"
                maxLength={80}
                className="w-full px-4 py-4 rounded-2xl bg-muted/35 border border-border/40 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />

              <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
                {activeMode === "request"
                  ? `${detail.receiverName} will get a request in chat.`
                  : `${detail.receiverName} will get this transfer in chat.`}
              </p>
            </div>

            <div className="px-4 pb-1">
              {(() => {
                const cents = Math.round((parseFloat(amount) || 0) * 100);
                const overBalance = activeMode !== "request" && availableCents != null && cents > availableCents;
                const emptyBalance = activeMode !== "request" && availableCents === 0;
                return (
                  <>
                    <button type="button"
                      onClick={() => void send()}
                      disabled={sending || !amount || overBalance}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.35rem] bg-primary text-primary-foreground font-extrabold text-lg active:opacity-80 transition disabled:opacity-50"
                    >
                      {sending
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <><Send className="w-4 h-4" /> {overBalance ? "Insufficient balance" : (activeMode === "request" ? "Request" : "Send")}</>}
                    </button>
                    {(overBalance || emptyBalance) && (
                      <button
                        type="button"
                        onClick={() => { close(); navigate("/wallet"); }}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-sm active:scale-[0.99] transition"
                      >
                        <Wallet className="w-4 h-4" />
                        Top up wallet
                      </button>
                    )}
                    {emptyBalance && (
                      <button
                        type="button"
                        onClick={() => setActiveMode("request")}
                        className="w-full mt-2 py-2 text-sm font-semibold text-primary"
                      >
                        Request money instead
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
