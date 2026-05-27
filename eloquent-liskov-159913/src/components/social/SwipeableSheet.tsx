/**
 * SwipeableSheet — bottom sheet primitive used across the social feed.
 *
 * Features:
 *  - Backdrop tap to close
 *  - Drag the header strip down to close (offset > 100px OR velocity > 500)
 *  - Rubber-band feel on down-drag + light haptic feedback on snap-close
 *  - Animated grabber pill that pulses once on mount to hint draggability
 *  - Safe-area-aware top padding so the header never hides behind a notch
 *  - Snap-point max height: min(maxHeightVh dvh, 100dvh - safe-area-top - 24px)
 *  - Escape key to close + focus trap (focus first focusable on open,
 *    cycle Tab/Shift-Tab inside the dialog, restore previously-focused
 *    element on close)
 *  - Inner content scrolls naturally; only the header strip drives the drag
 */
import { type ReactNode, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface SwipeableSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional title shown in the drag header */
  title?: ReactNode;
  /** Optional right-aligned action shown in the header (defaults to a close X) */
  headerAction?: ReactNode;
  /** Aria-label for the sheet dialog (used when title is not a plain string) */
  ariaLabel?: string;
  /**
   * Max height as vh (default 85). Use 100 for full-height sheets.
   * The actual cap is `min(maxHeightVh dvh, 100dvh - safe-area-top - 24px)`
   * so the sheet never visually overflows on small / notched screens.
   */
  maxHeightVh?: number;
  /** Add safe-area-aware padding at the top of the sheet (default true) */
  safeAreaTop?: boolean;
  /** Z-index of the overlay (default 100) */
  zIndex?: number;
  /** Extra classes for the inner sheet panel */
  className?: string;
  /** Hide the default close X button in the header */
  hideCloseButton?: boolean;
  /** Outer overlay positioning. Use "absolute" when rendered inside a relative container (e.g. Reels overlay). */
  positioning?: "fixed" | "absolute";
  /** Extra classes for the drag-handle/header strip (e.g. dark mode borders) */
  headerClassName?: string;
}

const CLOSE_OFFSET_PX = 100;
const CLOSE_VELOCITY = 500;

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function SwipeableSheet({
  open,
  onClose,
  children,
  title,
  headerAction,
  ariaLabel,
  maxHeightVh = 85,
  safeAreaTop = true,
  zIndex = 100,
  className,
  hideCloseButton,
  positioning = "fixed",
  headerClassName,
}: SwipeableSheetProps) {
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const { impact } = useHaptics();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET_PX || info.velocity.y > CLOSE_VELOCITY) {
      void impact("light");
      onClose();
    }
  };

  // ── Focus trap + Escape + focus restoration ─────────────────────────────
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    // Focus the first focusable element inside the panel (defer for animation)
    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      (focusable[0] || panel).focus({ preventScroll: true });
    };
    const t = window.setTimeout(focusFirst, 80);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to the element that opened the sheet
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          /* noop */
        }
      }
    };
  }, [open, onClose]);

  const isStringTitle = typeof title === "string";
  const labelledBy = isStringTitle ? titleId : undefined;
  const labelText = !labelledBy ? ariaLabel : undefined;

  // Snap-point max-height: never exceed viewport minus top safe-area + 24px buffer
  const maxHeightStyle = `min(${maxHeightVh}dvh, calc(100dvh - var(--zivo-safe-top,0px) - 24px))`;

  // When using `fixed` positioning, portal to <body> so we escape any
  // transformed ancestor (e.g. PullToRefresh) that would otherwise re-anchor
  // position:fixed and shift the sheet off-screen.
  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            positioning === "absolute" ? "absolute" : "fixed",
            "inset-0 flex items-end justify-center",
          )}
          style={{ zIndex }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={labelText}
          aria-labelledby={labelledBy}
        >
          <div className="absolute inset-0 bg-black/40" />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            // Firmer rubber-band on the way down, hard stop going up
            dragElastic={{ top: 0, bottom: 0.45 }}
            dragTransition={{
              bounceStiffness: 380,
              bounceDamping: 28,
              power: 0.18,
              timeConstant: 220,
            }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-md bg-background rounded-t-2xl shadow-2xl flex flex-col overflow-hidden outline-none",
              className,
            )}
            style={{
              maxHeight: maxHeightStyle,
              paddingTop: safeAreaTop
                ? "var(--zivo-safe-top-sheet)"
                : undefined,
              paddingBottom: "var(--zivo-safe-bottom,0px)",
            }}
            data-padding-top={safeAreaTop ? "var(--zivo-safe-top-sheet)" : ""}
            data-max-height={maxHeightStyle}
          >
            {/* Drag handle + optional header — this strip is the only drag region */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
              className={cn(
                "shrink-0 cursor-grab active:cursor-grabbing select-none",
                headerClassName,
              )}
            >
              {/* Animated grabber pill — pulses once on mount to hint draggability */}
              <div
                className="flex justify-center pt-2.5 pb-2"
                role="presentation"
                aria-hidden="true"
              >
                <motion.div
                  initial={{ width: 28, opacity: 0.5 }}
                  animate={{
                    width: [28, 44, 40],
                    opacity: [0.5, 0.9, 0.6],
                  }}
                  transition={{
                    duration: 1.4,
                    times: [0, 0.4, 1],
                    ease: "easeOut",
                  }}
                  className="h-1.5 rounded-full bg-muted-foreground/40"
                  title="Drag down to close"
                />
              </div>

              {(title || !hideCloseButton || headerAction) && (
                <div className="flex items-center gap-3 px-4 pb-2 min-h-[44px]">
                  <div className="flex-1 min-w-0">
                    {isStringTitle ? (
                      <h3
                        id={titleId}
                        className="text-base font-semibold text-foreground truncate"
                      >
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                  </div>
                  {headerAction}
                  {!hideCloseButton && !headerAction && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={
                        isStringTitle ? `Close ${title}` : "Close dialog"
                      }
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <X className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <span className="sr-only">Close</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable content. pan-y so vertical scrolling works without
                fighting the (header-only) drag gesture above. */}
            <div
              style={{ touchAction: "pan-y" }}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (positioning === "absolute" || typeof document === "undefined") {
    return overlay;
  }
  return createPortal(overlay, document.body);
}
