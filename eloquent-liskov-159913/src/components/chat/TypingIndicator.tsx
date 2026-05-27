/**
 * TypingIndicator — Animated dots showing someone is typing
 */
import { motion } from "framer-motion";

export default function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-1 bg-muted/60 rounded-2xl px-3 py-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      {name && <span className="text-xs text-muted-foreground">{name} is typing…</span>}
    </div>
  );
}
