/**
 * CreatePollModal — Create a poll or quiz post
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Plus, Trash2, BarChart3, HelpCircle, CheckCircle2, Sparkles, ListChecks, Send } from "lucide-react";
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
  const filledOptions = options.filter((option) => option.trim()).length;
  const hasQuestion = question.trim().length > 0;
  const readyToPost = hasQuestion && filledOptions >= 2;
  const optionSlotsLeft = 6 - options.length;
  const quizAnswerReady = !isQuiz || options[correctIndex]?.trim().length > 0;
  const canPost = readyToPost && quizAnswerReady;
  const readinessScore = (hasQuestion ? 34 : 0) + Math.min(50, filledOptions * 25) + (quizAnswerReady ? 16 : 0);
  const readinessSignal = canPost
    ? { label: "Ready to post", detail: isQuiz ? "Quiz answer is marked" : "Votes can start now", width: "100%" }
    : !hasQuestion
      ? { label: "Needs question", detail: "Add the prompt first", width: `${Math.max(12, readinessScore)}%` }
      : filledOptions < 2
        ? { label: "Needs options", detail: "Add at least two choices", width: `${Math.max(28, readinessScore)}%` }
        : { label: "Pick answer", detail: "Mark a filled quiz answer", width: `${Math.max(72, readinessScore)}%` };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
    setCorrectIndex((current) => {
      if (current === i) return 0;
      return current > i ? current - 1 : current;
    });
  };

  const submit = async () => {
    if (!user || !canPost) {
      toast.error(isQuiz && !quizAnswerReady ? "Mark a filled option as the correct answer" : "Need a question and at least 2 options");
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
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="zivo-social-sheet-panel flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="zivo-social-header-glass m-2 flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                {isQuiz ? <HelpCircle className="h-4 w-4 text-primary" /> : <BarChart3 className="h-4 w-4 text-primary" />}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold leading-tight">Create {isQuiz ? "Quiz" : "Poll"}</h2>
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                  {isQuiz ? "Mark the correct answer before posting" : "Collect votes from your followers"}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="zivo-social-icon-button flex h-9 w-9 items-center justify-center rounded-full" aria-label="Close poll creator">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2 scrollbar-none">
            <div className="grid grid-cols-3 gap-2">
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {isQuiz ? <HelpCircle className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{isQuiz ? "Quiz" : "Poll"}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Mode</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ListChecks className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{filledOptions}/6</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Options</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${canPost ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  <Send className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{canPost ? "Ready" : "Draft"}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Post</p>
                </div>
              </div>
            </div>

            {/* Type toggle */}
            <div className="zivo-social-module grid grid-cols-[1fr_auto] items-center gap-3 rounded-[1.25rem] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                  {isQuiz ? <HelpCircle className="h-4 w-4 text-primary" /> : <BarChart3 className="h-4 w-4 text-primary" />}
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">Quiz mode</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {isQuiz ? "One answer can be marked correct" : "Every option is a vote choice"}
                  </span>
                </div>
              </div>
              <Switch checked={isQuiz} onCheckedChange={setIsQuiz} aria-label="Toggle quiz mode" />
            </div>

            <div className="zivo-social-module-tile rounded-[1.25rem] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">{readinessSignal.label}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">{readinessSignal.detail}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                  canPost
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-600"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-600"
                }`}>
                  {canPost ? "Live ready" : "Draft"}
                </span>
              </div>
              <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    canPost ? "bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500" : "bg-gradient-to-r from-amber-300 via-orange-400 to-primary"
                  }`}
                  style={{ width: readinessSignal.width }}
                />
              </div>
            </div>

            {/* Question */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Question</span>
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  aria-label="Poll question"
                  className="zivo-social-sheet-input min-h-[96px] w-full resize-none rounded-2xl p-3 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                />
                <span className={`zivo-social-chip absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-black ${hasQuestion ? "text-primary" : "text-muted-foreground"}`}>
                  {hasQuestion ? "Question set" : "Needed"}
                </span>
              </div>
            </label>

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Options</p>
                <div className="flex items-center gap-1.5">
                  <span className="zivo-social-chip rounded-full px-2.5 py-1 text-[11px] font-bold">
                    {filledOptions}/6 filled
                  </span>
                  <span className="zivo-social-chip rounded-full px-2.5 py-1 text-[11px] font-bold">
                    {optionSlotsLeft} left
                  </span>
                </div>
              </div>
              {options.map((opt, i) => (
                <div key={i} className="zivo-social-sheet-row flex items-center gap-2 rounded-2xl px-2.5 py-2 transition-all focus-within:ring-1 focus-within:ring-primary/25">
                  {isQuiz && (
                    <button type="button"
                      onClick={() => setCorrectIndex(i)}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        correctIndex === i ? "border-emerald-500 bg-emerald-500" : "border-border"
                      )}
                      aria-label={`Mark option ${i + 1} correct`}
                    >
                      {correctIndex === i && <CheckCircle2 className="h-4 w-4 text-white" />}
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
                    aria-label={`${isQuiz && correctIndex === i ? "Correct answer, " : ""}Option ${i + 1}`}
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {opt.trim() && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="zivo-social-icon-button flex h-8 w-8 items-center justify-center rounded-full" aria-label={`Remove option ${i + 1}`}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button"
                  onClick={addOption}
                  className="zivo-social-module-tile flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all active:scale-[0.99]"
                >
                  <Plus className="h-4 w-4" /> Add option
                </button>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="zivo-social-comment-footer flex items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{isQuiz ? "Quiz" : "Poll"} preview</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {question.trim() || "Add a question to post"}
              </p>
            </div>
            <Button onClick={submit} disabled={submitting} className="min-h-[42px] rounded-full px-5">
              {submitting ? (
                "Posting..."
              ) : (
                <span className="inline-flex items-center gap-2">
                  {canPost ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {canPost ? "Post" : "Draft"}
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
