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
            className="fixed inset-0 z-[1500] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-0 left-0 right-0 z-[1501] bg-background rounded-t-3xl shadow-2xl p-5"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 1.25rem)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-[16px] font-bold text-foreground">New Poll</h2>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Question</label>
              <input
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                maxLength={200}
                className="w-full px-4 py-3 rounded-2xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border/20"
              />
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Options</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-border/40 flex-shrink-0" />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      maxLength={100}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border/20"
                    />
                    {options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 10 && (
                <button type="button"
                  onClick={addOption}
                  className="mt-2 flex items-center gap-1.5 text-primary text-sm font-medium active:opacity-70 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Add option
                </button>
              )}
            </div>

            <button type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Send Poll
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
