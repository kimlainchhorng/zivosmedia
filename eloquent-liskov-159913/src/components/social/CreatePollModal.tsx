/**
 * CreatePollModal — Create a poll or quiz post
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Plus, Trash2, BarChart3, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreatePollModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreatePollModal({ open, onClose, onCreated }: CreatePollModalProps) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isQuiz, setIsQuiz] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!user || !question.trim() || options.filter((o) => o.trim()).length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("poll_posts").insert({
      user_id: user.id,
      question: question.trim(),
      poll_type: isQuiz ? "quiz" : "poll",
      options: options.filter((o) => o.trim()).map((text) => ({ text, votes: 0 })),
      correct_option_index: isQuiz ? correctIndex : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to create poll");
    } else {
      toast.success(isQuiz ? "Quiz posted!" : "Poll posted!");
      onCreated?.();
      onClose();
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h2 className="text-lg font-semibold">Create {isQuiz ? "Quiz" : "Poll"}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Type toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2">
                {isQuiz ? <HelpCircle className="h-4 w-4 text-primary" /> : <BarChart3 className="h-4 w-4 text-primary" />}
                <span className="text-sm font-medium">Quiz mode</span>
              </div>
              <Switch checked={isQuiz} onCheckedChange={setIsQuiz} />
            </div>

            {/* Question */}
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full p-3 rounded-xl bg-muted/30 border border-border/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
            />

            {/* Options */}
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {isQuiz && (
                    <button type="button"
                      onClick={() => setCorrectIndex(i)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        correctIndex === i ? "border-emerald-500 bg-emerald-500" : "border-border"
                      )}
                    >
                      {correctIndex === i && <span className="text-white text-xs">✓</span>}
                    </button>
                  )}
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-full hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:border-primary/40 w-full"
                >
                  <Plus className="h-4 w-4" /> Add option
                </button>
              )}
            </div>

            {/* Submit */}
            <Button onClick={submit} disabled={submitting} className="w-full rounded-xl">
              {submitting ? "Posting..." : `Post ${isQuiz ? "Quiz" : "Poll"}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
