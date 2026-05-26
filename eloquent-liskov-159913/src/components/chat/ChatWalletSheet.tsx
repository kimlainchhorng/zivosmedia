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
      <SheetContent side="bottom" className="h-[72dvh] p-0 rounded-t-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/40">
          <SheetHeader className="text-left p-0">
            <SheetTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" /> Wallet
            </SheetTitle>
          </SheetHeader>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(72dvh-50px)]">
          {/* Balance hero */}
          <div className="m-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 text-white shadow-lg">
            <div className="text-[11px] uppercase tracking-wider opacity-90">Z-Coin balance</div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-3xl font-extrabold">{balance.toLocaleString()}</div>
              <Coins className="w-5 h-5 mb-1.5" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => navigate("/wallet")}>
                <Plus className="w-3 h-3 mr-1" /> Top up
              </Button>
              <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => navigate("/wallet")}>
                <ArrowUpRight className="w-3 h-3 mr-1" /> Cash out
              </Button>
            </div>
          </div>

          {/* Send to recipient */}
          <div className="mx-4 p-4 rounded-2xl border border-border/50 bg-card">
            <div className="text-sm font-semibold mb-1">Send coins {recipientName ? `to ${recipientName}` : ""}</div>
            <p className="text-[11px] text-muted-foreground mb-3">Coins arrive instantly. The recipient sees a transfer card in chat.</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK.map((q) => (
                <button type="button"
                  key={q}
                  onClick={() => setAmount(q)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                    amount === q ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border/40",
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
              className="mb-2 h-10"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              placeholder="Note (optional)"
              className="mb-3 h-10"
            />
            <Button
              onClick={handleSend}
              disabled={sending || amount <= 0 || amount > balance}
              className="w-full h-11 rounded-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
              {amount > balance ? "Insufficient balance" : `Send ${amount.toLocaleString()} coins`}
            </Button>
          </div>

          <div className="px-5 py-4">
            <button type="button" onClick={() => navigate("/wallet")} className="w-full text-center text-xs text-primary font-medium">
              Open full wallet →
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
