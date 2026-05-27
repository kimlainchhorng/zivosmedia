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
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Clock className="w-5 h-5" /> Scheduled messages
          </SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No scheduled messages</p>
          )}
          {items.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{m.message || "(media)"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(m.scheduled_at).toLocaleString()}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cancel(m.id)} aria-label="Cancel">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
