import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollRestoration — global scroll position handler.
 *
 * - PUSH / REPLACE (forward navigation): scrolls to top of the new page.
 * - POP (browser back/forward): restores the saved scroll position so the
 *   user lands where they left off, like a native app.
 *
 * Per-page positions are keyed by `pathname + search` and stored in
 * sessionStorage so they survive HMR and back/forward through the cache.
 */
const STORAGE_KEY = "zivo:scroll-positions";

function readPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writePositions(map: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage can throw in private mode / storage quota — fail silent.
  }
}

export default function ScrollRestoration() {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  const lastKey = useRef<string | null>(null);
  const lastPathname = useRef<string>(pathname);

  // Save the previous page's scroll position right before navigating away.
  useEffect(() => {
    const key = pathname + search;
    if (lastKey.current && lastKey.current !== key) {
      const map = readPositions();
      map[lastKey.current] = window.scrollY;
      writePositions(map);
    }
    lastKey.current = key;
  }, [pathname, search]);

  // Apply scroll behavior for the destination page.
  useEffect(() => {
    const key = pathname + search;
    const pathChanged = lastPathname.current !== pathname;
    lastPathname.current = pathname;

    // Same pathname, only URL search params changed (e.g. a filter toggle on
    // the hotels listing). Don't touch scroll — pages drive their own scroll
    // for in-page state changes.
    if (!pathChanged && navType !== "POP") return;

    if (navType === "POP") {
      const saved = readPositions()[key];
      // Two RAFs so we wait for layout + first paint of the destination route.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved ?? 0, left: 0, behavior: "auto" });
        });
      });
    } else {
      // PUSH or REPLACE to a new pathname — fresh navigation, start at the top.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
  }, [pathname, search, navType]);

  return null;
}
