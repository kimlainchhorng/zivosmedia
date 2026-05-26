/**
 * MessageReactionPicker — Telegram-style 16-emoji reaction picker
 */
import { motion } from "framer-motion";
import { useReactions } from "@/hooks/useReactions";

const QUICK_EMOJIS = ["❤️", "😂", "👍", "👎", "🔥", "🎉", "✨", "⭐", "😮", "😢", "🙏", "💯", "👏", "🤔", "😍", "💔"];

interface Props {
  messageId: string;
  onClose: () => void;
  onReacted?: () => void;
}

export default function MessageReactionPicker({ messageId, onClose, onReacted }: Props) {
  const { toggle } = useReactions(messageId);

  const handle = async (emoji: string) => {
    await toggle(emoji);
    onReacted?.();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="grid grid-cols-8 gap-1 bg-card border border-border/60 rounded-2xl px-3 py-2 shadow-xl max-w-[320px]"
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button type="button"
          key={emoji}
          onClick={() => handle(emoji)}
          className="hover:scale-125 active:scale-110 transition-transform text-2xl p-1 leading-none"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
