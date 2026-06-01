/**
 * ChatWalletSheet — In-chat wallet pane.
 * Shows Z-Coin balance, last transactions, and a peer-to-peer "Send coins" action.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Send, Plus, ArrowUpRight, X } from "lucide-react";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useCoinTransfer } from "@/hooks/useCoinTransfer";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName?: string;
}

const QUICK = [10, 50, 100, 500, 1000];

export default function ChatWalletSheet({ open, onClose, recipientId, recipientName }: Props) {
  const { balance } = useCoinBalance();
  const { transfer, sending } = useCoinTransfer();
  const navigate = useNavigate();

  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");

  const handleSend = async () => {
    if (amount <= 0 || amount > balance) return;
    const res = await transfer(recipientId, amount, note.trim() || undefined);
    if (res.ok) { setAmount(0); setNote(""); onClose(); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass h-[72dvh] overflow-hidden rounded-t-[1.75rem] border-white/10 p-0 shadow-2xl">
        <div className="zivo-chat-header-glass flex items-center justify-between px-5 pb-4 pt-4">
          <SheetHeader className="text-left p-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Z-Coin transfer</p>
            <SheetTitle className="flex items-center gap-2 text-lg font-black">
              <Coins className="h-4 w-4 text-amber-500" /> Wallet
            </SheetTitle>
          </SheetHeader>
          <button type="button" onClick={onClose} className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center" aria-label="Close wallet">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[calc(72dvh-64px)] overflow-y-auto">
          {/* Balance hero */}
          <div className="m-4 overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-2xl shadow-orange-500/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-90">Z-Coin balance</div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="text-4xl font-black tracking-tight">{balance.toLocaleString()}</div>
                  <Coins className="mb-2 h-5 w-5" />
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md">
                <Coins className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" className="h-9 rounded-full bg-white/90 px-3 text-xs font-black text-orange-700 hover:bg-white" onClick={() => navigate("/wallet")}>
                <Plus className="mr-1 h-3 w-3" /> Top up
              </Button>
              <Button size="sm" variant="secondary" className="h-9 rounded-full bg-white/20 px-3 text-xs font-black text-white hover:bg-white/25" onClick={() => navigate("/wallet")}>
                <ArrowUpRight className="mr-1 h-3 w-3" /> Cash out
              </Button>
            </div>
          </div>

          {/* Send to recipient */}
          <div className="zivo-chat-card mx-4 p-4">
            <div className="mb-1 text-sm font-black">Send coins {recipientName ? `to ${recipientName}` : ""}</div>
            <p className="mb-3 text-[11px] font-semibold text-muted-foreground">Coins arrive instantly. The recipient sees a transfer card in chat.</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK.map((q) => (
                <button type="button"
                  key={q}
                  onClick={() => setAmount(q)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-black transition",
                    amount === q ? "zivo-chat-chip-active border-primary" : "zivo-chat-chip border-border/40 text-muted-foreground",
                  )}
                >{q}</button>
              ))}
            </div>

            <Input
              type="number"
              min={1}
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              placeholder="Amount"
              className="zivo-chat-search mb-2 h-11"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              placeholder="Note (optional)"
              className="zivo-chat-search mb-3 h-11"
            />
            <Button
              onClick={handleSend}
              disabled={sending || amount <= 0 || amount > balance}
              className="h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-600"
            >
              <Send className="h-4 w-4" />
              {amount > balance ? "Insufficient balance" : `Send ${amount.toLocaleString()} coins`}
            </Button>
          </div>

          <div className="px-5 py-4">
            <button type="button" onClick={() => navigate("/wallet")} className="zivo-chat-chip w-full justify-center py-2.5 text-center text-xs font-black text-primary">
              Open full wallet →
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
