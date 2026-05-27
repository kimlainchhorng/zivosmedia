import { useEffect, useRef } from "react";

/**
 * useVisibleInterval — like setInterval, but pauses when the document is hidden
 * and resumes (with a fresh tick) when it becomes visible again. Saves CPU,
 * battery and network when users have the app in a background tab.
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number | null,
  options: { tickOnVisible?: boolean } = {},
) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs == null) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => cbRef.current(), delayMs);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (options.tickOnVisible) cbRef.current();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [delayMs, options.tickOnVisible]);
}
