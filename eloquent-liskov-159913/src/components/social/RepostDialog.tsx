/**
 * RepostDialog — prompts the user to add an optional quote when reposting.
 * Tap "Repost" to share unchanged; tap "Quote" to add their own commentary.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat2, MessageSquare, Loader2 } from "lucide-react";
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md md:max-w-lg rounded-t-3xl bg-background p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5 max-h-[90vh] overflow-y-auto"
            initial={{ y: 400, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(2rem, var(--zivo-safe-bottom,0px))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />

            {alreadyReposted ? (
              <div className="text-center">
                <Repeat2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-2 text-base font-semibold">Remove repost?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will remove the post from your profile and your followers' feeds.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove repost"}
                  </Button>
                </div>
              </div>
            ) : !showQuote ? (
              <div className="text-center">
                <Repeat2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-2 text-base font-semibold">Repost {authorName ? `@${authorName}` : ""}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {postPreview || "Share this with your followers."}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button onClick={() => handleSubmit(false)} disabled={submitting} className="flex items-center gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                    Repost
                  </Button>
                  <Button variant="outline" onClick={() => setShowQuote(true)} className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Add quote
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-semibold mb-1">Add your thoughts</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Optional. Your quote appears above the original post.
                </p>
                <Textarea
                  autoFocus
                  value={quote}
                  onChange={(e) => setQuote(e.target.value.slice(0, MAX_QUOTE))}
                  placeholder="Say something about this..."
                  rows={4}
                  className="resize-none"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {quote.length} / {MAX_QUOTE}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowQuote(false)} disabled={submitting}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => handleSubmit(true)} disabled={submitting}>
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
