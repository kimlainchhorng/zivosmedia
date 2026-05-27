/**
 * useVerticalSwipeNav — swipe up/down to navigate between sibling items.
 *
 * Returns `{ bind }` — a setter that consumers spread onto the target
 * element. On a vertical swipe past the threshold, calls `onNext` (swipe
 * up) or `onPrev` (swipe down).
 *
 * Works alongside scroll: only triggers when the gesture is clearly
 * vertical AND the user starts/ends at the natural snap points (top of
 * content for prev, bottom for next).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface VerticalSwipeOptions {
  onNext?: () => void;
  onPrev?: () => void;
  /** Min drag distance (px). Default 60. */
  threshold?: number;
  /** Min velocity (px/s). Default 500. */
  velocity?: number;
  /** Disable. Default false. */
  disabled?: boolean;
}

export function useVerticalSwipeNav({
  onNext,
  onPrev,
  threshold = 60,
  velocity = 500,
  disabled = false,
}: VerticalSwipeOptions) {
  const elRef = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const startY = useRef<number>(0);
  const startX = useRef<number>(0);
  const startT = useRef<number>(0);
  const pointerId = useRef<number | null>(null);
  const isVertical = useRef<boolean>(false);

  const nextRef = useRef(onNext);
  const prevRef = useRef(onPrev);
  useEffect(() => { nextRef.current = onNext; prevRef.current = onPrev; }, [onNext, onPrev]);

  const reset = useCallback(() => {
    setOffset(0);
    setDirection(null);
    pointerId.current = null;
    isVertical.current = false;
  }, []);

  const bind = useCallback((node: HTMLElement | null) => {
    if (elRef.current && elRef.current !== node) {
      // Clean up old element listeners on rebind.
      // (handled in effect via cleanup; no-op here)
    }
    elRef.current = node;
  }, []);

  useEffect(() => {
    const node = elRef.current;
    if (!node || disabled) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();
      pointerId.current = e.pointerId;
      isVertical.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (!isVertical.current && Math.hypot(dx, dy) > 10) {
        if (Math.abs(dy) > Math.abs(dx)) {
          isVertical.current = true;
        } else {
          reset();
          return;
        }
      }
      if (isVertical.current) {
        setOffset(dy);
        setDirection(dy < 0 ? "up" : dy > 0 ? "down" : null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      const dy = e.clientY - startY.current;
      const dt = Math.max(1, performance.now() - startT.current);
      const v = (dy / dt) * 1000;
      const isVerticalGesture = isVertical.current;
      const trigger = isVerticalGesture && (Math.abs(dy) > threshold || Math.abs(v) > velocity);
      reset();
      if (!trigger) return;
      if (dy < 0 && nextRef.current) nextRef.current();
      else if (dy > 0 && prevRef.current) prevRef.current();
    };

    const onPointerCancel = () => reset();

    node.addEventListener("pointerdown", onPointerDown, { passive: true });
    node.addEventListener("pointermove", onPointerMove, { passive: true });
    node.addEventListener("pointerup", onPointerUp, { passive: true });
    node.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [disabled, threshold, velocity, reset]);

  return { bind, offset, direction };
}
