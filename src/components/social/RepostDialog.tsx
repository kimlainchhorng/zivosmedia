/**
 * RepostDialog — prompts the user to add an optional quote when reposting.
 * Tap "Repost" to share unchanged; tap "Quote" to add their own commentary.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat2, MessageSquare, Loader2, Quote, X, Sparkles, ShieldCheck, Zap, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (quoteText?: string) => Promise<void>;
  authorName?: string;
  postPreview?: string | null;
  alreadyReposted: boolean;
}

const MAX_QUOTE = 500;

export default function RepostDialog({
  open, onClose, onConfirm, authorName, postPreview, alreadyReposted,
}: Props) {
  const [quote, setQuote] = useState("");
  const [showQuote, setShowQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuote("");
      setShowQuote(false);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (withQuote: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(withQuote ? quote.trim() || undefined : undefined);
      onClose();
    } catch {
      // onConfirm owns the toast; keep the dialog open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };
  const quotePercent = Math.min(100, Math.round((quote.length / MAX_QUOTE) * 100));
  const quoteReady = quote.trim().length > 0;
  const quoteRemaining = MAX_QUOTE - quote.length;
  const shareModeLabel = showQuote ? (quoteReady ? "Quote ready" : "Drafting quote") : "Fast share";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="zivo-social-sheet-panel w-full max-w-md overflow-hidden rounded-t-[1.75rem] p-0 sm:max-w-lg sm:rounded-[1.75rem]"
            initial={{ y: 400, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/25 shadow-[0_0_12px_hsl(var(--foreground)/0.12)] sm:hidden" />
              <div className="zivo-social-header-glass flex items-center justify-between gap-3 rounded-[1.25rem] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    {showQuote ? <Quote className="h-5 w-5 text-primary" /> : <Repeat2 className="h-5 w-5 text-emerald-500" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold leading-tight">
                      {alreadyReposted ? "Remove repost" : showQuote ? "Quote repost" : "Repost"}
                    </h3>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      {alreadyReposted ? "Take this post off your profile" : showQuote ? "Add your thoughts before sharing" : "Share this post with your followers"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  aria-label="Close repost dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {alreadyReposted ? (
              <div className="px-4 pb-4 pt-3 text-center" style={{ paddingBottom: "max(1rem, var(--zivo-safe-bottom,0px))" }}>
                <span className="zivo-social-share-orb mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Repeat2 className="h-6 w-6 text-emerald-500" />
                </span>
                <h3 className="mt-3 text-base font-semibold">Remove repost?</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  This will remove the post from your profile and your followers' feeds.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" className="zivo-social-chip min-h-[44px] flex-1 rounded-full" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="min-h-[44px] flex-1 rounded-full"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove repost"}
                  </Button>
                </div>
              </div>
            ) : !showQuote ? (
              <div className="px-4 pb-4 pt-3" style={{ paddingBottom: "max(1rem, var(--zivo-safe-bottom,0px))" }}>
                <div className="zivo-social-module rounded-[1.25rem] px-4 py-4 text-center">
                  <span className="zivo-social-share-orb relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Repeat2 className="h-6 w-6 text-emerald-500" />
                    <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black leading-none text-white shadow-[0_8px_18px_rgba(16,185,129,0.28)]">
                      Live
                    </span>
                  </span>
                  <h3 className="mt-3 text-base font-semibold">Repost {authorName ? `@${authorName}` : ""}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a fast repost or add a quote.</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Zap className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">Fast</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Mode</p>
                    </div>
                  </div>
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Quote className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">Quote</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Option</p>
                    </div>
                  </div>
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">{postPreview ? "Ready" : "Clean"}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Preview</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    aria-label="Repost instantly without a quote"
                    className="zivo-social-module-tile flex min-h-[84px] flex-col items-start justify-between rounded-2xl px-3 py-3 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block text-sm font-black text-foreground">Fast repost</span>
                      <span className="block text-[11px] font-semibold text-muted-foreground">Share instantly</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuote(true)}
                    aria-label="Add a quote before reposting"
                    className="zivo-social-module-tile flex min-h-[84px] flex-col items-start justify-between rounded-2xl px-3 py-3 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-foreground">Quote repost</span>
                      <span className="block text-[11px] font-semibold text-muted-foreground">Add thoughts</span>
                    </span>
                  </button>
                </div>
                <div className="zivo-social-share-preview mt-3 rounded-2xl px-3 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/60 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Preview</span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {postPreview || "Share this with your followers."}
                  </p>
                </div>
                <div className="zivo-social-module-tile mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Radio className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        Share reach
                      </span>
                      <span className="block truncate text-xs font-black text-foreground">{shareModeLabel}</span>
                    </span>
                  </span>
                  <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
                    Followers
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={() => handleSubmit(false)} disabled={submitting} className="min-h-[46px] rounded-full flex items-center gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                    Repost
                  </Button>
                  <Button variant="outline" onClick={() => setShowQuote(true)} className="zivo-social-chip min-h-[46px] rounded-full flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Add quote
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 pt-3" style={{ paddingBottom: "max(1rem, var(--zivo-safe-bottom,0px))" }}>
                <div className="zivo-social-module mb-3 rounded-[1.25rem] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                      <Quote className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold">Add your thoughts</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional. Your quote appears above the original post.
                      </p>
                    </div>
                    <span className="zivo-social-chip shrink-0 rounded-full px-2 py-1 text-[10px] font-black text-muted-foreground">
                      {quote.length}
                    </span>
                  </div>
                </div>
                <Textarea
                  autoFocus
                  value={quote}
                  onChange={(e) => setQuote(e.target.value.slice(0, MAX_QUOTE))}
                  placeholder="Say something about this..."
                  rows={4}
                  className="zivo-social-sheet-input resize-none rounded-2xl text-sm"
                />
                <div className="zivo-social-module-tile mt-3 rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="line-clamp-1">
                        {quoteReady
                          ? `Quote ready for ${authorName ? `@${authorName}` : "this post"}`
                          : `Quote repost ${authorName ? `@${authorName}` : "this post"}`}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{quote.length} / {MAX_QUOTE}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="zivo-social-chip rounded-full px-2 py-1 text-[10px] font-bold">
                      {quoteReady ? "Commentary added" : "Optional quote"}
                    </span>
                    <span className="zivo-social-chip rounded-full px-2 py-1 text-[10px] font-bold">
                      {quoteRemaining} left
                    </span>
                  </div>
                  <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500 transition-[width] duration-300"
                      style={{ width: `${quotePercent}%` }}
                    />
                  </div>
                </div>
                <div className="zivo-social-share-preview mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Radio className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        Share reach
                      </span>
                      <span className="block truncate text-xs font-black text-foreground">{shareModeLabel}</span>
                    </span>
                  </span>
                  <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
                    Commentary
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="zivo-social-chip min-h-[44px] flex-1 rounded-full" onClick={() => setShowQuote(false)} disabled={submitting}>
                    Back
                  </Button>
                  <Button className="min-h-[44px] flex-1 rounded-full" onClick={() => handleSubmit(true)} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post quote"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
