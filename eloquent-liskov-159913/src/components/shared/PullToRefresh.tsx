/**
 * PullToRefresh — Instagram-style pull-to-refresh with spinning loader
 * Wrap scrollable content; fires onRefresh when user pulls down from top.
 */
import {
  useRef,
  useState,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  mouseDragScroll?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 120;
const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
  "[data-disable-pull-to-refresh='true']",
  "[data-disable-pull-to-refresh='true'] *",
].join(", ");

export default function PullToRefresh({ onRefresh, children, className, enabled = true, mouseDragScroll = false }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef({
    active: false,
    dragging: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    pointerId: -1,
  });
  const suppressClickUntil = useRef(0);

  const spinnerY = useTransform(pullY, [0, MAX_PULL], [0, MAX_PULL]);
  const spinnerOpacity = useTransform(pullY, [0, THRESHOLD * 0.4, THRESHOLD], [0, 0.5, 1]);
  const spinnerScale = useTransform(pullY, [0, THRESHOLD], [0.5, 1]);
  const spinnerRotate = useTransform(pullY, [0, MAX_PULL], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || refreshing) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) return;
    const scrollTop = window.scrollY;
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [enabled, refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isPulling.current || refreshing) return;
    const scrollTop = window.scrollY;
    if (scrollTop > 0) {
      isPulling.current = false;
      pullY.set(0);
      return;
    }
    const delta = Math.max(0, e.touches[0].clientY - touchStartY.current);
    // Rubber band effect
    const dampened = Math.min(MAX_PULL, delta * 0.45);
    pullY.set(dampened);
  }, [enabled, refreshing, pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling.current) return;
    isPulling.current = false;
    const currentPull = pullY.get();

    if (currentPull >= THRESHOLD && !refreshing) {
      // Snap to loading position
      animate(pullY, 60, { type: "spring", stiffness: 300, damping: 30 });
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(pullY, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    } else {
      animate(pullY, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  }, [enabled, pullY, refreshing, onRefresh]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!mouseDragScroll || e.pointerType !== "mouse" || e.button !== 0 || refreshing) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) return;
    mouseDrag.current = {
      active: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      lastY: e.clientY,
      pointerId: e.pointerId,
    };
  }, [mouseDragScroll, refreshing]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mouseDrag.current;
    if (!mouseDragScroll || !drag.active || drag.pointerId !== e.pointerId) return;

    const totalX = e.clientX - drag.startX;
    const totalY = e.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(totalX, totalY) < 6) return;
      if (Math.abs(totalX) > Math.abs(totalY)) {
        mouseDrag.current.active = false;
        return;
      }
      drag.dragging = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    e.preventDefault();
    const deltaY = e.clientY - drag.lastY;
    window.scrollBy({ top: -deltaY, behavior: "auto" });
    drag.lastY = e.clientY;
  }, [mouseDragScroll]);

  const finishMouseDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mouseDrag.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    if (drag.dragging) {
      suppressClickUntil.current = Date.now() + 250;
      e.preventDefault();
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    mouseDrag.current = {
      active: false,
      dragging: false,
      startX: 0,
      startY: 0,
      lastY: 0,
      pointerId: -1,
    };
  }, []);

  const handleClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (Date.now() <= suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Spinner indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{
          y: spinnerY,
          opacity: spinnerOpacity,
          scale: spinnerScale,
          top: -40,
        }}
      >
        <div className="w-9 h-9 rounded-full bg-background shadow-lg border border-border/40 flex items-center justify-center">
          {refreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          ) : (
            <motion.div style={{ rotate: spinnerRotate }}>
              <Loader2 className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Scrollable content */}
      <motion.div
        ref={containerRef}
        style={{ y: refreshing ? 60 : spinnerY }}
        className="min-h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishMouseDrag}
        onPointerCancel={finishMouseDrag}
        onClickCapture={handleClickCapture}
      >
        {children}
      </motion.div>
    </div>
  );
}
