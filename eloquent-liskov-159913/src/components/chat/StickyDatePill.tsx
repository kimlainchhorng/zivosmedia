import { useEffect, useRef, useState } from "react";

interface Props {
  scrollRef: React.RefObject<HTMLElement | null>;
}

/**
 * Telegram-style floating date pill for chat timelines.
 *
 * Scans the scroll container for elements tagged `data-chat-date` (the
 * existing day separators) and surfaces the latest one that has scrolled
 * past the top, so the user always knows where they are in long history.
 * Fades in on scroll, fades out 1.5s after motion stops.
 *
 * Render this as a sibling positioned over the scroll container; it does
 * NOT need to be inside it. Pointer events pass through.
 */
export default function StickyDatePill({ scrollRef }: Props) {
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measurePos = () => {
      const r = el.getBoundingClientRect();
      setPos({ top: r.top + 8, left: r.left, width: r.width });
    };

    const compute = () => {
      const containerTop = el.getBoundingClientRect().top;
      const dividers = el.querySelectorAll<HTMLElement>("[data-chat-date]");
      if (dividers.length === 0) {
        setLabel(null);
        return;
      }
      let best: { top: number; label: string } | null = null;
      dividers.forEach((d) => {
        const top = d.getBoundingClientRect().top - containerTop;
        if (top <= 16) {
          if (!best || top > best.top) best = { top, label: d.dataset.chatDate || "" };
        }
      });
      if (!best) {
        const first = dividers[0];
        setLabel(first.dataset.chatDate || null);
      } else {
        setLabel(best.label);
      }
    };

    const onScroll = () => {
      measurePos();
      compute();
      setVisible(true);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setVisible(false), 1500);
    };

    measurePos();
    compute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measurePos);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measurePos);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [scrollRef]);

  if (!label || !pos) return null;
  return (
    <div
      className={`pointer-events-none fixed z-30 flex justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      aria-hidden
    >
      <span className="text-[11px] font-semibold text-foreground/85 bg-background/85 backdrop-blur-md px-3 py-1 rounded-full border border-border/30 shadow-sm">
        {label}
      </span>
    </div>
  );
}
