import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isSubscribed: boolean;
  notificationsOn?: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onSetNotifications?: (next: boolean) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * Telegram-style subscribe button:
 *  - When not subscribed: solid "Join" button with a + icon.
 *  - When subscribed: "Subscribed ✓" pill that opens a small menu with
 *    Mute / Unmute (local-only) and Leave channel (calls onUnsubscribe).
 *    The previous implementation showed a bell-off icon next to "Subscribed"
 *    and a single tap unsubscribed silently — easy to do by mistake.
 */
export function SubscribeButton({
  isSubscribed,
  notificationsOn = true,
  onSubscribe,
  onUnsubscribe,
  onSetNotifications,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Mirrors the prop so the icon flips immediately while the persist runs;
  // resyncs whenever the parent reloads.
  const [localMuted, setLocalMuted] = useState(!notificationsOn);
  useEffect(() => { setLocalMuted(!notificationsOn); }, [notificationsOn]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggleMute = async () => {
    const next = !localMuted;
    setLocalMuted(next);
    setOpen(false);
    if (onSetNotifications) {
      try {
        await onSetNotifications(!next);
      } catch {
        setLocalMuted(!next); // rollback handled both here and in hook
      }
    }
  };

  if (!isSubscribed) {
    return (
      <Button onClick={onSubscribe} disabled={disabled} className={cn("gap-1.5", className)}>
        <Plus className="h-4 w-4" /> Join
      </Button>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn("gap-1.5", className)}
      >
        <Check className="h-4 w-4" /> Subscribed
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-lg overflow-hidden text-sm"
        >
          <button
            type="button"
            onClick={toggleMute}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
          >
            {localMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {localMuted ? "Unmute notifications" : "Mute notifications"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onUnsubscribe(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-rose-500 hover:bg-muted/50 border-t border-border/40"
          >
            <LogOut className="h-4 w-4" /> Leave channel
          </button>
        </div>
      )}
    </div>
  );
}
