/**
 * CreatorTypePicker — reusable modal for choosing creator workflow.
 *
 * Usage:
 *   <CreatorTypePicker open={open} onClose={() => setOpen(false)} onApplied={...} />
 *
 * Used in:
 *   - CreatorDashboardPage (initial pick + switch)
 *   - CreatorWelcomePage (post-signup onboarding)
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Video, Flame, CheckCircle2, Loader2, Lock, Heart, MessageSquare,
  Crown, Store, Gift, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatorType, type CreatorType } from "@/hooks/useCreatorType";

type PickerType = Exclude<CreatorType, null>;

interface CreatorTypePickerProps {
  open: boolean;
  onClose?: () => void;
  onApplied?: (type: PickerType) => void;
  /** If false, the close button is hidden (initial onboarding). */
  canSkip?: boolean;
}

const CONTENT_TAGS: { label: string; icon: typeof Video }[] = [
  { label: "Posts & Reels", icon: Video },
  { label: "Live", icon: Radio },
  { label: "Subscriptions", icon: Crown },
  { label: "Shop", icon: Store },
  { label: "Affiliates", icon: Gift },
];

const OF_TAGS: { label: string; icon: typeof Lock }[] = [
  { label: "Exclusive", icon: Lock },
  { label: "PPV", icon: Flame },
  { label: "Paid DMs", icon: MessageSquare },
  { label: "Tips", icon: Heart },
  { label: "Tiers", icon: Crown },
];

export default function CreatorTypePicker({
  open,
  onClose,
  onApplied,
  canSkip = true,
}: CreatorTypePickerProps) {
  const { creatorType, setCreatorType } = useCreatorType();
  const [pendingType, setPendingType] = useState<PickerType | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset transient state when modal opens
  useEffect(() => {
    if (open) {
      setPendingType(creatorType);
      setAgeConfirmed(creatorType === "of");
      setSaving(false);
    }
  }, [open, creatorType]);

  const handleApply = async () => {
    if (!pendingType) return;
    if (pendingType === "of" && !ageConfirmed) return;
    setSaving(true);
    try {
      await setCreatorType(pendingType);
      onApplied?.(pendingType);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-5 overflow-y-auto py-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm flex flex-col gap-5"
          >
            {/* Title */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-tight">
                Choose your creator type
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                Pick the workflow that matches how you create. You can switch anytime.
              </p>
            </div>

            {/* Content Creator card */}
            <button
              type="button"
              onClick={() => {
                setPendingType("content");
                setAgeConfirmed(false);
              }}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                pendingType === "content"
                  ? "border-primary bg-primary/8"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/4"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-[15px]">Content Creator</p>
                    {pendingType === "content" && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    Videos, posts, live streams, affiliate links, digital products & subscriptions. Open to all ages.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CONTENT_TAGS.map((t) => (
                      <span
                        key={t.label}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted/60 rounded-full px-2 py-0.5"
                      >
                        <t.icon className="w-2.5 h-2.5" />
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* OF Creator card */}
            <button
              type="button"
              onClick={() => {
                setPendingType("of");
                setAgeConfirmed(false);
              }}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                pendingType === "of"
                  ? "border-rose-500 bg-rose-500/8"
                  : "border-border/50 bg-card hover:border-rose-500/40 hover:bg-rose-500/4"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-[15px]">OF Creator</p>
                    <span className="text-[9px] font-extrabold bg-rose-500/15 text-rose-500 rounded-full px-2 py-0.5 uppercase tracking-wide">
                      18+
                    </span>
                    {pendingType === "of" && (
                      <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    OnlyFans-style workflow — exclusive paid content, PPV, tips, DMs and subscriber tiers. Adults only.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {OF_TAGS.map((t) => (
                      <span
                        key={t.label}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full px-2 py-0.5"
                      >
                        <t.icon className="w-2.5 h-2.5" />
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 18+ age confirmation */}
              <AnimatePresence>
                {pendingType === "of" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-rose-500/20">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgeConfirmed((v) => !v);
                          }}
                          className={cn(
                            "mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            ageConfirmed
                              ? "bg-rose-500 border-rose-500"
                              : "border-border"
                          )}
                        >
                          {ageConfirmed && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span
                          className="text-[12px] text-muted-foreground leading-relaxed"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgeConfirmed((v) => !v);
                          }}
                        >
                          I confirm I am 18 years of age or older and agree to ZIVO's adult content terms.
                        </span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Apply button */}
            <button
              type="button"
              disabled={
                saving ||
                !pendingType ||
                (pendingType === "of" && !ageConfirmed)
              }
              onClick={handleApply}
              className={cn(
                "w-full h-13 rounded-2xl font-extrabold text-[15px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-3.5",
                pendingType === "of" && ageConfirmed && !saving
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : pendingType === "content" && !saving
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving
                ? "Saving…"
                : pendingType === "of"
                ? "Apply OF Creator Workflow"
                : pendingType === "content"
                ? "Apply Content Creator"
                : "Select a creator type"}
            </button>

            {/* Skip — only when allowed AND user already has a type set */}
            {canSkip && creatorType && (
              <button
                type="button"
                onClick={onClose}
                className="text-center text-[13px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
