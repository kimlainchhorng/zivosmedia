/**
 * ReelsCoachmarks — first-run tutorial shown on /reels.
 * Dismissed forever once the user taps "Got it" (localStorage gate).
 * Designed to feel playful for new users without blocking their first scroll.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Clapperboard, Heart, Radio, Smile, Sparkles, VolumeX, X } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

const STORAGE_KEY = "zivo:reels-coachmarks-seen-v1";

export default function ReelsCoachmarks() {
  const [open, setOpen] = useState(false);
  const haptic = useHaptic();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      // localStorage may be unavailable (private mode) — never block the feed
    }
  }, []);

  const dismiss = () => {
    haptic("light");
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="zivo-social-coachmark-backdrop fixed inset-0 z-[1400] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="zivo-social-coachmark-panel relative w-full max-w-sm rounded-[1.75rem] p-6 text-white"
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close Reels tips"
              className="zivo-social-coachmark-close absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white/80 transition-all hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mb-5 text-center">
              <div className="zivo-social-coachmark-orb mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl">
                <Clapperboard className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                Quick tour
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight">Welcome to Reels</h2>
              <p className="mt-1 text-sm font-semibold text-white/62">A few quick gestures to play with</p>
            </div>

            <div className="zivo-social-coachmark-row mb-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="zivo-social-coachmark-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  <Radio className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/52">
                    Gesture guide
                  </span>
                  <span className="block truncate text-xs font-extrabold text-white">4 moves to start</span>
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                1 min
              </span>
            </div>

            <div className="zivo-social-coachmark-row mb-3 rounded-2xl px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-coachmark-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-xs font-extrabold text-white">Tour progress</span>
                    <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/52">
                      Four gestures, then your feed is ready
                    </span>
                  </span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                  4/4
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-300" />
              </div>
            </div>

            <ul className="space-y-3">
              <Hint step="01" icon={<ChevronUp className="h-5 w-5" aria-hidden="true" />} title="Swipe up" sub="See the next reel" />
              <Hint step="02" icon={<Heart className="h-5 w-5 text-foreground" aria-hidden="true" />} title="Double-tap" sub="Like the reel" />
              <Hint step="03" icon={<Smile className="h-5 w-5 text-amber-300" aria-hidden="true" />} title="Long-press the like" sub="Pick a reaction" />
              <Hint step="04" icon={<VolumeX className="h-5 w-5" aria-hidden="true" />} title="Tap the right edge" sub="Mute or unmute sound" />
            </ul>

            <button type="button"
              onClick={dismiss}
              className="zivo-social-coachmark-action mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full py-3 font-extrabold transition-transform active:scale-95"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hint({ step, icon, title, sub }: { step: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <li className="zivo-social-coachmark-row flex items-center gap-3 rounded-2xl px-3 py-3">
      <span className="zivo-social-coachmark-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="block text-xs font-semibold text-white/60">{sub}</span>
      </span>
      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-black tabular-nums text-white/52">
        {step}
      </span>
    </li>
  );
}
