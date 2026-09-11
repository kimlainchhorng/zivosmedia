import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { liveUpdateSnapshot, subscribeLiveUpdates, retryLiveUpdates, setRealtimeRouteActive } from '@/lib/realtime/connectionCircuit';
import { routeNeedsRealtime } from '@/lib/realtime/routePolicy';
import { useI18n } from '@/hooks/useI18n';

// Fixed chrome mounts near the root, so a shallow sweep finds it without paying
// a full-tree style recalc.
const MAX_CHROME_DEPTH = 8;
// Anything taller than this is a full-screen overlay, not a header bar.
const MAX_CHROME_HEIGHT = 200;

/**
 * The bottom edge of the route's top chrome. Route headers are not one height
 * and not one tag — the feed pins a 83px `div`, AppHeader a 56px `header` plus
 * safe area — so a hard-coded offset covers the header on one route while
 * floating loose on another. Decorative layers (the safe-area guard strip, the
 * full-screen overlay host) are `pointer-events: none` and take no taps, so
 * they are not chrome the notice has to clear.
 */
function measureTopChromeBottom(): number {
  let lowest = 0;
  let level: Element[] = [...document.body.children];
  for (let depth = 0; depth < MAX_CHROME_DEPTH && level.length > 0; depth++) {
    const next: Element[] = [];
    for (const element of level) {
      next.push(...element.children);
      const style = getComputedStyle(element);
      if (style.position !== 'fixed' && style.position !== 'sticky') continue;
      if (style.pointerEvents === 'none') continue;
      const rect = element.getBoundingClientRect();
      if (rect.top > 8 || rect.height <= 0 || rect.height > MAX_CHROME_HEIGHT) continue;
      if (rect.width < window.innerWidth * 0.5) continue;
      lowest = Math.max(lowest, rect.bottom);
    }
    level = next;
  }
  return lowest;
}

function useTopChromeBottom(visible: boolean, pathname: string) {
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    let frame = 0;
    const measure = () => setBottom(measureTopChromeBottom());
    // Measure synchronously first so the notice never paints over the header
    // for a frame, then coalesce later passes.
    measure();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', schedule);
    // Fixed chrome sits outside normal flow, so a ResizeObserver on <body>
    // never fires when a header mounts after the notice. Watch the tree.
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
    observer?.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [visible, pathname]);
  return bottom;
}

export default function LiveUpdatesNotice() {
  const { pathname } = useLocation();
  const active = routeNeedsRealtime(pathname);
  useLayoutEffect(() => { setRealtimeRouteActive(active); }, [active]);
  const state = useSyncExternalStore(subscribeLiveUpdates, liveUpdateSnapshot, () => 'idle');
  const { currentLanguage } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const km = currentLanguage === 'km';
  const visible = active && !dismissed && (state === 'retrying' || state === 'unavailable');
  const headerBottom = useTopChromeBottom(visible, pathname);
  if (!visible) return null;
  // pointer-events-none on the container so the notice never swallows a tap
  // meant for the header beneath it; each control opts back in. Both controls
  // opt in — a rendered Retry button that cannot be clicked is exactly the
  // dead-CTA failure this app is trying to eliminate.
  // The inline offset wins over the class when a header was measured; without
  // one the notice keeps its original safe-area position.
  return <div role="status" style={headerBottom > 0 ? { top: `${headerBottom}px` } : undefined} className="pointer-events-none fixed left-0 right-0 top-[env(safe-area-inset-top)] z-[90] flex min-h-9 items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-50/95 px-3 py-1.5 text-sm text-amber-950 shadow-sm backdrop-blur">
    <span>{km ? 'ការធ្វើបច្ចុប្បន្នភាពផ្ទាល់មិនអាចប្រើបាន។' : 'Live updates unavailable.'} {state === 'retrying' ? km ? 'កំពុងភ្ជាប់ឡើងវិញ…' : 'Reconnecting…' : km ? 'សូមផ្ទុកទំព័រឡើងវិញដើម្បីមើលព័ត៌មានថ្មី។' : 'Refresh the page for the latest information.'}</span>
    {state === 'unavailable' && <button type="button" onClick={retryLiveUpdates} className="pointer-events-auto min-h-11 shrink-0 px-3 font-semibold underline">{km ? 'ព្យាយាមម្ដងទៀត' : 'Retry'}</button>}
    <button type="button" aria-label={km ? 'បិទ' : 'Dismiss'} onClick={() => setDismissed(true)} className="pointer-events-auto min-h-11 min-w-11 px-2 text-base leading-none">×</button>
  </div>;
}
