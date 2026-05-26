/**
 * ReelsCoachmarks — first-run tutorial shown on /reels.
 * Dismissed forever once the user taps "Got it" (localStorage gate).
 * Designed to feel playful for new users without blocking their first scroll.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Heart from "lucide-react/dist/esm/icons/heart";
import Smile from "lucide-react/dist/esm/icons/smile";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import X from "lucide-react/dist/esm/icons/x";

const STORAGE_KEY = "zivo:reels-coachmarks-seen-v1";

export default function ReelsCoachmarks() {
  const [open, setOpen] = useState(false);

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
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-white/10 p-6 text-white shadow-2xl"
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
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-5">
              <h2 className="text-xl font-bold">Welcome to Reels</h2>
              <p className="text-sm text-white/60 mt-1">A few quick gestures to play with</p>
            </div>

            <ul className="space-y-3">
              <Hint icon={<ChevronUp className="h-5 w-5" />} title="Swipe up" sub="See the next reel" />
              <Hint icon={<Heart className="h-5 w-5 text-foreground" />} title="Double-tap" sub="Like the reel" />
              <Hint icon={<Smile className="h-5 w-5 text-amber-300" />} title="Long-press the like" sub="Pick a reaction" />
              <Hint icon={<VolumeX className="h-5 w-5" />} title="Tap the right edge" sub="Mute or unmute sound" />
            </ul>

            <button type="button"
              onClick={dismiss}
              className="mt-6 w-full rounded-full bg-white text-black font-bold py-3 active:scale-95 transition-transform"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hint({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
      <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-white/60">{sub}</span>
      </span>
    </li>
  );
}
