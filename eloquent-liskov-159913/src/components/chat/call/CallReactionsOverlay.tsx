/**
 * CallReactionsOverlay — floats emojis up the screen for ~3s.
 */
import { AnimatePresence, motion } from "framer-motion";
import type { ReactionEvent } from "@/hooks/useLiveKitCall";

interface Props {
  reactions: ReactionEvent[];
}

export default function CallReactionsOverlay({ reactions }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          // Random horizontal offset so emojis don't stack
          const x = (hashString(r.id) % 70) + 15; // 15–85% from left
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{ opacity: 1, y: -300, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute bottom-24 select-none text-4xl drop-shadow-lg"
              style={{ left: `${x}%` }}
            >
              {r.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
