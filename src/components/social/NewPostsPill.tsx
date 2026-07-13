/**
 * NewPostsPill — floating "N new posts" badge that animates in when realtime
 * delivers new feed content while the user is scrolled mid-feed.
 */
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpToLine, Radio, Sparkles, Zap } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

interface Props {
  count: number;
  onClick: () => void;
}

function formatCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
}

export default function NewPostsPill({ count, onClick }: Props) {
  const haptic = useHaptic();
  const compactCount = formatCount(count);
  const label = `${compactCount} new ${count === 1 ? "post" : "posts"}`;
  const shortLabel = `${compactCount} new`;
  const syncState = count > 9 ? "Hot drop" : count > 1 ? "Synced" : "Fresh";
  const refreshSignal = count > 9
    ? { label: "Live wave", width: "100%" }
    : count > 1
      ? { label: "Fresh stack", width: `${Math.min(84, Math.max(42, count * 12))}%` }
      : { label: "Single update", width: "28%" };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={() => { haptic("medium"); onClick(); }}
          initial={{ y: -36, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -36, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 18, stiffness: 360 }}
          className="zivo-social-new-posts-pill group absolute left-1/2 z-50 flex min-h-[46px] -translate-x-1/2 items-center gap-2 rounded-full px-2.5 py-2 text-sm font-extrabold text-foreground transition-all hover:-translate-y-0.5 active:scale-95 sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-[13px] md:text-sm"
          style={{ top: "calc(var(--zivo-safe-top,0px) + 80px)" }}
          aria-label={`Show ${count} new ${count === 1 ? "post" : "posts"} from the live feed`}
          aria-live="polite"
        >
          <span className="zivo-social-new-posts-orb relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary">
            <span className="absolute inset-0 rounded-full bg-primary/15 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-background" aria-hidden />
            <ArrowUpToLine className="relative h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            <span className="mt-1 hidden items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary/80 sm:flex">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              Live refresh ready
            </span>
          </span>
          <span className="zivo-social-share-preview hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary sm:flex">
            <Zap className="h-3 w-3" aria-hidden="true" />
            {syncState}
          </span>
          <span className="zivo-social-chip flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-black tabular-nums text-primary" aria-hidden="true">
            +{compactCount}
          </span>
          <span className="absolute -bottom-2 left-6 right-6 hidden h-1 overflow-hidden rounded-full bg-background/65 shadow-inner sm:block" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
              style={{ width: refreshSignal.width }}
            />
          </span>
          <span className="sr-only">{refreshSignal.label}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
