/**
 * CaptionEditDialog — edit the caption of a post you authored.
 *
 * Reuses the content-link safety gate so users can't sneak phishing URLs
 * past the validator on edit. Mention picker is wired so you can add
 * @-mentions as you type.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, Hash, Link2, Loader2, Pencil, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import MentionPicker from "@/components/social/MentionPicker";
import { applyMention, detectMention } from "@/lib/social/mentionText";

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
  const percentUsed = Math.min(100, Math.round((text.length / MAX_CAPTION) * 100));
  const mentionCount = (text.match(/(^|\s)@[\w.]+/g) ?? []).length;
  const hashtagCount = (text.match(/(^|\s)#[\w]+/g) ?? []).length;
  const linkCount = (text.match(/https?:\/\/\S+/g) ?? []).length;
  const saveSignal = tooLong
    ? { label: "Needs trim", detail: `${text.length - MAX_CAPTION} characters over limit`, width: "100%", tone: "danger" }
    : dirty
      ? { label: "Ready to save", detail: "Changes will keep reactions intact", width: `${Math.max(28, percentUsed)}%`, tone: "ready" }
      : { label: "No changes", detail: "Caption matches the live post", width: "18%", tone: "idle" };

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
            className="zivo-social-sheet-panel flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] p-0 sm:max-w-lg sm:rounded-[1.75rem]"
            initial={{ y: 400, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/25 shadow-[0_0_12px_hsl(var(--foreground)/0.12)] sm:hidden" />

              <div className="zivo-social-header-glass flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <Pencil className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold leading-tight">Edit caption</h3>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      Mentions and links are checked before saving
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  aria-label="Close caption editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 scrollbar-none">
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{dirty ? "Edited" : "Clean"}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Status</p>
                  </div>
                </div>
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{linkCount}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Links</p>
                  </div>
                </div>
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                    <AtSign className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{mentionCount}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Mentions</p>
                  </div>
                </div>
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                    <Hash className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{hashtagCount}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Tags</p>
                  </div>
                </div>
              </div>
              <div className="zivo-social-module-tile mb-3 rounded-[1.25rem] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                      {tooLong ? (
                        <Pencil className="h-4 w-4 text-red-500" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{saveSignal.label}</p>
                      <p className="truncate text-[11px] font-semibold text-muted-foreground">{saveSignal.detail}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                    saveSignal.tone === "danger"
                      ? "border-red-400/20 bg-red-400/10 text-red-600"
                      : saveSignal.tone === "ready"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-600"
                        : "border-primary/15 bg-primary/10 text-primary"
                  }`}>
                    {saveSignal.tone === "ready" ? "Safe" : saveSignal.tone === "danger" ? "Limit" : "Synced"}
                  </span>
                </div>
                <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      saveSignal.tone === "danger" ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500"
                    }`}
                    style={{ width: saveSignal.width }}
                  />
                </div>
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
                  rows={7}
                  className="zivo-social-sheet-input min-h-[180px] w-full resize-none rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-primary/40"
                />
                <span className="zivo-social-chip absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-black text-muted-foreground">
                  {dirty ? "Unsaved" : "Saved"}
                </span>
              </div>

              <div className={`zivo-social-module-tile mt-3 rounded-2xl px-3 py-2 text-xs ${tooLong ? "text-red-600" : "text-muted-foreground"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">Edits keep all reactions and comments.</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{text.length} / {MAX_CAPTION}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="zivo-social-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Checked on save
                  </span>
                  <span className="zivo-social-chip rounded-full px-2 py-1 text-[10px] font-bold">
                    {tooLong ? "Too long" : `${MAX_CAPTION - text.length} left`}
                  </span>
                </div>
                <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      tooLong ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500"
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="zivo-social-comment-footer flex gap-2 px-4 py-3" style={{ paddingBottom: "max(0.75rem, var(--zivo-safe-bottom,0px))" }}>
              <Button variant="outline" className="zivo-social-chip min-h-[44px] flex-1 rounded-full" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="min-h-[44px] flex-1 rounded-full"
                onClick={handleSave}
                disabled={!dirty || submitting || tooLong}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? "Save changes" : "Saved"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
