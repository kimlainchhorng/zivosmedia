/**
 * SwipeNavHint — a one-time, non-blocking nudge that teaches the horizontal
 * tab-swipe gesture (see useTabSwipeNavigation). A swipe gesture is invisible,
 * so without a hint most users never discover it.
 *
 * Shows once ever (localStorage gate), only on the six bottom-nav tab paths,
 * only on mobile (the nav and the gesture are lg:hidden). It floats just above
 * the bottom nav, auto-dismisses after a few seconds, and also dismisses the
 * moment the user starts a real swipe — so it never gets in the way.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TAB_PATHS } from "@/hooks/useTabSwipeNavigation";

const STORAGE_KEY = "zivo:swipe-nav-hint-seen-v1";
const SHOW_DELAY = 900; // let the page settle before nudging
const AUTO_HIDE = 4200; // fade out on its own if untouched

export default function SwipeNavHint() {
  const { pathname } = useLocation();
  const onTabPath = TAB_PATHS.includes(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!onTabPath) return;
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      // private mode — treat as seen so we never nag
    }
    if (seen) return;

    const showTimer = window.setTimeout(() => setOpen(true), SHOW_DELAY);
    return () => window.clearTimeout(showTimer);
  }, [onTabPath]);

  // Dismiss forever the first time the hint is shown — one nudge is enough.
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    const dismissOnSwipe = () => setOpen(false);
    const hideTimer = window.setTimeout(() => setOpen(false), AUTO_HIDE);
    document.addEventListener("touchstart", dismissOnSwipe, { passive: true, once: true });
    return () => {
      window.clearTimeout(hideTimer);
      document.removeEventListener("touchstart", dismissOnSwipe);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="zivo-swipe-hint pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[1400] flex justify-center px-4 lg:hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          aria-hidden="true"
        >
          <span className="zivo-swipe-hint-pill flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-extrabold text-white shadow-lg">
            <ChevronLeft className="h-4 w-4 opacity-80" />
            Swipe to switch tabs
            <ChevronRight className="h-4 w-4 opacity-80" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
