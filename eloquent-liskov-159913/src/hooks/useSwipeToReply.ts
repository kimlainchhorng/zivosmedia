/**
 * useSwipeToReply — pointer-based swipe-right gesture on message bubbles.
 *
 * Returns handlers + a translate-x value to spread on the bubble. Triggers
 * onTriggered when swipe distance crosses threshold (default 60px).
 */
import { useRef, useState, useCallback } from "react";

interface Options {
  onTriggered: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeToReply({ onTriggered, threshold = 60, enabled = true }: Options) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const triggered = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    startX.current = e.clientX;
    triggered.current = false;
  }, [enabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startX.current == null) return;
    const delta = Math.max(0, e.clientX - startX.current);
    const damped = Math.min(delta * 0.6, threshold * 1.5);
    setDx(damped);
    if (!triggered.current && delta > threshold) {
      triggered.current = true;
      onTriggered();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
    }
  }, [threshold, onTriggered]);

  const reset = useCallback(() => {
    startX.current = null;
    setDx(0);
    triggered.current = false;
  }, []);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: reset,
      onPointerCancel: reset,
      onPointerLeave: reset,
    },
    dx,
  };
}
