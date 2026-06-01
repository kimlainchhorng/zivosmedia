/**
 * SwipeGrabHandle — visible pill affordance shown atop fullscreen
 * viewer headers. Captures pointer events to start the parent overlay's
 * drag-to-dismiss gesture; surrounding scrollable content remains
 * scrollable because dragListener is false on the motion container.
 *
 * v2026: enlarged tap target, soft glow, and a one-time intro pulse so
 * users discover the gesture on first open.
 *
 * Accessibility: the handle is keyboard-reachable. Enter/Space (and
 * Escape, when an `onClose` is provided) dismiss the viewer so users on
 * external keyboards/assistive tech don't depend on the swipe gesture.
 */
import * as React from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onStartDrag: (e: React.PointerEvent) => void;
  /** Optional keyboard / fallback close handler — wired to Enter/Space/Escape. */
  onClose?: () => void;
  className?: string;
  /** Visual variant — light pill on dark/black overlays, dark on light. */
  tone?: "light" | "dark";
  testId?: string;
}

export function SwipeGrabHandle({
  onStartDrag,
  onClose,
  className,
  tone = "light",
  testId = "swipe-grab-handle",
}: Props) {
  const [pulsing, setPulsing] = React.useState(true);

  React.useEffect(() => {
    // Stop the discovery pulse after ~1.4s so it teaches without distracting.
    const t = window.setTimeout(() => setPulsing(false), 1400);
    return () => window.clearTimeout(t);
  }, []);
  const gestureSignal = pulsing ? "Discover" : onClose ? "Ready" : "Drag";

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!onClose) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      data-testid={testId}
      data-swipe-grab="true"
      role="button"
      aria-label={
        onClose
          ? "Close post — drag down or press Enter or Escape"
          : "Drag down to close"
      }
      tabIndex={onClose ? 0 : -1}
      title={onClose ? "Drag down or press Escape to close" : "Drag down to close"}
      onPointerDown={(e) => {
        e.stopPropagation();
        setPulsing(false);
        onStartDrag(e);
      }}
      onKeyDown={handleKeyDown}
      style={{ touchAction: "none", minHeight: 44 }}
      className={cn(
        "group mx-auto flex h-11 w-full max-w-[184px] cursor-grab select-none items-center justify-center rounded-full border px-3 active:cursor-grabbing",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2",
        tone === "light"
          ? "border-white/14 bg-white/12 focus-visible:ring-white/80 hover:bg-white/16"
          : "border-border/55 bg-white/72 focus-visible:ring-foreground/60 hover:bg-white/86",
        className,
      )}
    >
      <span className="sr-only">
        {onClose ? "Drag down or use the keyboard to close this viewer." : "Drag down to close this viewer."}
      </span>
      <span
        aria-hidden
        className={cn(
          "mr-2 h-1.5 w-1.5 rounded-full transition-all duration-300",
          pulsing && "animate-pulse",
          tone === "light"
            ? "bg-cyan-300/80 shadow-[0_0_12px_rgba(103,232,249,0.48)]"
            : "bg-cyan-500/70 shadow-[0_0_10px_rgba(6,182,212,0.28)]",
        )}
      />
      <span
        className={cn(
          "flex h-7 w-16 items-center justify-center rounded-full border transition-all duration-300 group-hover:w-[4.5rem]",
          pulsing && "animate-pulse",
          tone === "light"
            ? "border-white/12 bg-white/14 text-white/86 shadow-[0_0_16px_rgba(255,255,255,0.32)] group-hover:bg-white/20"
            : "border-border/50 bg-white/72 text-foreground/62 shadow-[0_0_10px_hsl(var(--foreground)/0.12)] group-hover:bg-white/90",
        )}
      >
        <GripHorizontal className="h-4 w-4" aria-hidden="true" />
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-2 hidden rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all sm:inline-flex",
          tone === "light"
            ? "bg-white/10 text-white/58 group-hover:text-white/78"
            : "bg-foreground/5 text-foreground/48 group-hover:text-foreground/70",
        )}
      >
        {gestureSignal}
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-2 hidden h-1 w-8 overflow-hidden rounded-full sm:block",
          tone === "light" ? "bg-white/12" : "bg-foreground/8",
        )}
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-300",
            tone === "light"
              ? "bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-300"
              : "bg-gradient-to-r from-cyan-500 via-primary to-fuchsia-500",
          )}
          style={{ width: pulsing ? "100%" : onClose ? "72%" : "48%" }}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-2 h-1.5 w-1.5 rounded-full transition-all duration-300",
          pulsing && "animate-pulse",
          tone === "light"
            ? "bg-fuchsia-300/80 shadow-[0_0_12px_rgba(240,171,252,0.44)]"
            : "bg-fuchsia-500/60 shadow-[0_0_10px_rgba(217,70,239,0.22)]",
        )}
      />
    </div>
  );
}
