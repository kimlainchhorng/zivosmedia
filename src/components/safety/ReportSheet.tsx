/**
 * ReportSheet — reusable bottom sheet for reporting any content type.
 *
 * Used by PPVPostDetail (PPV posts) and any future caller for paid DMs or
 * creator profiles. Predefined reasons + optional description.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2, Check } from "lucide-react";
import { useReportContent, type ReportableType } from "@/hooks/useReportContent";
import { cn } from "@/lib/utils";

const REASONS: { key: string; label: string }[] = [
  { key: "csam", label: "Sexual content involving minors" },
  { key: "non_consensual", label: "Non-consensual or leaked content" },
  { key: "impersonation", label: "Impersonation or stolen identity" },
  { key: "spam_scam", label: "Spam or scam" },
  { key: "harassment", label: "Harassment or threats" },
  { key: "underage", label: "Account is underage" },
  { key: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  contentType: ReportableType;
  contentId: string;
  reportedUserId?: string | null;
}

export default function ReportSheet({
  open,
  onClose,
  contentType,
  contentId,
  reportedUserId,
}: Props) {
  const { report, reporting } = useReportContent();
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setReason(null);
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      await report({ contentType, contentId, reportedUserId, reason, description });
      onClose();
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm m-4 rounded-2xl border border-border bg-card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Flag className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold">Report this content</h3>
                  <p className="text-[11px] text-muted-foreground">Our team reviews every report</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 -mr-1.5 rounded-full hover:bg-muted/50 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setReason(r.key)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 p-3 rounded-xl border-2 transition-colors text-left",
                      active
                        ? "border-rose-500 bg-rose-500/8"
                        : "border-border bg-background hover:border-rose-500/40"
                    )}
                  >
                    <span className="text-[13px] font-bold">{r.label}</span>
                    {active && <Check className="h-4 w-4 text-rose-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Additional context (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Anything else our team should know"
                className="mt-1 w-full p-3 rounded-xl border border-border bg-background text-[13px] outline-none focus:border-rose-500/60 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={reporting}
                className="flex-1 h-11 rounded-xl border border-border bg-card font-bold text-[13px] hover:bg-muted/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!reason || reporting}
                className={cn(
                  "flex-1 h-11 rounded-xl font-extrabold text-[13px] flex items-center justify-center gap-1.5 transition-colors",
                  reason && !reporting
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
              >
                {reporting && <Loader2 className="h-4 w-4 animate-spin" />}
                {reporting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
