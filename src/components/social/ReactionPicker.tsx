/**
 * ReactionPicker — Facebook-style emoji burst. Long-press the heart on a post
 * to open this row of 6 reactions; tap one to record the reaction.
 *
 * Visually anchored above the trigger; auto-dismisses on outside tap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptic } from "@/hooks/useHaptic";
import { POST_REACTIONS } from "@/lib/social/reactions";
import type { ReactionEmoji } from "@/lib/social/reactions";
import Radio from "lucide-react/dist/esm/icons/radio";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import MousePointerClick from "lucide-react/dist/esm/icons/mouse-pointer-click";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: ReactionEmoji) => void;
}

export default function ReactionPicker({ open, onClose, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const haptic = useHaptic();
  const [preview, setPreview] = useState(POST_REACTIONS[0]);
  const previewText = useMemo(() => `${preview.label} reaction selected`, [preview.label]);

  useEffect(() => {
    if (open) setPreview(POST_REACTIONS[0]);
  }, [open]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ scale: 0.4, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 12 }}
          transition={{ type: "spring", damping: 16, stiffness: 420, mass: 0.7 }}
          className="zivo-social-reaction-dock absolute -top-[7.15rem] right-0 z-50 min-w-[18.5rem] rounded-[1.75rem] px-2.5 pb-2 pt-2.5 sm:-top-[6.75rem] sm:min-w-[17rem] sm:px-2 sm:pb-1.5 sm:pt-2"
          role="menu"
          aria-label="Choose a reaction"
        >
          <span className="pointer-events-none absolute bottom-[-6px] right-5 h-3 w-3 rotate-45 border-b border-r border-white/70 bg-white/90 shadow-sm" />
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1.5">
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary/85">
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Quick react</span>
            </span>
            <span className="zivo-social-chip rounded-full px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
              {POST_REACTIONS.length} moods
            </span>
          </div>
          <div className="zivo-social-share-preview mb-2 flex items-center justify-between gap-3 rounded-2xl px-2.5 py-1.5">
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              <Radio className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">Tap a mood to send</span>
            </span>
            <span className="zivo-social-chip-active shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black">
              Live
            </span>
          </div>
          <div className="zivo-social-module-tile mb-2 flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="zivo-social-reaction-emoji flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl">
                {preview.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-foreground">{preview.label}</span>
                <span className="block truncate text-[10px] font-semibold text-muted-foreground">Hover, tab, or tap</span>
              </span>
            </span>
            <span className="zivo-social-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black text-muted-foreground">
              <MousePointerClick className="h-3 w-3 text-primary" aria-hidden="true" />
              Ready
            </span>
          </div>
          <span className="sr-only" aria-live="polite">{previewText}</span>
          <div className="flex items-end gap-1.5 sm:gap-1">
            {POST_REACTIONS.map(({ emoji, label }, index) => (
              <motion.button
                type="button"
                key={emoji}
                initial={{ y: 8, scale: 0.8, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 360, delay: index * 0.025 }}
                onFocus={() => setPreview({ emoji, label })}
                onMouseEnter={() => setPreview({ emoji, label })}
                onClick={(e) => {
                  e.stopPropagation();
                  haptic("medium");
                  onPick(emoji);
                  onClose();
                }}
                className="group relative flex h-[3.9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-2xl transition-all hover:-translate-y-1 hover:scale-105 hover:bg-white/55 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-12 sm:text-xl"
                role="menuitem"
                aria-label={label}
                title={label}
              >
                <span className="zivo-social-reaction-emoji flex h-9 w-9 items-center justify-center rounded-full transition-transform group-hover:scale-110 sm:h-8 sm:w-8">
                  {emoji}
                </span>
                <span className="max-w-10 truncate text-[9px] font-black leading-none text-muted-foreground opacity-85 sm:text-[8px]">
                  {label}
                </span>
                <span className="absolute inset-x-3 bottom-1 h-0.5 scale-x-0 rounded-full bg-primary/50 transition-transform group-hover:scale-x-100" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
