import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";

/**
 * Maps routes to their lazy-loaded chunk files.
 * Prefetch happens only on user intent (hover/focus) — no eager
 * homepage auto-prefetch that competes with hero LCP bandwidth.
 */
export const PREFETCH_ROUTE_MODULES = {
  "/flights": "@/pages/FlightLanding",
  "/hotels": "@/pages/lodging/HotelsLandingPage",
  "/cars": "@/pages/Cars",
  "/rides": "@/pages/app/CanonicalRidePage",
  "/rides/hub": "@/pages/app/CanonicalRidePage",
  "/app/request-ride": "@/pages/app/CanonicalRidePage",
  "/rides/multi-stop": "@/pages/app/CanonicalRidePage",
  "/rides/track/:tripId": "@/pages/app/CanonicalRidePage",
  "/ride-quotes": "@/pages/app/CanonicalRidePage",
  "/eats": "@/pages/EatsLanding",
  [SOCIAL_ROUTE_PATHS.feed]: "@/pages/ReelsFeedPage",
  [SOCIAL_ROUTE_PATHS.reels]: "@/pages/FeedPage",
  [SOCIAL_ROUTE_PATHS.chat]: "@/pages/ChatHubPage",
  [SOCIAL_ROUTE_PATHS.profile]: "@/pages/Profile",
  "/more": "@/pages/MorePage",
  "/rent-car": "@/pages/CarRentalBooking",
  "/grocery": "@/pages/GroceryMarketplace",
  "/delivery": "@/pages/DeliveryPage",
  // Orphan-built destinations the feed empty state + library tiles route to:
  "/audio-rooms":     "@/pages/AudioRoomsPage",
  "/ama":             "@/pages/AMAPage",
  "/trending":        "@/pages/TrendingPage",
  "/friend-requests": "@/pages/FriendRequestsPage",
  "/streaks":         "@/pages/StreaksPage",
} as const;

const PREFETCH_ROUTES: Record<string, () => Promise<unknown>> = {
  "/flights": () => import("@/pages/FlightLanding"),
  "/hotels": () => import("@/pages/lodging/HotelsLandingPage"),
  "/cars": () => import("@/pages/Cars"),
  "/rides": () => import("@/pages/app/CanonicalRidePage"),
  "/rides/hub": () => import("@/pages/app/CanonicalRidePage"),
  "/app/request-ride": () => import("@/pages/app/CanonicalRidePage"),
  "/rides/multi-stop": () => import("@/pages/app/CanonicalRidePage"),
  "/rides/track/:tripId": () => import("@/pages/app/CanonicalRidePage"),
  "/ride-quotes": () => import("@/pages/app/CanonicalRidePage"),
  "/eats": () => import("@/pages/EatsLanding"),
  [SOCIAL_ROUTE_PATHS.feed]: () => import("@/pages/ReelsFeedPage"),
  // Bottom-nav targets — prefetched on touch-down so the chunk is in-memory
  // by the time the user's finger lifts and the click fires.
  [SOCIAL_ROUTE_PATHS.reels]: () => import("@/pages/FeedPage"),
  [SOCIAL_ROUTE_PATHS.chat]: () => import("@/pages/ChatHubPage"),
  [SOCIAL_ROUTE_PATHS.profile]: () => import("@/pages/Profile"),
  "/more": () => import("@/pages/MorePage"),
  // Home "More Services" tiles — same touch-down prefetch pattern.
  "/rent-car": () => import("@/pages/CarRentalBooking"),
  "/grocery": () => import("@/pages/GroceryMarketplace"),
  "/delivery": () => import("@/pages/DeliveryPage"),
  // Feed empty-state pills + LibraryPage top tiles. Warmed on idle when the
  // feed loads so tapping any pill is instant (chunk already in memory).
  "/audio-rooms":     () => import("@/pages/AudioRoomsPage"),
  "/ama":             () => import("@/pages/AMAPage"),
  "/trending":        () => import("@/pages/TrendingTopicsPage"),
  "/friend-requests": () => import("@/pages/FriendRequestsPage"),
  "/streaks":         () => import("@/pages/StreaksPage"),
};

// Routes to opportunistically warm when the user lands on /feed.
// Picked because they're (a) common next destinations from the feed empty
// state / quick-action chips and (b) cheap chunks. Triggered on idle so it
// doesn't compete with feed bandwidth.
const FEED_IDLE_PREFETCH: readonly string[] = [
  "/audio-rooms",
  "/ama",
  "/friend-requests",
  "/trending",
];

const prefetched = new Set<string>();

function resolvePrefetchRouteKey(path: string) {
  if (path.startsWith("/rides/track/")) return "/rides/track/:tripId";
  return path;
}

/**
 * Schedule idle work and return a canceller that actually matches how it was
 * scheduled.
 *
 * `requestIdleCallback` is cancelled with `cancelIdleCallback`, but the
 * `setTimeout` fallback is not — calling `cancelIdleCallback` on a timeout id
 * silently does nothing, so every effect below leaked its work. That is not
 * only a test artefact: browsers without `requestIdleCallback` (older iOS
 * Safari, which this app ships to through Capacitor) take the fallback path,
 * so navigating away never cancelled the prefetch there.
 */
function scheduleIdle(cb: () => void, timeoutMs: number): () => void {
  if (typeof window === "undefined") return () => {};

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(cb);
    return () => window.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(cb, timeoutMs);
  return () => window.clearTimeout(handle);
}

function prefetchRoute(path: string) {
  // Can fire from a timer that outlived the document (jsdom teardown, or a
  // navigation racing an idle callback), so never assume `window` is here.
  if (typeof window === "undefined") return;

  const routeKey = resolvePrefetchRouteKey(path);
  if (prefetched.has(routeKey)) return;
  const loader = PREFETCH_ROUTES[routeKey];
  if (!loader) return;
  prefetched.add(routeKey);
  scheduleIdle(() => {
    loader().catch(() => {
      prefetched.delete(routeKey);
    });
  }, 100);
}

/**
 * RoutePrefetcher: intent-based prefetch only.
 * - On homepage: prefetch /feed (the desktop redirect target) on idle.
 * - Provides hover/focus prefetch handler for nav links.
 */
export function useRoutePrefetch() {
  const location = useLocation();

  // Only prefetch the redirect target on homepage — not all top routes.
  useEffect(() => {
    if (location.pathname !== "/") return;
    return scheduleIdle(() => prefetchRoute(SOCIAL_ROUTE_PATHS.feed), 200);
  }, [location.pathname]);

  // When the user lands on /feed, warm the common next-hop destinations on
  // idle so empty-state pills + cross-link chips feel instant.
  useEffect(() => {
    if (location.pathname !== SOCIAL_ROUTE_PATHS.feed) return;
    // Stagger across two idle ticks so we don't all-at-once compete with the
    // feed's own chunk loading or the initial post fetches.
    const cancels: Array<() => void> = [];
    FEED_IDLE_PREFETCH.forEach((path, i) => {
      cancels.push(scheduleIdle(() => {
        // Inner timer so 4 prefetches are spread across ~400ms post-idle. It
        // used to be an untracked setTimeout, so once the idle callback fired
        // these four ran even after unmount, on every browser.
        const inner = window.setTimeout(() => prefetchRoute(path), i * 100);
        cancels.push(() => window.clearTimeout(inner));
      }, 600));
    });
    return () => {
      cancels.forEach((cancel) => cancel());
    };
  }, [location.pathname]);

  const handlePrefetch = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  return { prefetch: handlePrefetch };
}

export default function RoutePrefetcher() {
  useRoutePrefetch();
  return null;
}
