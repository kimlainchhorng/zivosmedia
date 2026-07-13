/**
 * UsernameShareSheet - share your @username deep link.
 *
 * Telegram-style share card: shows the canonical `<origin>/u/<username>` URL,
 * with copy, native-share, and QR fallback. Pass `username` from the caller.
 */
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import X from "lucide-react/dist/esm/icons/x";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import QrCode from "lucide-react/dist/esm/icons/qr-code";
import UserRound from "lucide-react/dist/esm/icons/user-round";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { copyText } from "@/lib/native/clipboard";
import { shareContent } from "@/lib/native/share";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  username: string | null;
  profileId?: string | null;
  displayName?: string;
  onClose: () => void;
}

export default function UsernameShareSheet({ open, username, profileId, displayName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  // We expose `/u/<username>` as the canonical share URL because it is safe
  // in every URL parser and resolves through the public username route.
  const url = username
    ? `${getPublicOrigin()}/u/${encodeURIComponent(username)}`
    : profileId
      ? `${getPublicOrigin()}/user/${encodeURIComponent(profileId)}`
      : "";
  const profileLabel = username ? `@${username}` : displayName || "your profile";

  const copy = async () => {
    if (!url) return;
    try {
      await copyText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
      toast.error("Couldn't copy automatically. The link is selected.");
    }
  };

  const shareNative = async () => {
    if (!url) return;
    try {
      const result = await shareContent({
        title: displayName ? `${displayName} on ZIVO` : `${profileLabel} on ZIVO`,
        text: `Find me on ZIVO: ${profileLabel}`,
        url,
        dialogTitle: "Share profile",
      });
      if (!result.shared && !result.cancelled) {
        await copy();
      }
    } catch {
      await copy();
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
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full overflow-hidden rounded-t-[1.75rem] border border-border/60 bg-background shadow-2xl sm:max-w-md sm:rounded-[1.75rem]"
          >
            <div className="px-4 pt-2">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border/45 px-5 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-tight text-foreground">Share profile</h3>
                  <p className="truncate text-xs font-medium text-muted-foreground">{profileLabel}</p>
                </div>
              </div>
              <button type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(88dvh-var(--zivo-safe-bottom,0px))] overflow-y-auto px-5 py-5 pb-[max(1.25rem,var(--zivo-safe-bottom,0px))]">
              {!url ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-foreground">No profile link yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Set a username first to get a shareable link.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="relative rounded-[1.65rem] border border-border/55 bg-gradient-to-b from-muted/45 to-background p-3 shadow-[0_10px_30px_hsl(var(--foreground)/0.08)]">
                      <div
                        className="rounded-[1.25rem] bg-white p-3 ring-1 ring-black/5"
                        aria-label="Profile QR code"
                      >
                        <QRCodeSVG
                          value={url}
                          size={168}
                          level="H"
                          includeMargin={false}
                          fgColor="#0f172a"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/55 bg-card p-3 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                      <QrCode className="h-3.5 w-3.5" />
                      Public profile link
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-muted/45 px-3 py-2.5">
                      <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        ref={linkInputRef}
                        readOnly
                        value={url}
                        aria-label="Profile link"
                        className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none selection:bg-primary/20"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button type="button"
                      onClick={copy}
                      className={cn(
                        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition active:scale-[0.98]",
                        copied
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-border/60 bg-card text-foreground hover:bg-muted/45"
                      )}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button type="button"
                      onClick={shareNative}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-sm transition hover:opacity-90 active:scale-[0.98]"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                    Anyone with this link or QR code can open your public ZIVO profile.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
