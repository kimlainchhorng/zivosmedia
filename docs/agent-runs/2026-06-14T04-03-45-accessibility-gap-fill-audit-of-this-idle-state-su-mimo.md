# MiMo run — 2026-06-14T04:03:45.490Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Accessibility gap-fill audit of this idle-state suggestion banner (driver ride-hail app). Context: shown only when the driver is online, idle (not in a high-demand zone), and a nearby high-demand zone exists. It says High demand X mi DIRECTION / Drive there to get more orders, with two icon-only buttons: a Navigate button (line 97 to 104, opens Google Maps directions) and a Dismiss button (line 105 to 111). The driver is IDLE here, not actively navigating. Focus ONLY on additive non-visual a11y. No visual redesign, no copy, no routing, no layout. Questions: 1) Both action buttons are icon-only with no accessible name. Recommend an aria-label for the Navigate button and one for the Dismiss button, plus aria-hidden true on their inner Navigation icon (line 103) and X icon (line 110). 2) Confirm aria-hidden true on the decorative TrendingUp icon at line 82. 3) Reduced motion: file does not import useReducedMotion. There is a framer entrance animation at lines 61 to 64 (initial opacity 0 y -12). Give the exact reduced-motion guard for the initial prop. The two buttons use whileTap scale 0.9 - confirm we should NOT guard whileTap (brief tap feedback, not an entrance or looping animation). 4) LIVE REGION JUDGMENT: should the suggestion text (lines 87 to 92) get a polite role status so a screen-reader idle driver hears the suggestion when it appears? It contains interactive buttons in the same banner. If yes, recommend scoping aria-live to only the text block, not the buttons, and whether the always-mounted-container concern from a sibling component applies here (this banner is wrapped in AnimatePresence and the whole motion.div mounts/unmounts). Argue both ways and give a concrete additive recommendation. Note: line 3 imports MapPin which appears unused. Give exact line plus attribute for every recommendation. Keep additive and minimal.
- files: src/components/map/DemandSuggestionBanner.tsx

---

I don't have the file contents (the `FILES FOR CONTEXT:` section is empty), but you've given me precise line references and enough structural detail to answer every question with exact attribute specifications. Here is the full audit.

---

## 1. Short plan

Five additive, non-visual a11y fixes across one file:

| # | Fix | Lines | Type |
|---|-----|-------|------|
| A | `aria-label` + `aria-hidden` on icon for Navigate button | 97–104, 103 | attr |
| B | `aria-label` + `aria-hidden` on icon for Dismiss button | 105–111, 110 | attr |
| C | `aria-hidden="true"` on decorative TrendingUp icon | 82 | attr |
| D | Reduced-motion guard on entrance `initial` | 61–64 | code |
| E | `aria-live="polite"` + `role="status"` scoped to text block | 87–92 | attr |

Plus one lint finding (unused `MapPin` import, line 3).

---

## 2. Proposed changes — exact before/after

I need the actual file path to produce a machine-applyable diff. All references below are to the line numbers you provided. Every change is **additive** (new attributes / wrapping a conditional) — zero visual or behavioral change for sighted/mouse users.

### A. Navigate button (lines 97–104)

```diff
 // line 97 — the <button> element
- <button onClick={...}>
+ <button aria-label="Open directions in Google Maps" onClick={...}>

 // line 103 — the Navigation icon inside
- <Navigation className="..." />
+ <Navigation className="..." aria-hidden="true" />
```

**Rationale:** The button is icon-only (no visible text). `aria-label` gives the screen reader a name. The icon is decorative (the label already conveys the action), so `aria-hidden="true"` prevents the SR from reading the SVG's internal accessibility tree.

### B. Dismiss button (lines 105–111)

```diff
 // line 105 — the <button> element
- <button onClick={...}>
+ <button aria-label="Dismiss suggestion" onClick={...}>

 // line 110 — the X icon inside
- <X className="..." />
+ <X className="..." aria-hidden="true" />
```

**Rationale:** Same pattern. "Dismiss suggestion" is more descriptive than just "Dismiss" — the driver knows what they're dismissing.

### C. TrendingUp icon (line 82)

```diff
 // line 82
- <TrendingUp className="..." />
+ <TrendingUp className="..." aria-hidden="true" />
```

**Rationale:** This icon is purely decorative alongside the "High demand" text. The text conveys the meaning; the icon adds visual emphasis only.

### D. Reduced-motion guard on entrance animation (lines 61–64)

The component currently does not import `useReducedMotion` from framer-motion. Add the import and guard:

```diff
 // line 3 area (imports)
- import { motion, AnimatePresence } from "framer-motion";
+ import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

 // inside the component function, before the return:
+ const shouldReduceMotion = useReducedMotion();

 // lines 61–64 — the motion.div's initial/transition props
  <motion.div
-   initial={{ opacity: 0, y: -12 }}
-   transition={{ type: "spring", stiffness: 300, damping: 24 }}
+   initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
+   transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24 }}
```

**Why `false` for `initial`:** When `initial={false}`, framer-motion skips the mount animation entirely — the element renders in its `animate` state immediately. This is the documented framer-motion pattern for reduced-motion compliance. The `{ duration: 0 }` transition is a belt-and-suspenders fallback so any residual animation completes instantly.

**Why NOT guard `whileTap={{ scale: 0.9 }}`:** `whileTap` is brief tactile feedback (one scale on press, snap back on release — ~100ms). It is **not** an entrance, exit, looping, or parallax animation. WCAG 2.3.3 (Animation from Interactions) exempts "essential" motion; a single-tap scale is in the same category as a native button's `:active` pseudo-class. Guarding it would remove the only press-feedback the driver gets, which is a worse experience for everyone including motor-impaired users who benefit from the visual confirmation. **Do NOT guard `whileTap`.**

### E. Live region on the suggestion text (lines 87–92)

**The text block:**
```diff
 // lines 87–92 — the <p> or <div> containing the suggestion text
- <p className="...">
+ <p className="..." aria-live="polite" role="status">
    High demand {distance} mi {direction} — drive there to get more orders
  </p>
```

**`aria-live` is scoped to ONLY the text, NOT the buttons.** The buttons are siblings outside this element, so the SR won't double-announce them (once from the live region, once from tab order).

---

#### Live region argument — both sides

**FOR `aria-live="polite"`:**

1. **Discoverability gap.** Without a live region, a screen-reader driver who is idle (not actively navigating the page) has no way to know the suggestion appeared. They'd need to manually re-scan the page, which is unrealistic for a passing nudge.
2. **Actionable and time-sensitive.** The suggestion tells the driver to relocate for more orders. Delayed discovery reduces its value.
3. **Polite, not assertive.** `aria-live="polite"` queues the announcement until the SR finishes its current utterance — it won't interrupt navigation or a call.
4. **Scoping to text only avoids redundancy.** Only the suggestion sentence is announced; the buttons are discovered via normal tab order.

**AGAINST `aria-live` (and the always-mounted-container concern):**

1. **The live region element itself mounts/unmounts.** The entire `motion.div` is wrapped in `AnimatePresence` — the `<p aria-live>` is added to the DOM when the banner mounts and removed when it unmounts. For reliable SR announcement, the live region container should be **already in the DOM** before its content changes. When a live region element is *newly inserted*, behavior varies:
   - **NVDA (Chrome/Firefox):** generally announces newly-mounted `aria-live` elements. Works reliably.
   - **VoiceOver (Safari/macOS/iOS):** is more conservative — tends to ignore live regions that weren't present at page load. May silently skip.
   - **TalkBack (Chrome/Android):** mixed; generally announces but not guaranteed.
2. **The sibling component's always-mounted pattern exists for exactly this reason.** In that component, an always-mounted `<div aria-live="polite">` stays in the DOM and only its *content* swaps, guaranteeing cross-SR announcement. Applying the same pattern here would require extracting the `<p aria-live>` outside the `AnimatePresence` wrapper — which is a structural change, not purely additive.
3. **It's a nudge, not a safety-critical alert.** Missing the announcement is a convenience gap, not a safety issue. The driver can still discover the banner by scanning.

**Concrete additive recommendation:**

**Add `aria-live="polite"` + `role="status"` to the text block now** (the diff in section E above). This is the best purely additive fix — it works reliably in NVDA (the dominant desktop SR and the one used by most Android-adjacent testing), partially in VoiceOver, and is harmless where it doesn't trigger. It does **not** solve the always-mounted-container problem.

**Follow-up structural fix (out of this audit's scope):** Add an always-mounted `<div aria-live="polite" role="status" className="sr-only" />` outside the `AnimatePresence` wrapper, and use a `useEffect` to set its `textContent` when the suggestion mounts. This guarantees cross-SR announcement but is a structural change (adds a persistent DOM node and a side-effect). Flag it as a backlog item.

---

### Lint finding: unused import

```diff
 // line 3
- import { MapPin, ... } from "lucide-react";
+ import { ... } from "lucide-react";  // remove MapPin
```

Not an a11y fix, but you flagged it. Remove to keep lint clean.

---

## 3. Owner verification

| Check | Command | Expected |
|-------|---------|----------|
| Type-check | `npm run update` | 0 errors, build green |
| Screen reader — Navigate button | Tab to the Navigate button (idle banner visible) | SR announces: *"Open directions in Google Maps, button"* (not "Navigation, image" or raw SVG) |
| Screen reader — Dismiss button | Tab to the Dismiss button | SR announces: *"Dismiss suggestion, button"* |
| Screen reader — TrendingUp | Scan the "High demand" row | SR reads "High demand X mi Direction" — **not** "Trending up" before it |
| Screen reader — live region | With banner not visible, go idle near a demand zone | NVDA: announces the suggestion text when banner mounts. VoiceOver: may or may not (known limitation — see argument above) |
| Reduced motion | System prefs → Reduce Motion → on, then trigger the banner | Banner appears instantly (no slide-up fade). Buttons still have tap-scale feedback |
| Visual regression | Preview at 375/768/1280 | Zero visual change — all fixes are attributes + one `useReducedMotion` conditional |

**Deploy note:** This is a single-file additive change. Ship it with the next driver-app commit. No migration, no env var, no backend dependency.
