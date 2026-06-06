import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Travel-themed pull-to-refresh — pull down from the top to refresh, with a
 * gradient ring + Z indicator that matches the Zivo Travel 3D theme. Touch
 * gesture (mobile); reduced-motion safe. Gesture logic mirrors the app's
 * shared PullToRefresh; wrap a scrollable page's content with it.
 */
const THRESHOLD = 80;
const MAX_PULL = 120;
const SKIP_SELECTOR = "button, a, input, textarea, select, label, [role='button'], [data-disable-pull-to-refresh='true'] *";

export function TravelPullToRefresh({
  onRefresh,
  children,
  className,
  enabled = true,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  enabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const dropY = useTransform(pullY, [0, MAX_PULL], [0, MAX_PULL]);
  const ringOpacity = useTransform(pullY, [0, THRESHOLD * 0.4, THRESHOLD], [0, 0.6, 1]);
  const ringScale = useTransform(pullY, [0, THRESHOLD], [0.6, 1]);
  const ringRotate = useTransform(pullY, [0, MAX_PULL], [0, 320]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || refreshing) return;
    if ((e.target as HTMLElement | null)?.closest(SKIP_SELECTOR)) return;
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [enabled, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !pulling.current || refreshing) return;
    if (window.scrollY > 0) {
      pulling.current = false;
      pullY.set(0);
      return;
    }
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    pullY.set(Math.min(MAX_PULL, delta * 0.45)); // rubber-band
  }, [enabled, refreshing, pullY]);

  const onTouchEnd = useCallback(async () => {
    if (!enabled || !pulling.current) return;
    pulling.current = false;
    if (pullY.get() >= THRESHOLD && !refreshing) {
      animate(pullY, 64, { type: "spring", stiffness: 300, damping: 30 });
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

  return (
    <div className={cn("relative", className)}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2"
        style={{ y: dropY, opacity: ringOpacity, scale: ringScale }}
      >
        <div className="mt-2 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-zinc-950/70 shadow-[0_18px_40px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <motion.div
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{
              rotate: reduce ? 0 : ringRotate,
              background: "conic-gradient(from 0deg, #34d399, #0ea5e9, #7c3aed, #34d399)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            }}
            animate={refreshing && !reduce ? { rotate: 360 } : undefined}
            transition={refreshing ? { repeat: Infinity, ease: "linear", duration: 0.8 } : undefined}
          />
          <span className="absolute text-[11px] font-black text-white">Z</span>
        </div>
      </motion.div>

      <motion.div
        style={{ y: refreshing ? 64 : dropY }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default TravelPullToRefresh;
