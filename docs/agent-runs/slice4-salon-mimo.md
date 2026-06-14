# MiMo run — 2026-06-13T21:28:54.099Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/salon/PublicSalonBookingPage.tsx (a customer-facing PUBLIC salon booking storefront at route /salon/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO active:scale, ZERO focus-visible rings, ZERO reduced-motion guards, ZERO safe-area header padding. Focus on: (1) interaction consistency — add 'active:scale-[0.98] transition-transform' + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' to every interactive button, service/staff card, time-slot chip, and the booking CTA (icon-only buttons use scale-[0.95]); (2) header/hero top padding should clear the fixed app header (safe-area) and the hero be responsive; (3) responsive issues at 375/768/1280 (service cards grid, time-slot grid, summary layout); (4) any obviously incomplete/disconnected UI piece. Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/salon/PublicSalonBookingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Audit every interactive element, the safe-area clearance, the responsive grid breakpoints, and any incomplete UI. Propose className-only edits that bring parity with `JobPostingDetailPage`'s interaction tokens (`active:scale` + `focus-visible:ring` + `transition-all`). Add safe-area padding so the banner clears the fixed app header. Add `useReducedMotion` for the scroll/entrance (none here — but the scale tokens should be gated). Fix the hours strip `grid-cols-7` crush on 375px.

---

## Punch list — exact edits in `src/pages/salon/PublicSalonBookingPage.tsx`

### 0. Imports
Add `useReducedMotion` from `@/hooks/useReducedMotion` (same hook used elsewhere in the repo). Call it at the top of `PublicSalonBookingPage`:
```ts
const reducedMotion = useReducedMotion();
```
Create a helper used by all interactive elements below:
```ts
const interaction = reducedMotion ? "" : "active:scale-[0.98] transition-transform";
const interactionSm = reducedMotion ? "" : "active:scale-[0.95] transition-transform";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
```

### 1. Safe-area banner clearance
**Banner div** (the `relative h-40 sm:h-56` div): add top padding to clear the fixed header:
```
-  <div className="relative h-40 sm:h-56 w-full bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden">
+  <div className="relative h-40 sm:h-56 w-full bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden" style={{ marginTop: "var(--zivo-safe-top-sticky, 0px)" }}>
```
This shifts the banner down by the header height without breaking layout on native (where the var is 0).

### 2. Service category filter buttons (~L270)
```
-  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
+  "rounded-full border px-3 py-1 text-xs font-medium transition-colors min-h-[34px] " + interaction + " " + focusRing,
```

### 3. Service cards (~L280)
```
-  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
+  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all " + interaction + " " + focusRing,
```

### 4. "Any stylist" button (~L315)
```
-  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
+  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all min-h-[36px] " + interaction + " " + focusRing,
```

### 5. Stylist buttons (~L325, same className pattern)
Same edit as #4.

### 6. Date nav buttons (icon-only, ~L345)
The `<Button variant="outline" size="icon" className="h-8 w-8"` instances — add `active:scale-[0.95]` + focus ring. Since these are shadcn `Button`, append to className:
```
-  className="h-8 w-8"
+  className={"h-8 w-8 " + interactionSm + " " + focusRing}
```
(Both prev/next buttons.)

### 7. Time slot chips (~L370)
```
-  "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
+  "rounded-lg border px-2 py-2 text-sm font-medium transition-all min-h-[40px] " + interactionSm + " " + focusRing,
```

### 8. Booking CTA button (~L450)
The shadcn `<Button>` — append:
```
-  <Button onClick={handleConfirm} disabled={!canSubmit || submitting} className="w-full gap-1.5">
+  <Button onClick={handleConfirm} disabled={!canSubmit || submitting} className={"w-full gap-1.5
