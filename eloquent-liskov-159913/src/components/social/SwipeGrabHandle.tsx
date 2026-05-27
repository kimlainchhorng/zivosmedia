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
      onPointerDown={(e) => {
        e.stopPropagation();
        setPulsing(false);
        onStartDrag(e);
      }}
      onKeyDown={handleKeyDown}
      style={{ touchAction: "none", minHeight: 44 }}
      className={cn(
        "mx-auto flex h-11 w-full max-w-[160px] cursor-grab items-center justify-center active:cursor-grabbing select-none rounded-full",
        "focus-visible:outline-none focus-visible:ring-2",
        tone === "light"
          ? "focus-visible:ring-white/80"
          : "focus-visible:ring-foreground/60",
        className,
      )}
    >
      <span
        className={cn(
          "block h-1.5 w-12 rounded-full transition-all duration-300",
          pulsing && "animate-pulse",
          tone === "light"
            ? "bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.35)] hover:bg-white"
            : "bg-foreground/40 shadow-[0_0_8px_hsl(var(--foreground)/0.15)] hover:bg-foreground/70",
        )}
      />
    </div>
  );
}
