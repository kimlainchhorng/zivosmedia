import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";

export const FEED_CARD_HYDRATION_ROOT_MARGIN = "1200px 0px";

type FeedCardHydration = {
  hydrationRef: RefCallback<HTMLDivElement>;
  shouldHydrate: boolean;
};

/**
 * Activates viewer-specific card reads shortly before the card reaches the
 * viewport. Once activated it stays active so scrolling away never resets
 * liked, saved, follow, reaction, or social-proof state.
 */
export function useFeedCardHydration(force = false): FeedCardHydration {
  const [hasEnteredHydrationRange, setHasEnteredHydrationRange] =
    useState(force);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const hydrationRef = useCallback<RefCallback<HTMLDivElement>>(
    (node) => {
      disconnect();
      if (!node || hasEnteredHydrationRange) return;

      if (force || typeof IntersectionObserver === "undefined") {
        setHasEnteredHydrationRange(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          setHasEnteredHydrationRange(true);
          observer.disconnect();
          if (observerRef.current === observer) observerRef.current = null;
        },
        {
          rootMargin: FEED_CARD_HYDRATION_ROOT_MARGIN,
          threshold: 0,
        },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [disconnect, force, hasEnteredHydrationRange],
  );

  useEffect(() => disconnect, [disconnect]);

  return {
    hydrationRef,
    shouldHydrate: force || hasEnteredHydrationRange,
  };
}
