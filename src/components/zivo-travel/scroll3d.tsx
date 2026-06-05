import { useRef } from "react";
import type { ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Reusable scroll-driven 3D primitives for the Zivo Travel surface.
 * Everything degrades to a static layout when prefers-reduced-motion is set.
 * Pair with <ZivoTravel3DProvider> (adds the `.zivo-travel-3d` scope class on
 * the travel host) and the `zt-*` utility classes from zivo-travel-3d.css.
 */

type Axis = "x" | "y";

/** Parallax: drifts children along an axis as the section scrolls past. */
export function Parallax({
  children,
  axis = "y",
  distance = 80,
  className,
}: {
  children: ReactNode;
  axis?: Axis;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const move = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : axis === "x" ? { x: move } : { y: move }}>
        {children}
      </motion.div>
    </div>
  );
}

/** ScrollTurn: rotates + lifts in 3D as it scrolls through view (turn/move feel). */
export function ScrollTurn({
  children,
  className,
  axis = "y",
  rotate = 14,
  lift = 60,
}: {
  children: ReactNode;
  className?: string;
  axis?: Axis;
  rotate?: number;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const turn = useTransform(p, [0, 0.5, 1], [rotate, 0, -rotate]);
  const y = useTransform(p, [0, 1], [lift, -lift]);
  const opacity = useTransform(p, [0, 0.18, 0.85, 1], [0.45, 1, 1, 0.55]);
  return (
    <div ref={ref} className={cn("zt-perspective", className)}>
      <motion.div
        style={
          reduce
            ? undefined
            : {
                rotateY: axis === "y" ? turn : 0,
                rotateX: axis === "x" ? turn : 0,
                y,
                opacity,
                transformStyle: "preserve-3d",
              }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Reveal: fades/slides into place on first scroll into view. */
export function Reveal({
  children,
  className,
  y = 26,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** TiltCard: pointer-driven 3D tilt. Flat under reduced motion. */
export function TiltCard({
  children,
  className,
  intensity = 12,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 150, damping: 16 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 150, damping: 16 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="zt-perspective">
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** HorizontalRail: snap-scrolling left/right strip with optional arrow controls. */
export function HorizontalRail({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} className={cn("zt-rail pb-4", className)} role="list" aria-label={ariaLabel}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll left"
        className="absolute -left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:grid"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        className="absolute -right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:grid"
      >
        ›
      </button>
    </div>
  );
}
