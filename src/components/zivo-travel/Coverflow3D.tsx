import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Generic 3D coverflow carousel for the Zivo Travel surface — drag/swipe/turn
 * between cards, arrows, dots, optional autoplay (paused on hover/drag).
 * Reusable for flight/hotel/car/bus result decks. Reduced-motion safe.
 *
 * Tap the centre card -> onLaunch(item, index). Tap a side card -> selects it.
 */
type Slot = { x: string; z: number; rotateY: number; scale: number; opacity: number; zIndex: number };

function slotForOffset(rawOffset: number, total: number): Slot {
  // shortest signed distance from the centred index, in [-total/2, total/2]
  let rel = ((rawOffset % total) + total) % total;
  if (rel > total / 2) rel -= total;
  const dir = Math.sign(rel);
  const mag = Math.abs(rel);
  if (mag === 0) return { x: "0%", z: 60, rotateY: 0, scale: 1, opacity: 1, zIndex: 50 };
  if (mag === 1) return { x: `${dir * 58}%`, z: -130, rotateY: -dir * 32, scale: 0.84, opacity: 0.92, zIndex: 30 };
  return {
    x: `${dir * (58 + (mag - 1) * 10)}%`,
    z: -210 - (mag - 1) * 50,
    rotateY: -dir * 20,
    scale: Math.max(0.5, 0.7 - (mag - 2) * 0.08),
    opacity: Math.max(0, 0.4 - (mag - 2) * 0.18),
    zIndex: 20 - mag,
  };
}

export function Coverflow3D<T>({
  items,
  renderItem,
  onLaunch,
  onIndexChange,
  autoPlayMs = 0,
  height = "h-[440px] sm:h-[480px]",
  cardClassName = "w-[268px] sm:w-[320px]",
  className,
  ariaLabel = "Carousel",
}: {
  items: T[];
  renderItem: (item: T, isCenter: boolean, index: number) => ReactNode;
  onLaunch?: (item: T, index: number) => void;
  onIndexChange?: (index: number) => void;
  autoPlayMs?: number;
  height?: string;
  cardClassName?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const reduce = useReducedMotion();
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const select = (next: number) => {
    if (total === 0) return;
    const safe = ((next % total) + total) % total;
    setIndex(safe);
    onIndexChange?.(safe);
  };
  const go = (dir: -1 | 1) => select(index + dir);

  useEffect(() => {
    if (!autoPlayMs || reduce || paused || total <= 1) return;
    const timer = window.setInterval(() => select(index + 1), autoPlayMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayMs, reduce, paused, total, index]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.18;
    if (swipe < -70) go(1);
    else if (swipe > 70) go(-1);
  };

  if (total === 0) return null;

  return (
    <div
      className={cn("relative w-full [perspective:1600px]", height, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        drag={reduce ? false : "x"}
        dragSnapToOrigin
        dragElastic={0.16}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setPaused(true)}
        onDragEnd={handleDragEnd}
      >
        {items.map((item, i) => {
          const slot = slotForOffset(i - index, total);
          const isCenter = i === index;
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => (isCenter ? onLaunch?.(item, i) : select(i))}
              className={cn(
                "absolute inset-y-2 left-0 right-0 mx-auto overflow-hidden rounded-[2rem] border border-white/15 text-left shadow-[0_44px_90px_rgba(2,6,23,0.55)] will-change-transform",
                cardClassName,
              )}
              style={{ zIndex: slot.zIndex, transformStyle: "preserve-3d" }}
              animate={{ x: slot.x, z: slot.z, rotateY: slot.rotateY, scale: slot.scale, opacity: slot.opacity }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              aria-hidden={slot.opacity < 0.5}
              tabIndex={isCenter ? 0 : -1}
            >
              {renderItem(item, isCenter, i)}
            </motion.button>
          );
        })}
      </motion.div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
          >
            ›
          </button>
          <div className="absolute bottom-0 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2" role="tablist" aria-label={ariaLabel}>
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                aria-label={`Go to item ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-2 bg-white/40")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Coverflow3D;
