# DeepSeek run — 2026-06-14T05:33:48.459Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is SyncPendingBanner, MOUNTED on /map. It shows offline sync status: returns null when pendingCount is 0; otherwise renders a small inline banner. Offline state: CloudOff icon plus text like '3 updates saved offline'. Online state: RefreshCw icon (gets CSS class animate-spin while syncing) plus text 'Syncing N updates...' or 'N updates pending sync'. No framer-motion is used. Questions: (1) Should the CloudOff and RefreshCw icons get aria-hidden true since the adjacent text already conveys the meaning? (2) The RefreshCw spinner uses Tailwind animate-spin (infinite CSS rotation) - is that vestibular movement that should get a motion-reduce:animate-none guard, while keeping the icon visible? (3) Should the banner get role=status aria-live=polite so screen readers announce sync state changes the driver did not manually trigger, or is that chatter? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/common/SyncPendingBanner.tsx

---

## Verdict per question

**(1) `aria-hidden="true"` on icons — YES.** Both `CloudOff` and `RefreshCw` are purely decorative alongside the adjacent `<span>` that already conveys the full meaning ("3 updates saved offline", "Syncing 3 updates..."). Adding `aria-hidden="true"` prevents assistive technology from redundantly announcing "Cloud off icon, 3 updates saved offline" or "Refresh icon spinning, Syncing 3 updates...".

**(2) `motion-reduce:animate-none` on `animate-spin` — YES.** The infinite CSS rotation of `animate-spin` is vestibular motion that can trigger discomfort. Add `motion-reduce:animate-none` so the icon stays visible (not hidden) but stops spinning when the user has `prefers-reduced-motion: reduce` set. The icon itself is still meaningful as a static sync indicator.

**(3) `role="status"` + `aria-live="polite"` — YES, with a guard.** The banner appears/disappears and changes text based on sync state changes the user did not trigger (e.g., network comes back, sync finishes). This is exactly the use case for `aria-live="polite"` — the user should be informed without interruption. However, to avoid chatter on mount (when the page loads with pending items already present), only add the live region when the banner is *already visible* and its content changes. The simplest approach: add `role="status"` (which implies `aria-live="polite"`) to the outer `<div>` of each branch. The initial render with pending items will announce once on page load, which is acceptable (the user should know there are pending items). Subsequent text changes (e.g., "3 pending sync" → "Syncing 3 updates..." → banner disappears) will be announced naturally.

---

## Proposed diff

**File:** `src/components/common/SyncPendingBanner.tsx`

```diff
  // Offline state
  return (
-   <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
-     <CloudOff className="h-4 w-4 text-warning shrink-0" />
+   <div role="status" className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
+     <CloudOff aria-hidden="true" className="h-4 w-4 text-warning shrink-0" />
      <span className="text-xs text-warning">
        {pendingCount} update{pendingCount > 1 ? "s" : ""} saved offline
      </span>
    </div>
  );

  // Online state
  return (
-   <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
-     <RefreshCw className={`h-4 w-4 text-foreground shrink-0 ${syncing ? "animate-spin" : ""}`} />
+   <div role="status" className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
+     <RefreshCw aria-hidden="true" className={`h-4 w-4 text-foreground shrink-0 ${syncing ? "animate-spin motion-reduce:animate-none" : ""}`} />
      <span className="text-xs text-foreground">
        {syncing
          ? `Syncing ${pendingCount} update${pendingCount > 1 ? "s" : ""}...`
          : `${pendingCount} update${pendingCount > 1 ? "s" : ""} pending sync`
        }
      </span>
    </div>
  );
```

---

## What the owner must verify

1. **`npm run update`** passes (type-check + build) — this is a pure className/attribute change, no logic touched, so it should pass cleanly.
2. **Preview the banner** in both offline and online states:
   - Offline: verify `CloudOff` icon is still visible (it is — `aria-hidden` only hides it from AT, not visually).
   - Online + syncing: verify the `RefreshCw` icon stops spinning when you toggle `prefers-reduced-motion: reduce` in DevTools (the icon stays visible but static).
3. **Screen reader test** (VoiceOver/NVDA): when the banner appears or its text changes, the live region should announce the new text. On page load with pending items, expect one announcement of the initial state (acceptable).
4. **No deploy needed** — this is a client-only change. The owner commits and the next build/deploy picks it up.
