/**
 * ScrollToTopFab — small floating button that appears once the user has
 * scrolled past ~1.5 viewports. Smooth-scrolls back to the top of the feed.
 * Sits above the mobile bottom nav.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpToLine, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";

const scrollRootToTop = (behavior: ScrollBehavior) => {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.scrollingElement?.scrollTo?.({ top: 0, left: 0, behavior });
  document.documentElement.scrollTo?.({ top: 0, left: 0, behavior });
  document.body.scrollTo?.({ top: 0, left: 0, behavior });
};

export default function ScrollToTopFab() {
  const [visible, setVisible] = useState(false);
  const [returning, setReturning] = useState(false);
  const [progress, setProgress] = useState(0);
  const returningTimer = useRef<number | null>(null);
  const haptic = useHaptic();
  const depthSignal = progress >= 70 ? "Deep feed" : progress >= 35 ? "Mid feed" : "Feed start";

  const handleScrollTop = () => {
    haptic("light");
    setReturning(true);
    if (returningTimer.current) window.clearTimeout(returningTimer.current);
    returningTimer.current = window.setTimeout(() => setReturning(false), 900);

    window.dispatchEvent(new CustomEvent("zivo-feed-scroll-top"));
    document.querySelector<HTMLElement>("[data-feed-page-top]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    scrollRootToTop("smooth");

    requestAnimationFrame(() => {
      if ((window.scrollY || document.scrollingElement?.scrollTop || 0) < 4) return;
      scrollRootToTop("auto");
    });
  };

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 1.5;
      const scrollTop = window.scrollY || document.scrollingElement?.scrollTop || 0;
      const scrollHeight = document.scrollingElement?.scrollHeight || document.documentElement.scrollHeight || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const maxScroll = Math.max(1, scrollHeight - viewportHeight);
      setVisible(scrollTop > threshold);
      setProgress(Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (returningTimer.current) window.clearTimeout(returningTimer.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label={returning ? "Returning to top" : "Scroll to top"}
          title={`${progress}% through feed`}
          aria-live="polite"
          initial={{ y: 16, scale: 0.92, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 16, scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
          onClick={handleScrollTop}
          className={cn(
            "zivo-social-scroll-top-fab group fixed right-4 z-[300] flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-2.5 text-foreground transition-all hover:-translate-y-0.5 active:scale-90 sm:h-[3.25rem] sm:min-w-[6.25rem] sm:px-3",
            returning && "border-primary/35 text-primary",
          )}
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 84px)" }}
        >
          <span
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[2px]"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${progress * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
            aria-hidden="true"
          >
            <span className="zivo-social-scroll-top-orb relative flex h-full w-full items-center justify-center rounded-full text-primary">
              <span className="absolute inset-0 rounded-full bg-primary/15 opacity-0 transition-opacity group-hover:opacity-100" />
              {returning && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              )}
              {returning ? <Check className="h-[18px] w-[18px]" /> : <ArrowUpToLine className="h-[18px] w-[18px]" />}
            </span>
          </span>
          <span className="hidden min-w-0 flex-col leading-none sm:flex">
            <span className="text-xs font-black">{returning ? "Going" : "Top"}</span>
            <span className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-primary/75">
              <Sparkles className="h-2.5 w-2.5" />
              {returning ? "Returning" : depthSignal}
            </span>
          </span>
          <span className="absolute -bottom-1.5 left-4 right-4 hidden h-1 overflow-hidden rounded-full bg-background/70 shadow-inner sm:block" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
              style={{ width: returning ? "100%" : `${Math.max(10, progress)}%` }}
            />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
