import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * NavigationProgressBar — slim 2px gradient bar that animates at the top of
 * the viewport whenever the route changes. Adds the perception of speed even
 * when the new route's lazy chunk takes 200-400ms to load.
 *
 * Behavior: bar fades in to 30% on route change, ticks to 80% over ~600ms,
 * jumps to 100% once a frame after the new route's first render, then fades
 * out. If a new navigation starts mid-tick, the bar resets cleanly.
 */
export default function NavigationProgressBar() {
  const { pathname, search } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const firstRender = useRef(true);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    // Don't flash the bar on the very first render.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Cancel any pending timers from a previous navigation.
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];

    setVisible(true);
    setProgress(8);
    timersRef.current.push(setTimeout(() => setProgress(35), 60));
    timersRef.current.push(setTimeout(() => setProgress(60), 240));
    timersRef.current.push(setTimeout(() => setProgress(80), 520));

    // After the next paint, jump to 100% and fade out.
    const finish = setTimeout(() => {
      setProgress(100);
      timersRef.current.push(
        setTimeout(() => {
          setVisible(false);
          // Reset width after the fade-out so the next animation starts clean.
          timersRef.current.push(setTimeout(() => setProgress(0), 220));
        }, 180),
      );
    }, 700);
    timersRef.current.push(finish);

    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 220ms ease" }}
    >
      <div
        className="h-full bg-ig-gradient"
        style={{
          width: `${progress}%`,
          transition:
            progress === 0
              ? "none"
              : "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 0 6px rgba(255, 76, 158, 0.45)",
        }}
      />
    </div>
  );
}
