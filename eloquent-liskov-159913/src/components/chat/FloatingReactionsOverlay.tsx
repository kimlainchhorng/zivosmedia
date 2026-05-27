import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating-emoji animation when a reaction is added.
 *
 * Listens for `zivo:reaction-added` window events carrying { emoji, x, y }
 * and spawns a transient emoji that floats upward and fades. Multiple
 * reactions can stack — each is keyed and self-cleans after the animation.
 */
export const REACTION_ADDED_EVENT = "zivo:reaction-added";

interface ReactionDetail {
  emoji: string;
  x: number;
  y: number;
}

interface ActiveReaction extends ReactionDetail {
  id: number;
}

let nextId = 1;

export default function FloatingReactionsOverlay() {
  const [active, setActive] = useState<ActiveReaction[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ReactionDetail>).detail;
      if (!detail || typeof detail.emoji !== "string") return;
      const id = nextId++;
      setActive((prev) => [...prev, { ...detail, id }]);
      window.setTimeout(() => {
        setActive((prev) => prev.filter((r) => r.id !== id));
      }, 1100);
    };
    window.addEventListener(REACTION_ADDED_EVENT, handler as EventListener);
    return () => window.removeEventListener(REACTION_ADDED_EVENT, handler as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[150] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {active.map((r) => (
          <motion.span
            key={r.id}
            initial={{ x: r.x - 12, y: r.y - 12, opacity: 0, scale: 0.4 }}
            animate={{
              x: r.x - 12 + (Math.random() * 30 - 15),
              y: r.y - 120,
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.4, 1.2, 1],
            }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.4, 1], times: [0, 0.15, 0.7, 1] }}
            className="absolute text-3xl select-none"
            style={{ left: 0, top: 0 }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Fire the floating animation from anywhere. */
export function emitReactionAdded(detail: ReactionDetail) {
  window.dispatchEvent(new CustomEvent<ReactionDetail>(REACTION_ADDED_EVENT, { detail }));
}
