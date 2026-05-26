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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Coins from "lucide-react/dist/esm/icons/coins";
import { cn } from "@/lib/utils";

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
      const { error } = await (supabase as any).from("direct_messages").insert({
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
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Send a gift</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {GIFT_CATALOG.slice(0, 32).map((g) => (
            <button type="button"
              key={g.name}
              onClick={() => setSelected(g)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                selected?.name === g.name
                  ? "bg-primary/10 border-primary/40 scale-[1.02]"
                  : "bg-muted/30 border-border/30 hover:bg-muted/50"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-2xl", g.bg)}>
                {g.icon}
              </div>
              <div className="text-[10px] font-medium truncate w-full text-center">{g.name}</div>
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Coins className="w-2.5 h-2.5" />
                {g.coins}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 px-1">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              maxLength={80}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="button"
              onClick={send}
              disabled={sending}
              className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send ${selected.name} · ${selected.coins} coins`}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
