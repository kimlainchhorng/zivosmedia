/**
 * PollCreatorSheet — Create a poll to send in chat.
 * Sends as a JSON message that ChatMessageBubble renders as a poll card.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import X from "lucide-react/dist/esm/icons/x";

interface PollCreatorSheetProps {
  open: boolean;
  onClose: () => void;
  onSendPoll: (question: string, options: string[]) => void;
}

export default function PollCreatorSheet({ open, onClose, onSendPoll }: PollCreatorSheetProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const canSend = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const handleSend = () => {
    if (!canSend) return;
    onSendPoll(question.trim(), options.filter((o) => o.trim()));
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] bg-black/45 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="zivo-chat-popover-glass fixed bottom-0 left-0 right-0 z-[1501] rounded-t-[1.75rem] border-t border-white/10 p-5 shadow-2xl"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 1.25rem)" }}
          >
            <div className="zivo-chat-header-glass -mx-5 -mt-5 mb-4 px-5 pb-4 pt-5">
              <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="zivo-chat-avatar-ring flex h-10 w-10 items-center justify-center rounded-2xl">
                  <BarChart2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Chat vote</p>
                  <h2 className="text-[17px] font-black text-foreground">New Poll</h2>
                </div>
              </div>
              <button type="button" onClick={onClose} className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center active:scale-90" aria-label="Close poll creator">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Question</label>
              <input
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                maxLength={200}
                className="zivo-chat-search w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Options</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-primary/25 bg-background/40" />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      maxLength={100}
                      className="zivo-chat-search flex-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="zivo-chat-icon-button flex h-8 w-8 flex-shrink-0 items-center justify-center active:scale-90" aria-label="Remove option">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 10 && (
                <button type="button"
                  onClick={addOption}
                  className="zivo-chat-chip mt-3 flex items-center gap-1.5 px-3 py-2 text-sm font-black text-primary active:opacity-70"
                >
                  <Plus className="h-4 w-4" /> Add option
                </button>
              )}
            </div>

            <button type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="zivo-chat-chip-active h-12 w-full text-sm font-black disabled:opacity-40 active:scale-[0.98]"
            >
              Send Poll
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
