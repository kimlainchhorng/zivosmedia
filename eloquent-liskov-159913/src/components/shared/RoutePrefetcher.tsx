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
  "/hotels": "@/pages/HotelLanding",
  "/cars": "@/pages/CarRentalLanding",
  "/rides": "@/pages/app/RideHubPage",
  "/rides/hub": "@/pages/app/RideHubPage",
  "/eats": "@/pages/EatsLanding",
  [SOCIAL_ROUTE_PATHS.feed]: "@/pages/ReelsFeedPage",
  [SOCIAL_ROUTE_PATHS.reels]: "@/pages/FeedPage",
  [SOCIAL_ROUTE_PATHS.chat]: "@/pages/ChatHubPage",
  [SOCIAL_ROUTE_PATHS.profile]: "@/pages/Profile",
  "/rent-car": "@/pages/CarRentalBooking",
  "/grocery": "@/pages/GroceryMarketplace",
  "/delivery": "@/pages/DeliveryPage",
  // Orphan-built destinations the feed empty state + library tiles route to:
  "/audio-rooms":     "@/pages/AudioRoomsPage",
  "/ama":             "@/pages/AMAPage",
  "/trending":        "@/pages/TrendingTopicsPage",
  "/friend-requests": "@/pages/FriendRequestsPage",
  "/streaks":         "@/pages/StreaksPage",
  "/coins":           "@/pages/CoinWalletPage",
} as const;

const PREFETCH_ROUTES: Record<string, () => Promise<unknown>> = {
  "/flights": () => import("@/pages/FlightLanding"),
  "/hotels": () => import("@/pages/HotelLanding"),
  "/cars": () => import("@/pages/CarRentalLanding"),
  "/rides": () => import("@/pages/app/RideHubPage"),
  "/rides/hub": () => import("@/pages/app/RideHubPage"),
  "/eats": () => import("@/pages/EatsLanding"),
  [SOCIAL_ROUTE_PATHS.feed]: () => import("@/pages/ReelsFeedPage"),
  // Bottom-nav targets — prefetched on touch-down so the chunk is in-memory
  // by the time the user's finger lifts and the click fires.
  [SOCIAL_ROUTE_PATHS.reels]: () => import("@/pages/FeedPage"),
  [SOCIAL_ROUTE_PATHS.chat]: () => import("@/pages/ChatHubPage"),
  [SOCIAL_ROUTE_PATHS.profile]: () => import("@/pages/Profile"),
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
  "/coins":           () => import("@/pages/CoinWalletPage"),
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

function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = PREFETCH_ROUTES[path];
  if (!loader) return;
  prefetched.add(path);
  const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));
  schedule(() => {
    loader().catch(() => {
      prefetched.delete(path);
    });
  });
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
    const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
    const handle = schedule(() => prefetchRoute(SOCIAL_ROUTE_PATHS.feed));
    return () => {
      if (typeof handle === "number" && window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      }
    };
  }, [location.pathname]);

  // When the user lands on /feed, warm the common next-hop destinations on
  // idle so empty-state pills + cross-link chips feel instant.
  useEffect(() => {
    if (location.pathname !== SOCIAL_ROUTE_PATHS.feed) return;
    const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 600));
    // Stagger across two idle ticks so we don't all-at-once compete with the
    // feed's own chunk loading or the initial post fetches.
    const handles: Array<number | unknown> = [];
    FEED_IDLE_PREFETCH.forEach((path, i) => {
      handles.push(schedule(() => {
        // Inner setTimeout so 4 prefetches are spread across ~400ms post-idle.
        setTimeout(() => prefetchRoute(path), i * 100);
      }));
    });
    return () => {
      if (window.cancelIdleCallback) {
        handles.forEach((h) => { if (typeof h === "number") window.cancelIdleCallback(h); });
      }
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
