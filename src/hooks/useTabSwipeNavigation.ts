/**
 * useTabSwipeNavigation — Instagram/TikTok-style horizontal swipe across the
 * six bottom-nav tabs.
 *
 *   Home ⇄ Feed ⇄ Reels ⇄ Ride ⇄ Chat ⇄ Profile
 *   /      /feed   /reels   /rides/hub  /chat  /profile
 *
 * Swipe left  → next tab   (Home → … → Profile)
 * Swipe right → previous   (Profile → … → Home)
 *
 * Two swipe surfaces, different reach:
 *  - The bottom nav bar [data-zivo-mobile-nav] swipes on ALL six tabs. It sits
 *    apart from every page's own gestures, so it's always a safe place to flick
 *    between tabs (a tap still taps; only a real horizontal flick navigates).
 *  - Page CONTENT only originates a swipe on `/` and `/feed`. The other tabs own
 *    their own gestures (Reels = TikTok pager, Ride = map pan, Chat = list,
 *    Profile = scroll), so their content never starts a tab-swipe — use the nav.
 *
 * Gated targets are safe to navigate to directly: /chat and /rides/hub are
 * ProtectedRoute (redirect to login when signed out, same as tapping) and
 * /profile renders a guest preview. Listeners attach only on the six tab paths.
 *
 * Conflicts deliberately avoided:
 *  - Feed sub-tab swipe (For You / Friends / …) lives on the sticky header
 *    [data-testid="feed-sticky-header"] — excluded so it keeps switching tabs.
 *  - Image carousels [data-swipe-grab] and any horizontally-scrollable
 *    container (chip rails, stories tray) — excluded via a live scroll check.
 *  - Inputs, sliders, links, buttons, the nav itself, and the left/right
 *    screen edges (OS back + SwipeBackContainer).
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tap } from "../lib/haptics";

const ORDER = ["/", "/feed", "/reels", "/rides/hub", "/chat", "/profile"] as const;
type TabPath = (typeof ORDER)[number];

/** The six bottom-nav tab paths, shared with the swipe-discoverability hint. */
export const TAB_PATHS: readonly string[] = ORDER;

/** Paths whose page CONTENT may start a tab-swipe. Reels content is excluded —
 *  it owns its own gestures — but the nav bar still swipes there (see onStart). */
const CONTENT_ORIGIN_PATHS = new Set<string>(["/", "/feed"]);

/** The floating bottom nav is a swipe surface on every tab path. */
const NAV_SELECTOR = "[data-zivo-mobile-nav]";

const EXCLUDE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable]",
  "[role='slider']",
  "[role='tablist']",
  "[role='tab']",
  "[data-swipe-grab]",
  "[data-no-tab-swipe]",
  '[data-testid="feed-sticky-header"]',
].join(",");

const MIN_DX = 60; // min horizontal travel (px) to count as a swipe
const DOMINANCE = 1.6; // |dx| must exceed |dy| * this (mostly-horizontal)
const EDGE_GUARD = 24; // ignore touches that start near either screen edge
const MAX_DURATION = 700; // ms — longer than this is a scroll, not a flick

type SwipeDir = "left" | "right";

/** In-flight directional slides, shared across overlapping swipes so the
 *  `data-swipe-nav` attribute is only removed once the LAST one settles. */
let activeSlideTransitions = 0;

/**
 * Navigate with a directional page-slide via the View Transitions API when the
 * browser supports it (Chrome/Safari) and the user hasn't asked for reduced
 * motion. Everywhere else this is an instant navigate — the gesture still
 * works, it just doesn't animate. The `data-swipe-nav` attribute on <html>
 * drives the slide direction in CSS (see index.css) and is cleared afterward.
 */
function navigateWithSlide(
  navigate: (to: string) => void,
  to: string,
  dir: SwipeDir,
): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      finished: Promise<void>;
      ready?: Promise<void>;
      updateCallbackDone?: Promise<void>;
    };
  };
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!doc.startViewTransition || reduceMotion) {
    navigate(to);
    return;
  }

  const root = document.documentElement;
  // Set the LATEST direction and count this slide in. A rapid second swipe
  // overwrites `dir` (so it animates the new direction) without the first
  // transition's cleanup yanking the attribute mid-animation.
  root.dataset.swipeNav = dir;
  activeSlideTransitions += 1;
  const release = () => {
    activeSlideTransitions = Math.max(0, activeSlideTransitions - 1);
    if (activeSlideTransitions === 0) root.removeAttribute("data-swipe-nav");
  };
  try {
    const transition = doc.startViewTransition(() => navigate(to));
    // A View Transition exposes three promises (ready / updateCallbackDone /
    // finished). When a transition is aborted — a second swipe interrupts the
    // first, or the page unloads mid-animation — they reject. Swallow each so
    // none surfaces as an unhandled rejection; the navigation still lands.
    transition.ready?.catch(() => {});
    transition.updateCallbackDone?.catch(() => {});
    void transition.finished.catch(() => {}).then(release);
  } catch {
    release();
    navigate(to);
  }
}

/** True if the touch began inside a horizontally-scrollable ancestor. */
function startedInHorizontalScroller(target: Element | null): boolean {
  let el: Element | null = target;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function useTabSwipeNavigation(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const blocked = useRef(false);

  useEffect(() => {
    // Listen on every tab path. Page content only originates a swipe on the
    // content-origin paths; the nav bar originates on all of them.
    if (!ORDER.includes(pathname as TabPath)) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        blocked.current = true;
        return;
      }
      const t = e.touches[0];
      if (t.clientX <= EDGE_GUARD || t.clientX >= window.innerWidth - EDGE_GUARD) {
        blocked.current = true; // leave the edges to OS back / swipe-back
        return;
      }
      const target = e.target as Element | null;

      // The bottom nav is always a valid swipe origin: a horizontal flick over it
      // changes tabs, while a tap still taps (we never preventDefault and only
      // navigate past MIN_DX). It bypasses the button/scroller exclusions below.
      if (target?.closest(NAV_SELECTOR)) {
        blocked.current = false;
        start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
        return;
      }

      // Off the nav, only page content on the content-origin paths may swipe.
      if (!CONTENT_ORIGIN_PATHS.has(pathname)) {
        blocked.current = true;
        return;
      }
      if (target && (target.closest(EXCLUDE_SELECTOR) || startedInHorizontalScroller(target))) {
        blocked.current = true;
        return;
      }
      blocked.current = false;
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onMove = (e: TouchEvent) => {
      // A second finger (pinch/zoom) cancels the gesture.
      if (!blocked.current && e.touches.length > 1) {
        blocked.current = true;
        start.current = null;
      }
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (blocked.current || !s) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > MAX_DURATION) return;
      if (Math.abs(dx) < MIN_DX) return;
      if (Math.abs(dx) < Math.abs(dy) * DOMINANCE) return;

      const idx = ORDER.indexOf(pathname as TabPath);
      if (idx === -1) return;
      const nextIdx = dx < 0 ? idx + 1 : idx - 1; // left = next, right = prev
      if (nextIdx < 0 || nextIdx >= ORDER.length) return;
      void tap("light"); // confirm the tab change the same way a tap does
      navigateWithSlide(navigate, ORDER[nextIdx], dx < 0 ? "left" : "right");
    };

    const onCancel = () => {
      start.current = null;
      blocked.current = true;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [navigate, pathname]);
}

export default useTabSwipeNavigation;
