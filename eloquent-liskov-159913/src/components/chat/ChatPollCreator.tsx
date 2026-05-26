/**
 * ChatPollCreator — Telegram-style poll composer.
 * Question + 2-10 options + anonymous / multiple-choice toggles.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import X from "lucide-react/dist/esm/icons/x";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical";
import Plus from "lucide-react/dist/esm/icons/plus";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface PollDraft {
  question: string;
  options: string[];
  isAnonymous: boolean;
  isMultipleChoice: boolean;
}

interface ChatPollCreatorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (poll: PollDraft) => void | Promise<void>;
}

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_QUESTION = 255;
const MAX_OPTION = 100;

export default function ChatPollCreator({ open, onClose, onSubmit }: ChatPollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setIsAnonymous(true);
    setIsMultipleChoice(false);
    setSubmitting(false);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting]);

  const updateOption = (idx: number, value: string) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? value.slice(0, MAX_OPTION) : o)));
  };

  const removeOption = (idx: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions(prev => [...prev, ""]);
  };

  const filledOptions = options.map(o => o.trim()).filter(Boolean);
  const canSubmit =
    question.trim().length > 0 &&
    filledOptions.length >= MIN_OPTIONS &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        question: question.trim().slice(0, MAX_QUESTION),
        options: filledOptions,
        isAnonymous,
        isMultipleChoice,
      });
      reset();
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="poll-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[1500] bg-black/50 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            key="poll-sheet"
            initial={{ y: "100%", opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.7 }}
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-[1501] bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] sm:max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 16px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/30 bg-background/95 backdrop-blur-md rounded-t-3xl">
              <button type="button"
                onClick={close}
                className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-foreground" />
                <p className="text-sm font-bold">New Poll</p>
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-8 px-3 text-xs font-bold"
              >
                {submitting ? "Sending…" : "Send"}
              </Button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Question */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Question</p>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
                  placeholder="Ask anything…"
                  className="h-11 rounded-xl text-sm"
                  autoFocus
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-muted-foreground">{question.length}/{MAX_QUESTION}</span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Options</p>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="h-10 rounded-xl text-sm flex-1"
                      />
                      <button type="button"
                        onClick={() => removeOption(idx)}
                        disabled={options.length <= MIN_OPTIONS}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                          options.length <= MIN_OPTIONS
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        )}
                        aria-label={`Remove option ${idx + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {options.length < MAX_OPTIONS && (
                  <button type="button"
                    onClick={addOption}
                    className="w-full mt-1 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add option ({options.length}/{MAX_OPTIONS})
                  </button>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-1 rounded-xl border border-border/40 overflow-hidden">
                <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Anonymous voting</p>
                    <p className="text-[11px] text-muted-foreground">Hide who voted for which option</p>
                  </div>
                  <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                </label>
                <div className="h-px bg-border/40" />
                <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Multiple choice</p>
                    <p className="text-[11px] text-muted-foreground">Let people vote for more than one option</p>
                  </div>
                  <Switch checked={isMultipleChoice} onCheckedChange={setIsMultipleChoice} />
                </label>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
