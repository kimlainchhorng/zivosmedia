/**
 * ZoomableImage — pointer-event wrapper that supports:
 *  - pinch-to-zoom (two pointers)
 *  - double-tap zoom toggle (1× ↔ 2.5×, centered on tap)
 *  - drag-to-pan when zoomed (single pointer)
 * Reports scale via onScaleChange so parents can disable carousel drag while zoomed.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  active?: boolean; // only the visible slide should react to gestures
  onScaleChange?: (scale: number) => void;
  className?: string;
  resetKey?: string | number; // change to force reset (e.g. slide index)
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_DIST = 24;

export function ZoomableImage({
  children, active = true, onScaleChange, className, resetKey,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDist = useRef(0);
  const startScale = useRef(1);
  const startTx = useRef(0);
  const startTy = useRef(0);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Reset on slide change / deactivate
  useEffect(() => {
    setScale(1); setTx(0); setTy(0);
    pointers.current.clear();
    dragStart.current = null;
  }, [resetKey, active]);

  useEffect(() => { onScaleChange?.(scale); }, [scale, onScaleChange]);

  const clampPan = useCallback((nx: number, ny: number, s: number) => {
    const el = wrapperRef.current;
    if (!el) return { x: nx, y: ny };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = ((s - 1) * w) / 2;
    const maxY = ((s - 1) * h) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      startDist.current = Math.hypot(b.x - a.x, b.y - a.y);
      startScale.current = scale;
      startTx.current = tx;
      startTy.current = ty;
    } else if (pointers.current.size === 1) {
      // Track for double-tap and pan
      const now = Date.now();
      const last = lastTap.current;
      if (last && now - last.t < DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_DIST) {
        // Double tap: toggle zoom
        if (scale > 1.05) {
          setScale(1); setTx(0); setTy(0);
        } else {
          const el = wrapperRef.current;
          const rect = el?.getBoundingClientRect();
          const newScale = 2.5;
          if (rect) {
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            const target = clampPan(-cx * (newScale - 1), -cy * (newScale - 1), newScale);
            setScale(newScale); setTx(target.x); setTy(target.y);
          } else {
            setScale(newScale);
          }
        }
        lastTap.current = null;
      } else {
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }
      if (scale > 1) {
        dragStart.current = { x: e.clientX - tx, y: e.clientY - ty };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && startDist.current > 0) {
      e.preventDefault();
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale.current * (dist / startDist.current)));
      const clamped = clampPan(startTx.current, startTy.current, next);
      setScale(next); setTx(clamped.x); setTy(clamped.y);
    } else if (pointers.current.size === 1 && scale > 1 && dragStart.current) {
      e.preventDefault();
      const next = clampPan(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y, scale);
      setTx(next.x); setTy(next.y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) startDist.current = 0;
    if (pointers.current.size === 0) dragStart.current = null;
  };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ touchAction: scale > 1 ? "none" : "pan-y", overflow: "hidden" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transition: pointers.current.size === 0 ? "transform 200ms ease-out" : "none",
          transformOrigin: "center center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
