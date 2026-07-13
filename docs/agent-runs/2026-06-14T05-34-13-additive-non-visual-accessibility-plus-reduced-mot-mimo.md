# MiMo run — 2026-06-14T05:34:13.051Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. SyncPendingBanner MOUNTED on /map shows offline sync status. Offline: CloudOff icon plus text. Online: RefreshCw icon with Tailwind animate-spin while syncing plus text. No framer-motion. Questions: (1) aria-hidden true on CloudOff and RefreshCw icons (redundant with adjacent text)? (2) Guard the animate-spin infinite rotation with motion-reduce:animate-none? (3) Add role=status aria-live=polite to announce sync state changes? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/common/SyncPendingBanner.tsx

---

## Verdict (concise)

1. **`aria-hidden="true"` on both icons** — **Yes.** CloudOff and RefreshCw are purely decorative; adjacent text carries the full meaning ("N updates saved offline", "Syncing N updates…"). Adding `aria-hidden` prevents redundant announcements.

2. **Guard `animate-spin` with motion-reduce** — **Yes.** Use Tailwind's `motion-safe:` variant so the spin **only** applies when the user has *not* enabled "reduce motion." Replace `animate-spin` with `motion-safe:animate-spin`. (Tailwind ≥3.3 natively supports `motion-safe:`; no extra config needed.)

3. **`role="status" aria-live="polite"` on the container** — **Yes.** This is textbook `role="status"`: a non-urgent live region whose content changes reflect a process state (offline→syncing→synced). `aria-live="polite"` lets the screen reader finish its current utterance before announcing the new state.

---

## Proposed diff

**File:** `src/components/common/SyncPendingBanner.tsx`

```diff
@@
   // Don't show if no pending updates
   if (pendingCount === 0) return null;
 
   // Show different message based on online/offline state
   if (!isOnline) {
     return (
-      <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
-        <CloudOff className="h-4 w-4 text-warning shrink-0" />
+      <div role="status" aria-live="polite" className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
+        <CloudOff aria-hidden="true" className="h-4 w-4 text-warning shrink-0" />
         <span className="text-xs text-warning">
           {pendingCount} update{pendingCount > 1 ? "s" : ""} saved offline
         </span>
       </div>
     );
   }
 
   // Online with pending updates
   return (
-    <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
-      <RefreshCw className={`h-4 w-4 text-foreground shrink-0 ${syncing ? "animate-spin" : ""}`} />
+    <div role="status" aria-live="polite" className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
+      <RefreshCw aria-hidden="true" className={`h-4 w-4 text-foreground shrink-0 ${syncing ? "motion-safe:animate-spin" : ""}`} />
       <span className="text-xs text-foreground">
         {syncing
           ? `Syncing ${pendingCount} update${pendingCount > 1 ? "s" : ""}...`
           : `${pendingCount} update${pendingCount > 1 ? "s" : ""} pending sync`
         }
       </span>
     </div>
   );
```

**Summary of exactly 6 additive edits, 0 logic lines touched:**

| # | What | Where |
|---|------|-------|
| 1 | `role="status" aria-live="polite"` added | Offline container `<div>` |
| 2 | `aria-hidden="true"` added | `<CloudOff>` |
| 3 | `role="status" aria-live="polite"` added | Online container `<div>` |
| 4 | `aria-hidden="true"` added | `<RefreshCw>` |
| 5 | `animate-spin` → `motion-safe:animate-spin` | `<RefreshCw>` className |
| 6 | *(same line as #4–5, counted together)* | — |

**No layout, copy, routing, styling, or logic changes.** The `motion-safe:` variant is purely additive — it compiles to an `@media (prefers-reduced-motion: no-preference)` wrapper that conditionally applies the existing `animate-spin` keyframes. Visual behavior for users *without* reduce-motion enabled is byte-identical.

---

## Owner verification

1. **Tailwind version check:** `motion-safe:` requires Tailwind ≥ 3.3. The ZIVO monorepo uses a recent Tailwind — confirm with `npx tailwindcss --help` or check `package.json`.
2. **Type-check + build gate:** `npm run update` must pass (this is additive JSX attributes + a Tailwind class swap — should be zero risk, but verify).
3. **Visual preview (375/768/1280):** confirm the banner still renders identically. With reduce-motion off the spin is unchanged; with reduce-motion on the icon is now static (desired).
4. **Screen reader test:** navigate to `/map` with pending offline queue entries; confirm VoiceOver/NVDA announces "N updates saved offline" once on mount and again when the state flips to syncing/completed.
