/**
 * useSwipeBack — iOS-style left-edge swipe-right-to-go-back gesture.
 *
 * Listens for a pointer that starts within `edgeWidth` px of the left edge
 * of the screen, then triggers `onSwipeBack` when the user drags right
 * past a distance/velocity threshold.
 *
 * Returns a setRef + the live drag offset (px) so callers can animate a
 * "peel" preview while dragging (typical iOS effect).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface SwipeBackOptions {
  /** Called when the user completes a back-swipe. */
  onSwipeBack: () => void;
  /** Width from the left edge in px considered "edge" — default 28. */
  edgeWidth?: number;
  /** Minimum drag distance (px) before the gesture activates. Default 40. */
  threshold?: number;
  /** Minimum drag velocity (px/s) shortcut for triggering. Default 600. */
  velocity?: number;
  /** Disable the gesture (e.g., in modals). Default false. */
  disabled?: boolean;
}

export function useSwipeBack({
  onSwipeBack,
  edgeWidth = 28,
  threshold = 40,
  velocity = 600,
  disabled = false,
}: SwipeBackOptions) {
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startT = useRef<number>(0);
  const pointerId = useRef<number | null>(null);
  const isHorizontal = useRef<boolean>(false);

  // Per-call ref to the active callback so unmounts don't strand stale fns.
  const onBackRef = useRef(onSwipeBack);
  useEffect(() => {
    onBackRef.current = onSwipeBack;
  }, [onSwipeBack]);

  const reset = useCallback(() => {
    setOffset(0);
    setActive(false);
    pointerId.current = null;
    isHorizontal.current = false;
  }, []);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Only start if pointer began at the very left edge.
      if (e.clientX > edgeWidth) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();
      pointerId.current = e.pointerId;
      isHorizontal.current = false;
      setActive(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      // Lock direction once the gesture has moved >8px in any axis.
      if (!isHorizontal.current && Math.hypot(dx, dy) > 8) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontal.current = true;
        } else {
          // Vertical scroll — abandon.
          reset();
          return;
        }
      }

      if (isHorizontal.current && dx > 0) {
        // Soft cap to screen width so the preview never overruns.
        const maxX = window.innerWidth;
        setOffset(Math.min(dx, maxX));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      const dx = e.clientX - startX.current;
      const dt = Math.max(1, performance.now() - startT.current);
      const v = (dx / dt) * 1000; // px/s
      const trigger = isHorizontal.current && (dx > threshold || v > velocity);
      reset();
      if (trigger) onBackRef.current();
    };

    const onPointerCancel = () => reset();

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [disabled, edgeWidth, threshold, velocity, reset]);

  return { offset, active };
}
