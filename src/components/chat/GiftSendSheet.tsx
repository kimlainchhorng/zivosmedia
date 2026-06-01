/**
 * GiftSendSheet — Pick a gift from the catalog and send it as a chat gift.
 * Inserts a direct_messages row with message_type='gift' and gift_payload JSON.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { giftCatalog, type GiftItem } from "@/config/giftCatalog";

const GIFT_CATALOG: GiftItem[] = [
  ...giftCatalog.gifts,
  ...giftCatalog.interactive,
  ...giftCatalog.exclusive,
];
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Coins from "lucide-react/dist/esm/icons/coins";
import Gift from "lucide-react/dist/esm/icons/gift";
import { cn } from "@/lib/utils";
import { sendDirectMessage } from "@/lib/chat/directMessageSend";

interface Props {
  open: boolean;
  onClose: () => void;
  recipientId: string;
}

export default function GiftSendSheet({ open, onClose, recipientId }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user?.id || !selected) return;
    setSending(true);
    try {
      const payload = {
        icon: selected.icon,
        name: selected.name,
        coins: selected.coins,
        note: note.trim() || null,
      };
      const { error } = await sendDirectMessage({
        sender_id: user.id,
        receiver_id: recipientId,
        message: `🎁 ${selected.name} (${selected.coins} coins)`,
        message_type: "gift",
        gift_payload: payload,
      });
      if (error) throw error;
      toast.success(`Sent ${selected.name}`);
      setSelected(null);
      setNote("");
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not send gift";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass max-h-[80vh] overflow-y-auto rounded-t-[1.75rem] border-white/10 px-0 pb-8 shadow-2xl">
        <div className="zivo-chat-header-glass sticky top-0 z-10 px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
          <SheetHeader className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Gift studio</p>
            <SheetTitle className="flex items-center gap-2 text-lg font-black">
              <Gift className="h-4 w-4 text-amber-500" /> Send a gift
            </SheetTitle>
        </SheetHeader>
        </div>

        <div className="grid grid-cols-4 gap-2 px-4 pt-4">
          {GIFT_CATALOG.slice(0, 32).map((g) => (
            <button type="button"
              key={g.name}
              onClick={() => setSelected(g)}
              className={cn(
                "relative flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 shadow-sm transition-all",
                selected?.name === g.name
                  ? "border-primary/50 bg-primary/10 scale-[1.02] shadow-lg shadow-primary/10"
                  : "border-white/10 bg-background/45 hover:-translate-y-0.5 hover:bg-muted/20 hover:shadow-lg"
              )}
            >
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm", g.bg)}>
                {g.icon}
              </div>
              <div className="w-full truncate text-center text-[10px] font-black">{g.name}</div>
              <div className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
                <Coins className="w-2.5 h-2.5" />
                {g.coins}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="zivo-chat-card mx-4 mt-4 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm", selected.bg)}>
                {selected.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">{selected.name}</p>
                <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  <Coins className="h-3 w-3" />
                  {selected.coins} coins
                </p>
              </div>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              maxLength={80}
              className="zivo-chat-search w-full px-3 py-2.5 text-sm focus:outline-none"
            />
            <button type="button"
              onClick={send}
              disabled={sending}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send ${selected.name} · ${selected.coins} coins`}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
