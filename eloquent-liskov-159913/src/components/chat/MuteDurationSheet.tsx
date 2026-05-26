/**
 * MuteDurationSheet — Telegram-style mute picker (1h / 8h / 1d / forever / unmute).
 * Used from chat header and chat row actions.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import Clock from "lucide-react/dist/esm/icons/clock";
import { cn } from "@/lib/utils";

export interface MuteDurationSheetProps {
  open: boolean;
  onClose: () => void;
  /** Pass -1 to unmute, 0 for forever, or a positive number of hours. */
  onPick: (hours: number) => void;
  isMuted?: boolean;
  threadName?: string;
}

const OPTIONS = [
  { hours: 1, label: "Mute for 1 hour" },
  { hours: 8, label: "Mute for 8 hours" },
  { hours: 24, label: "Mute for 1 day" },
  { hours: 24 * 7, label: "Mute for 1 week" },
  { hours: 0, label: "Mute forever" },
];

export default function MuteDurationSheet({ open, onClose, onPick, isMuted, threadName }: MuteDurationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base flex items-center gap-2">
            <BellOff className="w-4 h-4" />
            <span className="truncate">{threadName ? `Mute "${threadName}"` : "Mute notifications"}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-col">
          {OPTIONS.map((o) => (
            <button type="button"
              key={o.hours}
              onClick={() => { onPick(o.hours); onClose(); }}
              className={cn(
                "flex items-center gap-3 px-2 py-3 text-left rounded-xl active:scale-[0.98] transition-all",
                "hover:bg-muted/60 text-foreground",
              )}
            >
              <Clock className="w-5 h-5 opacity-70" />
              <span className="text-sm font-medium">{o.label}</span>
            </button>
          ))}

          {isMuted && (
            <button type="button"
              onClick={() => { onPick(-1); onClose(); }}
              className="flex items-center gap-3 px-2 py-3 text-left rounded-xl hover:bg-muted/60 text-emerald-600 active:scale-[0.98] transition-all"
            >
              <Bell className="w-5 h-5" />
              <span className="text-sm font-medium">Unmute</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
