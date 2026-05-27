/**
 * CaptionEditDialog — edit the caption of a post you authored.
 *
 * Reuses the content-link safety gate so users can't sneak phishing URLs
 * past the validator on edit. Mention picker is wired so you can add
 * @-mentions as you type.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import MentionPicker, { detectMention, applyMention } from "@/components/social/MentionPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  initialCaption: string;
  onSave: (next: string) => Promise<void>;
}

const MAX_CAPTION = 2200;

export default function CaptionEditDialog({ open, onClose, initialCaption, onSave }: Props) {
  const [text, setText] = useState(initialCaption);
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setText(initialCaption);
  }, [open, initialCaption]);

  const trimmed = text.trim();
  const dirty = trimmed !== initialCaption.trim();
  const tooLong = text.length > MAX_CAPTION;

  async function handleSave() {
    if (!dirty || submitting || tooLong) return;
    if (!confirmContentSafe(trimmed, "post")) return;
    setSubmitting(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md md:max-w-lg rounded-t-3xl bg-background p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5 max-h-[90vh] overflow-y-auto"
            initial={{ y: 400, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(2rem, var(--zivo-safe-bottom,0px))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />

            <div className="mb-3 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Edit caption</h3>
            </div>

            <div className="relative">
              {/* @-mention autocomplete */}
              <MentionPicker
                query={mentionQuery}
                onSelect={(r) => {
                  if (!ref.current) return;
                  const caret = ref.current.selectionStart ?? text.length;
                  const handle = r.username || r.fullName || "";
                  if (!handle) return;
                  const next = applyMention(text, caret, handle);
                  setText(next.value);
                  setMentionQuery(null);
                  requestAnimationFrame(() => {
                    ref.current?.focus();
                    ref.current?.setSelectionRange(next.caret, next.caret);
                  });
                }}
                onClose={() => setMentionQuery(null)}
              />
              <Textarea
                ref={ref}
                autoFocus
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  const caret = e.target.selectionStart ?? e.target.value.length;
                  setMentionQuery(detectMention(e.target.value, caret));
                }}
                placeholder="Tell people what's going on..."
                rows={5}
                className="w-full resize-none text-base sm:text-sm focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className={`mt-1 flex items-center justify-between text-xs ${tooLong ? "text-red-600" : "text-muted-foreground"}`}>
              <span>Edits keep all reactions and comments.</span>
              <span className="tabular-nums">{text.length} / {MAX_CAPTION}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="flex-1 min-h-[44px]"
                onClick={handleSave}
                disabled={!dirty || submitting || tooLong}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
