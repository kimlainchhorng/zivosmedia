/**
 * ScheduledMessagesSheet — List + cancel pending scheduled messages
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Clock from "lucide-react/dist/esm/icons/clock";
import X from "lucide-react/dist/esm/icons/x";
import { useScheduledSend } from "@/hooks/useScheduledSend";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId?: string;
}

export default function ScheduledMessagesSheet({ open, onOpenChange, receiverId }: Props) {
  const { items, cancel } = useScheduledSend(receiverId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass rounded-t-[1.75rem] border-white/10 px-0 pb-safe shadow-2xl">
        <div className="zivo-chat-header-glass px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
        <SheetHeader>
          <p className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Send later</p>
          <SheetTitle className="flex items-center gap-2 text-left text-lg font-black">
            <Clock className="h-5 w-5 text-primary" /> Scheduled messages
          </SheetTitle>
        </SheetHeader>
        </div>
        <div className="mx-4 mt-3 max-h-[50vh] space-y-2 overflow-y-auto pb-4">
          {items.length === 0 && (
            <div className="zivo-chat-card flex min-h-36 flex-col items-center justify-center p-6 text-center">
              <div className="zivo-chat-avatar-ring mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-black text-foreground">No scheduled messages</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Messages you schedule will appear here.</p>
            </div>
          )}
          {items.map((m) => (
            <div key={m.id} className="zivo-chat-row flex items-start gap-3 p-3">
              <span className="zivo-chat-avatar-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Clock className="h-4 w-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-black text-foreground">{m.message || "(media)"}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {new Date(m.scheduled_at).toLocaleString()}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cancel(m.id)} aria-label="Cancel" className="zivo-chat-icon-button h-9 w-9 shrink-0 rounded-full p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
