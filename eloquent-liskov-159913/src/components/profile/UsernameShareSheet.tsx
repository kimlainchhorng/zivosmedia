/**
 * UsernameShareSheet — share your @username deep link.
 *
 * Telegram-style share card: shows the canonical `<origin>/@<username>` URL,
 * with copy + native-share + QR fallback. Pass `username` from the caller.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

interface Props {
  open: boolean;
  username: string | null;
  profileId?: string | null;
  displayName?: string;
  onClose: () => void;
}

export default function UsernameShareSheet({ open, username, profileId, displayName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  // We expose `/u/<username>` as the canonical share URL — it's safe in
  // every URL parser and equivalent to `/@<username>` (both routes resolve
  // to the same page).
  const profileSlug = username || profileId || "";
  const url = profileSlug ? `${getPublicOrigin()}/u/${profileSlug}` : "";
  const profileLabel = username ? `@${username}` : displayName || "your profile";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy manually");
    }
  };

  const shareNative = async () => {
    if (!url) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: displayName ? `${displayName} on ZIVO` : `${profileLabel} on ZIVO`,
          text: `Find me on ZIVO: ${profileLabel}`,
          url,
        });
      } catch {
        // user cancelled or unsupported
      }
    } else {
      void copy();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Share profile"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,var(--zivo-safe-bottom,0px))]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Share your profile</h3>
              <button type="button"
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {!profileSlug ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Set a username first to get a shareable link.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/40 border border-border/30">
                  <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Your link</p>
                    <p className="text-sm font-semibold text-foreground truncate">{url}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button type="button"
                    onClick={copy}
                    className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/30 text-sm font-semibold text-foreground hover:bg-muted/50 active:scale-[0.98] transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button type="button"
                    onClick={shareNative}
                    className="h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground/80 mt-3 text-center">
                  Anyone with this link can find your public profile on ZIVO.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
