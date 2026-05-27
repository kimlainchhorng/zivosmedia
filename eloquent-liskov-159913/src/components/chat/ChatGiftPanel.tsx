/**
 * ChatGiftPanel — Live-stream-grade gift drawer for chat.
 * - Tabbed catalog (Popular / Animated / Exclusive)
 * - Z-Coin balance pill + Top-up
 * - Tap to send 1, long-press to combo (x2 / x5 / x10)
 * - Plays the same gift animation overlay used in live streams
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Coins, Plus, X, Sparkles, Gift, Crown, Zap } from "lucide-react";
import { giftCatalog, getLevelColor, type GiftItem } from "@/config/giftCatalog";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useChatGifts } from "@/hooks/useChatGifts";
import { useGiftAnimationQueue } from "@/hooks/useGiftAnimationQueue";
import { useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const GiftAnimationOverlay = lazy(() => import("@/components/live/GiftAnimationOverlay"));

interface Props {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName?: string;
}

const TABS = [
  { id: "popular", label: "Popular", icon: Sparkles, items: giftCatalog.gifts.slice(0, 24) },
  { id: "animated", label: "Animated", icon: Zap, items: giftCatalog.interactive },
  { id: "exclusive", label: "Exclusive", icon: Crown, items: giftCatalog.exclusive },
] as const;

const COMBO_STEPS = [1, 2, 5, 10];

export default function ChatGiftPanel({ open, onClose, recipientId, recipientName }: Props) {
  const { balance } = useCoinBalance();
  const { sendGift, sending } = useChatGifts();
  const { activeGift, comboCount, enqueue, onComplete } = useGiftAnimationQueue();
  const navigate = useNavigate();

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("popular");
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [combo, setCombo] = useState(1);
  const [note, setNote] = useState("");
  const holdTimer = useRef<number | null>(null);

  const items = useMemo(() => TABS.find((t) => t.id === tab)?.items ?? [], [tab]);

  useEffect(() => {
    if (!open) {
      setSelected(null); setCombo(1); setNote("");
    }
  }, [open]);

  const totalCost = (selected?.coins ?? 0) * combo;
  const insufficient = totalCost > balance;

  const startHold = () => {
    if (!selected) return;
    let i = 0;
    holdTimer.current = window.setInterval(() => {
      i = (i + 1) % COMBO_STEPS.length;
      setCombo(COMBO_STEPS[i]);
    }, 600) as unknown as number;
  };
  const endHold = () => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
  };

  const handleSend = async () => {
    if (!selected || sending || insufficient) return;
    // Trigger local animation immediately (recipient gets via realtime)
    try { enqueue?.({ name: selected.name, coins: selected.coins }); } catch { /* noop */ }
    const res = await sendGift(recipientId, selected, { combo, note: note.trim() || undefined });
    if (res.ok) {
      setCombo(1); setNote("");
      onClose();
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[78dvh] p-0 rounded-t-3xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold text-sm">Send a gift</div>
                  {recipientName && <div className="text-[11px] text-muted-foreground">to {recipientName}</div>}
                </div>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balance pill */}
            <div className="px-5 py-3 flex items-center justify-between">
              <button type="button"
                onClick={() => navigate("/wallet")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30"
              >
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{balance.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">coins</span>
              </button>
              <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => navigate("/wallet")}>
                <Plus className="w-3 h-3 mr-1" /> Top up
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pb-2">
              {TABS.map((t) => (
                <button type="button"
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition",
                    tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <t.icon className="w-3 h-3" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              <div className="grid grid-cols-4 gap-2">
                {items.map((g) => {
                  const isSel = selected?.name === g.name;
                  return (
                    <button type="button"
                      key={g.name}
                      onClick={() => { setSelected(g); setCombo(1); }}
                      className={cn(
                        "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all p-1",
                        g.bg,
                        isSel ? "ring-2 ring-primary scale-95" : "active:scale-95",
                      )}
                    >
                      <span className="text-3xl leading-none">{g.icon}</span>
                      <span className="text-[10px] font-semibold text-white/95 truncate w-full text-center px-0.5">{g.name}</span>
                      <span className={cn("text-[9px] font-bold flex items-center gap-0.5", getLevelColor(g.level))}>
                        <Coins className="w-2.5 h-2.5" />{g.coins}
                      </span>
                      {g.badge && (
                        <span className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded-full bg-black/40 text-white">{g.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer composer */}
            {selected && (
              <div className="px-4 pt-2 pb-3 border-t border-border/40 bg-background/95 backdrop-blur-md space-y-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 100))}
                  placeholder="Add a note (optional)"
                  className="h-9 text-sm rounded-full"
                />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {COMBO_STEPS.map((c) => (
                      <button type="button"
                        key={c}
                        onClick={() => setCombo(c)}
                        className={cn(
                          "h-9 w-10 rounded-full text-[11px] font-bold transition",
                          combo === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >x{c}</button>
                    ))}
                  </div>
                  <Button
                    onClick={handleSend}
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    disabled={sending || insufficient}
                    className="flex-1 h-10 rounded-full font-semibold gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 transition-all"
                  >
                    {insufficient ? (
                      <>Need {totalCost - balance} more</>
                    ) : (
                      <>Send {combo > 1 && `x${combo} `}<Coins className="w-4 h-4" />{totalCost.toLocaleString()}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Local animation overlay for sender */}
      <Suspense fallback={null}>
        {activeGift && (
          <GiftAnimationOverlay
            activeGift={activeGift}
            comboCount={comboCount}
            onComplete={onComplete}
          />
        )}
      </Suspense>
    </>
  );
}
