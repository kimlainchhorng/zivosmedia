/**
 * SwipeBackContainer — iOS-style "swipe from left edge to go back" wrapper.
 *
 * Wraps a page in a div that translates with the drag, dims/fades as the
 * user pulls right, and on release-past-threshold calls `onSwipeBack`
 * (typically `() => navigate(-1)`).
 *
 * Live peel preview gives the standard iOS gesture feel.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** Override the back action. Default: navigate(-1). */
  onBack?: () => void;
  /** Disable the gesture (e.g., inside an open modal). Default false. */
  disabled?: boolean;
  className?: string;
}

export function SwipeBackContainer({ children, onBack, disabled = false, className }: Props) {
  const navigate = useNavigate();
  const back = React.useCallback(() => {
    if (onBack) onBack();
    else navigate(-1);
  }, [onBack, navigate]);

  const { offset, active } = useSwipeBack({ onSwipeBack: back, disabled });

  // Subtle "peel" — translate the whole page with the drag.
  // Easing: start linear, gentle cap toward the right edge.
  const x = Math.round(offset * 0.85);
  const opacity = active ? Math.max(0.7, 1 - offset / (typeof window !== "undefined" ? window.innerWidth : 800) * 0.4) : 1;

  return (
    <div
      data-swipeback={active ? "active" : "idle"}
      style={{
        transform: active ? `translate3d(${x}px, 0, 0)` : undefined,
        opacity,
        transition: active ? "none" : "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms",
        willChange: active ? "transform, opacity" : undefined,
      }}
      className={cn(className)}
    >
      {/* Edge hint — a hairline gradient ribbon at the left edge that shows when dragging */}
      {active && (
        <div
          aria-hidden
          className="fixed inset-y-0 left-0 z-[2500] pointer-events-none"
          style={{ width: 4, backgroundImage: "var(--ig-gradient)", opacity: Math.min(1, offset / 80) }}
        />
      )}
      {children}
    </div>
  );
}

export default SwipeBackContainer;
