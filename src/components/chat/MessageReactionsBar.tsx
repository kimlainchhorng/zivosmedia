/**
 * MessageReactionsBar — Aggregated reaction chips under a chat bubble.
 *
 * Tap a chip to toggle your own reaction; long-press a chip to open the
 * "who reacted" detail sheet (Telegram-style).
 */
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReactions } from "@/hooks/useReactions";

export const REACTIONS_DETAIL_EVENT = "zivo:reactions-detail-open";

interface Props {
  messageId: string;
  align?: "left" | "right";
  initialReactions?: { emoji: string; count: number; reactedByMe: boolean }[];
}

export default function MessageReactionsBar({ messageId, align = "left", initialReactions }: Props) {
  const { reactions, toggle } = useReactions(messageId, initialReactions);
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  const startLongPress = () => {
    didLongPress.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      window.dispatchEvent(
        new CustomEvent<string>(REACTIONS_DETAIL_EVENT, { detail: messageId }),
      );
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
  };

  if (reactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.button
            key={r.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 400 }}
            onClick={() => {
              if (didLongPress.current) return;
              toggle(r.emoji);
            }}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent<string>(REACTIONS_DETAIL_EVENT, { detail: messageId }),
              );
            }}
            aria-label={`${r.emoji} reaction · ${r.count}. Long-press to see who reacted.`}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors active:scale-90 ${
              r.reactedByMe
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/60 border-border/50 text-foreground/80"
            }`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
