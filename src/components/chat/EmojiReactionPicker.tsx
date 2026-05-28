/**
 * EmojiReactionPicker — full "react with any emoji" picker.
 *
 * Opened from the "+" in a message's quick-react row. Shows recently-used
 * reactions first, then the shared categorized emoji set. Picking an emoji
 * calls onPick (which feeds the existing useReactions.toggle path).
 */
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { EMOJI_CATEGORIES, getRecentEmojis } from "@/config/emojiData";

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiReactionPicker({ onPick, onClose }: Props) {
  const recents = useMemo(() => getRecentEmojis(), []);

  const sections = useMemo<Array<[string, string[]]>>(() => {
    const base = Object.entries(EMOJI_CATEGORIES);
    return recents.length > 0 ? [["Recently used", recents], ...base] : base;
  }, [recents]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 420 }}
        role="dialog"
        aria-label="Pick a reaction"
        className="relative z-[1] m-3 w-full max-w-[360px] max-h-[60vh] overflow-y-auto rounded-3xl border border-border/40 bg-card shadow-2xl shadow-black/20 px-3 pb-4 pt-3"
      >
        <div className="sticky top-0 -mx-3 -mt-3 mb-2 flex items-center justify-between bg-card/95 px-4 py-2 backdrop-blur">
          <span className="text-sm font-bold">React</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        {sections.map(([name, emojis]) => (
          <div key={name} className="mb-3">
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {name}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojis.map((emoji, i) => (
                <button
                  type="button"
                  key={`${name}-${emoji}-${i}`}
                  onClick={() => onPick(emoji)}
                  className="flex h-9 items-center justify-center rounded-lg text-[20px] leading-none transition-transform hover:scale-125 hover:bg-muted/60 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>,
    document.body,
  );
}
