# MiMo run — 2026-06-14T05:04:20.590Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 56 — src/pages/DatingPage.tsx (single page, 236 lines, swipe-to-match dating discovery page; card stack + 3 action buttons). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label/aria-pressed/aria-expanded only). NO logic, NO handlers, NO state, NO routing changes, NO framer prop changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards/standalone-CTA [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for pure press-scale with no hover color (OR when the only hover is a TRANSFORM like hover:scale). When a control already has transition-colors AND we add a new active:scale, FLIP transition-colors→transition-all. A hover:scale (transform) + existing transition-transform needs NO flip.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. aria-pressed ONLY for segmented single/multi-select controls. Do NOT add aria-expanded to dialog openers.

SKIP (already tokenized / native focus / not mine): shadcn components (Avatar, etc.); presentational divs/motion.div without onClick (the swipe card itself uses drag, NOT onClick — it is a drag surface, leave it); child components (SafeCaption, VerifiedBadge, ZivoMobileNav, SEOHead).

The 5 RAW <button> controls under review:
1. L107 Back ArrowLeft — icon-only, NO aria-label, onClick navigate(-1), className "p-2 -ml-2 rounded-full hover:bg-muted/50" (sticky header, neutral bg). HAS hover:bg, NO transition/scale/ring.
2. L124 Refresh — VISIBLE TEXT "Refresh", onClick reset index + invalidateQueries, className "mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium". Auto-width gradient CTA. NO hover color, NO transition, NO scale, NO ring. (Empty-state CTA.)
3. L200 Pass/X — icon-only X, NO aria-label, onClick handleSwipe("left"), className "h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". HAS hover:scale-110 (TRANSFORM) + transition-transform, NO active-press, NO ring.
4. L207 Message — icon-only MessageCircle, NO aria-label, onClick navigate("/chat", {state:{recipientId}}), className "h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". Same pattern as #3.
5. L218 Heart/Like — icon-only Heart, NO aria-label, onClick handleSwipe("right"), className "h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". Same pattern as #3.

Confirm per control: exact className change, transition-all vs transition-transform vs flip vs keep, scale tier, ring (outward vs inset), and any aria add/keep. KEY QUESTIONS: (Q1) For #3/#4/#5 which ALREADY have hover:scale-110 + transition-transform — do we APPEND active:scale-95 (icon tier) + ring and KEEP transition-transform with NO flip (since the only hover is a transform, not a color)? Confirm the active:scale-95 composing UNDER hover:scale-110 is correct/intended (press snaps from 110%→95%). (Q2) For #2 Refresh gradient CTA with no hover at all — transition-transform (pure press, no color hover) + active:scale-[0.98] (standalone auto-width CTA tier) + outward ring? Or [0.97]? (Q3) aria-labels: Back="Back", Pass/X="Pass", Message="Message", Heart="Like" — confirm wording. Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per control.
- files: src/pages/DatingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Five RAW `<button>` controls in `src/pages/DatingPage.tsx`. Apply interaction tokens (scale + ring + transition) and add missing `aria-label` to icon-only buttons. Zero logic changes.

---

## Per-control rulings

| # | Control | transition | scale tier | ring | aria |
|---|---------|-----------|-----------|------|------|
| 1 | Back ArrowLeft | FRESH `transition-all` (has `hover:bg`) | `active:scale-95` icon | OUTWARD `ring-ring` | ADD `aria-label="Back"` |
| 2 | Refresh CTA | FRESH `transition-transform` (NO hover color) | `active:scale-[0.98]` standalone CTA | OUTWARD `ring-ring` | none (visible text) |
| 3 | Pass/X | KEEP `transition-transform` (hover is transform) | APPEND `active:scale-95` icon | OUTWARD `ring-ring` | ADD `aria-label="Pass"` |
| 4 | Message | KEEP `transition-transform` (hover is transform) | APPEND `active:scale-95` icon | OUTWARD `ring-ring` | ADD `aria-label="Message"` |
| 5 | Heart/Like | KEEP `transition-transform` (hover is transform) | APPEND `active:scale-95` icon | OUTWARD `ring-ring` | ADD `aria-label="Like"` |

**Key answers:**

**Q1:** Yes — APPEND `active:scale-95` + ring and KEEP `transition-transform` with NO flip. The only hover is a transform (`hover:scale-110`), not a color → `transition-transform` remains correct. `active:scale-95` composes under `hover:scale-110`: during press (mousedown) the button shrinks to 95%; on hover-only it scales to 110%. Correct/intended — this is the same pattern as the JobPostingDetailPage close/reopen button which composes `active:scale-[0.99]` under existing hover states.

**Q2:** `transition-transform` + `active:scale-[0.98]` + outward ring. The `[0.98]` standalone-CTA tier is correct (auto-width `px-6`, NOT a small pill chip `[0.97]` and NOT full-width `[0.99]`).

**Q3:** `aria-label` wording: `"Back"`, `"Pass"`, `"Message"`, `"Like"` — confirmed. Concise verb/noun, matches JobPostingDetailPage's `"Back"` convention for icon-back buttons.

All 5 buttons sit in flex rows on the neutral page `bg-background` — none inside a separate `overflow-hidden` rounded ancestor → all OUTWARD `ring-ring`, zero `ring-inset`.

---

## Proposed diff — `src/pages/DatingPage.tsx`

```diff
--- a/src/pages/DatingPage.tsx
+++ b/src/pages/DatingPage.tsx
@@ -107,3 +107,3 @@
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -124,3 +124,3 @@
-              className="mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium"
+              className="mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -200,3 +200,4 @@
-                className="h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Pass"
+                className="h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -207,3 +207,4 @@
-                className="h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Message"
+                className="h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -218,3 +218,4 @@
-                className="h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Like"
+                className="h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Diff summary:** 5 className `−`/`+` edits + 4 new `aria-label` attrs = **9 insertions / 5 deletions**. Zero logic lines touched. Every `onClick`/`navigate`/`handleSwipe`/query/mutation preserved byte-for-byte.

---

## Owner verification

1. Apply the diff to `src/pages/DatingPage.tsx`.
2. Run `npm run update` — must exit 0 (type-check + worker type-check + production build).
3. Preview at 375px: confirm the 3 action buttons (Pass 56px / Message 44px / Heart 56px) ring visually on Tab-focus; the Back button ring in the sticky header; the Refresh CTA scales on press in the empty state.
4. No commit/deploy unless owner asks.
