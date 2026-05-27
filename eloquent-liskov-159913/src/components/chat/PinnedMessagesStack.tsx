/**
 * PinnedMessagesStack — show pinned messages count, tap to view stack
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Pin from "lucide-react/dist/esm/icons/pin";
import X from "lucide-react/dist/esm/icons/x";

interface PinnedMsg {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

interface Props {
  count: number;
  messages?: PinnedMsg[];
}

export default function PinnedMessagesStack({ count, messages = [] }: Props) {
  const [showStack, setShowStack] = useState(false);

  if (count === 0) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowStack(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/25 active:scale-95 transition"
      >
        <Pin className="w-4 h-4" />
        {count} pinned {count === 1 ? "message" : "messages"}
      </motion.button>

      <AnimatePresence>
        {showStack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStack(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-4 max-h-[70dvh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
                <h3 className="font-bold text-base">Pinned Messages</h3>
                <button type="button"
                  onClick={() => setShowStack(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-muted/40 mb-2 border border-border/20">
                    <p className="text-[11px] font-semibold text-muted-foreground">{msg.sender}</p>
                    <p className="text-sm text-foreground mt-1 line-clamp-3">{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{msg.timestamp}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
