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
      <SheetContent side="bottom" className="zivo-chat-popover-glass rounded-t-[1.75rem] border-white/10 px-0 pb-8 shadow-2xl">
        <div className="zivo-chat-header-glass px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
        <SheetHeader className="text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Quiet mode</p>
          <SheetTitle className="flex items-center gap-2 text-lg font-black">
            <BellOff className="h-4 w-4 text-primary" />
            <span className="truncate">{threadName ? `Mute "${threadName}"` : "Mute notifications"}</span>
          </SheetTitle>
        </SheetHeader>
        </div>

        <div className="mx-4 mt-3 flex flex-col rounded-3xl border border-white/10 bg-background/40 p-1 shadow-sm backdrop-blur-xl">
          {OPTIONS.map((o) => (
            <button type="button"
              key={o.hours}
              onClick={() => { onPick(o.hours); onClose(); }}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.98] transition-all",
                "hover:bg-muted/20 text-foreground",
              )}
            >
              <span className="zivo-chat-avatar-ring flex h-10 w-10 items-center justify-center rounded-full">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="text-sm font-bold">{o.label}</span>
            </button>
          ))}

          {isMuted && (
            <button type="button"
              onClick={() => { onPick(-1); onClose(); }}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-emerald-600 transition-all active:scale-[0.98] hover:bg-emerald-500/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Bell className="h-4 w-4" />
              </span>
              <span className="text-sm font-black">Unmute</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
