/**
 * Scroll-to-Top Floating Button
 * Appears after scrolling down 400px, smooth scrolls back to top
 */
import { useState, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 6rem)" }}
      className={cn(
        "fixed right-4 z-50 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center transition-all duration-300 touch-manipulation active:scale-90 hover:scale-110",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
