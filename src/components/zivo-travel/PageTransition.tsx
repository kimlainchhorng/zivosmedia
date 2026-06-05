import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * 3D page-enter transition for the Zivo Travel surface. Content fades, lifts,
 * and gently un-turns into place on mount, giving the "turn/move" feel between
 * pages. Wrap a travel page's root with it (no router changes needed). Static
 * under prefers-reduced-motion.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={reduce ? undefined : { transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
