/**
 * OTAUpdateBanner — small floating banner shown when a newer web bundle has
 * been downloaded and is waiting to be applied. Lets the user reload now or
 * dismiss; either way the bundle is already queued for the next cold start
 * via `CapacitorUpdater.next()` (handled by useOTAUpdate).
 *
 * Mount once near the root of the app. Only renders on native platforms with
 * a queued update — invisible on web and on cold-loaded sessions.
 */
import { AnimatePresence, motion } from "framer-motion";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw";
import X from "lucide-react/dist/esm/icons/x";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { useState } from "react";
import type { ReactElement } from "react";

interface Props {
  pending: boolean;
  pendingVersion: string | null;
  message?: string | null;
  mandatory?: boolean;
  applyNow: () => Promise<void>;
  dismiss: () => void;
  dismissed: boolean;
}

export default function OTAUpdateBanner({
  pending,
  pendingVersion,
  message,
  mandatory = false,
  applyNow,
  dismiss,
  dismissed,
}: Props): ReactElement | null {
  const [applying, setApplying] = useState(false);

  if (!pending || (dismissed && !mandatory)) return null;

  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      await applyNow();
      // applyNow() reloads the WebView; if it didn't (silent failure),
      // reset so the button isn't stuck spinning.
      setApplying(false);
    } catch {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="ota-banner"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed left-2 right-2 z-[1700] mx-auto max-w-md pointer-events-none"
        style={{ top: "max(var(--zivo-safe-top,0px), 8px)" }}
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-lg shadow-primary/10 px-3 py-2.5 flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">
              {mandatory ? "Required update ready" : "Update ready"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {message || (pendingVersion ? `v${pendingVersion} downloaded - reload to apply now` : "A newer version is downloaded")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-full bg-primary text-primary-foreground text-[12px] font-bold active:scale-[0.97] transition disabled:opacity-60"
          >
            <RotateCw className={`h-3.5 w-3.5 ${applying ? "animate-spin" : ""}`} />
            {applying ? "Reloading…" : "Reload"}
          </button>
          {!mandatory && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss update banner"
              className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/40 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
