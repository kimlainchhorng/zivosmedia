# DeepSeek run — 2026-06-14T05:08:13.953Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/QRProfilePage.tsx (a "QR Profile" share-and-scan page reached by in-app navigation; useNavigate; useAuth user; reads `profiles` for the user's name/avatar/share_code; a 2-tab switcher ["My Code" | "Scan"] with a framer layoutId sliding pill; AnimatePresence tab panels; a QRScannerModal. Two sub-components: MyCodeTab [a QR card + a readOnly profile-link input with a Copy button + Save QR / Share action buttons + a desktop Tips list] and ScanTab [an animated scan-frame card + an "Open camera" button + a "How it works" list]. plain <div className="min-h-screen bg-background"> root, NO SwipeBackContainer.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the supabase profiles read, the copyLink/downloadQR/handleScan/goBack logic, the activeTab/copied/scannerOpen state + setters, the swipe handlers, the navigator.share/clipboard calls, the QRCodeSVG props, every onClick. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset ONLY when the control is a flush edge child of a rounded overflow-hidden parent (so an outward ring would be clipped).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when ALSO a hover:bg/text/border/opacity; transition-opacity when only opacity. NOTE: Tailwind's bare `transition` utility already includes transform in its property list, so a control shipping `transition` (shorthand) that gains an active:scale needs NO flip. FLIP RULE applies only to `transition-colors` (which excludes transform) GAINING a new active:scale -> flip to transition-all.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-*), KEEP it and do NOT renumber and do NOT add a SECOND competing scale.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT two-way toggle/segmented control whose on/off selection is conveyed by bg; NOT on a one-shot action, NOT when role=tab semantics would be the idiomatic choice.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it. A RAW <input> already shipping focus:ring-* -> leave.

RING COLOR: --ring resolves to BLACK. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a dark-FILLED button (e.g. bg-foreground) sitting on a NEUTRAL parent still uses ring-ring, because the OUTWARD ring renders against the neutral parent, not the button's own fill. ring-inset requires an overflow-hidden ancestor.

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance/loop initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it). NOTE: all 6 RAW <button>s already ship press scales + transitions EXCEPT the 2 tabs; the universal gap is the FOCUS RING:

A. Header Back (L175, RAW, ICON-ONLY ArrowLeft, ALREADY aria-label="Back" KEEP, className "flex h-10 w-10 ... rounded-2xl text-foreground transition hover:bg-muted active:scale-95" — ALREADY `transition` [shorthand, covers transform] + hover:bg + active:scale-95, NO ring; sits in the neutral sticky header):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95 pre-existing; KEEP `transition` — no flip [shorthand already covers transform]; OUTWARD ring-ring on neutral header; KEEP aria-label).

B. Tab switcher buttons (L204, RAW ×2 "My Code"/"Scan", CONSTANT labels + icon, onClick={() => setActiveTab(tab)}, selection conveyed by a framer `layoutId="qr-tab-pill"` sliding pill [motion.span absolute inset-0 bg-background] BEHIND the text, cn() base "relative flex flex-1 ... rounded-xl py-2.5 ... transition-colors duration-200" + conditional text-color only — HAS transition-colors [text color only], NO scale/ring/aria; the 2 tabs sit inside a `rounded-2xl bg-muted/50 p-1 ring-1 ring-border/25` container [NOT overflow-hidden], flex-1 with gap-1 between them):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO press-scale — tab-bar idiom [a sliding-pill segmented tab control, not a chip]; NO aria-pressed — selection is a tab pattern, idiomatic ARIA would be role=tab+aria-selected which is OUT of this minimal className+display-only scope, and aria-pressed would mislead; NO aria-label — visible constant text; KEEP transition-colors — NO new transform added so NO flip; OUTWARD ring-ring — the container is NOT overflow-hidden + has p-1 padding so a 2px outward ring is NOT clipped and renders against the neutral bg-muted/50, and the gap-1 between tabs leaves room).
   QUESTION Q-B1: OUTWARD ring-ring (container not overflow-hidden, p-1 padding) vs ring-inset (adjacent flex-1 neighbors)? My read: OUTWARD ring-ring — no overflow-hidden ancestor + p-1 + gap-1 means not clipped/not bleeding. Confirm or correct.
   QUESTION Q-B2: NO press-scale + NO aria-pressed for this sliding-pill tab control — confirm.

C. Copy link button (L410, RAW, ICON-ONLY Copy/Check, ALREADY aria-label="Copy link" KEEP, className "flex h-8 w-8 ... rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95" — ALREADY `transition` + hover:bg + active:scale-95, NO ring; sits inside a `rounded-xl bg-muted/40 px-3 py-2.5` input row [NOT overflow-hidden], inset within its padding):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95; KEEP `transition`; OUTWARD ring-ring — inset within the bg-muted/40 row padding, not clipped, neutral surface; KEEP aria-label).

D. Save QR button (L444, RAW, ICON + VISIBLE TEXT "Save QR", onClick={onDownload}, className "flex h-12 ... rounded-2xl border border-border/60 bg-card ... transition hover:bg-muted active:scale-[0.98]" — ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; sits in a `grid grid-cols-2 gap-3` on the page bg):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring on neutral page bg; NO aria-label — visible text).

E. Share button (L450, RAW, ICON + VISIBLE TEXT "Share", onClick={onShare}, className "flex h-12 ... rounded-2xl bg-foreground ... text-background ... transition hover:bg-foreground/90 active:scale-[0.98]" — DARK bg-foreground fill, ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; in the same grid on the page bg):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring — the bg-foreground is the button's OWN dark fill, the outward ring renders against the neutral page bg parent -> ring-ring; NO aria-label — visible text).

F. Open camera button (L538, RAW, ICON + VISIBLE TEXT "Open camera", onClick={onOpenCamera}, className "mt-6 flex h-12 ... rounded-2xl bg-foreground px-6 ... text-background ... transition hover:bg-foreground/90 active:scale-[0.98]" — DARK bg-foreground fill, ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; centered within a `rounded-3xl border bg-card overflow-hidden` scan-frame section's px-6 padding, NOT flush to the section edge):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring — centered within the section's px-6 padding so not flush/not clipped despite the section overflow-hidden, renders against neutral bg-card; NO aria-label — visible text).

G. (QUESTION) readOnly profile-link <input> (L404, value={profileUrl} readOnly, ALREADY aria-label="Profile link", className "min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none" — has `outline-none` but NO focus ring replacement; it's a readOnly URL-display input you can focus + select to copy; sits inside the same `rounded-xl bg-muted/40 px-3 py-2.5` row as the Copy button):
   QUESTION Q-G: should this readOnly input GAIN a focus ring (it's focusable but `outline-none` strips the native indicator with no replacement — a keyboard-focus gap)? My read: YES, append `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` (ring-inset because it's a flush-ish field inside the bg-muted/40 row; neutral surface -> ring-ring). OR is a readOnly display-only input out of scope (don't-churn / not a primary control)? Confirm ADD ring vs LEAVE.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The animated QR-icon header badge motion.div L182 (loop anim, NO onClick -> presentational) -> leave.
- The swipe-indicator dots motion.div L236 + the active-tab pill motion.span L215 + the QR breathing-glow motion.div L363 + the scan-frame corner-brackets/center-pulse/sweep-line motion.divs + the "How it works" list motion.divs L570 (all loop/entrance anim, NO onClick -> presentational/decorative) -> leave.
- All icons/text/the Tips list/the QRCodeSVG/the VerifiedBadge + the QRScannerModal child component -> decorative/out-of-file-scope.

QUESTIONS:
Q1. Back (A), Copy (C): APPEND ring-only + KEEP existing active:scale-95 + `transition` (no flip) + KEEP aria-labels + OUTWARD ring-ring — correct?
Q2. Tabs (B): APPEND ring-only + NO scale + NO aria-pressed + KEEP transition-colors (Q-B1 OUTWARD ring-ring vs inset; Q-B2 no-scale/no-aria-pressed for a sliding-pill tab) — confirm or correct.
Q3. Save QR (D), Share (E), Open camera (F): APPEND ring-only + KEEP active:scale-[0.98] + `transition` + OUTWARD ring-ring (dark bg-foreground fill on E/F still -> ring-ring on the neutral parent) + NO aria-label — correct?
Q4. readOnly input (G, Q-G): ADD a focus ring (ring-inset ring-ring) vs LEAVE as out-of-scope display input — your call?
Q5. Confirm the leave-untouched list (all presentational/loop motion.divs, the QRCodeSVG, VerifiedBadge, QRScannerModal child, all icons/text/Tips) is handled correctly.
Q6. At 375px, does the header (Back + animated badge + title/subtitle), the 2-tab switcher, the QR card (gradient header + breathing QR), the profile-link row (input + Copy), the 2-col Save/Share grid, and the Scan tab (scan frame + Open camera + How-it-works) lay out without crushing? And at iPad 768/1024 + desktop 1280 (content capped at max-w-2xl mx-auto, with a lg: two-column grid in both tabs — any concern)?

Please answer Q1-Q6 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/QRProfilePage.tsx

---

# QRProfilePage Premium Interaction Review

## Short Plan

This is a clean, well-structured page with 6 RAW `<button>`s and 1 readOnly `<input>`. All buttons already ship press scales + transitions — the universal gap is the **focus ring**. I'll confirm each planned edit and answer your 6 questions.

## Per-Control Analysis

### A. Header Back (L175)
**Plan: APPEND ring-only** ✅ Correct
- `transition` (shorthand) already covers transform → no flip needed
- `active:scale-95` pre-existing → keep
- OUTWARD `ring-ring` on neutral header → correct
- `aria-label="Back"` already present → keep

**Final className:**
```
"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### B. Tab Switcher Buttons (L204)
**Plan: APPEND ring-only, NO scale, NO aria-pressed** ✅ Correct

**Q-B1: OUTWARD ring-ring** ✅ Correct
- Container is `rounded-2xl bg-muted/50 p-1 ring-1 ring-border/25` — NOT overflow-hidden
- `p-1` padding + `gap-1` between tabs means a 2px outward ring won't clip or bleed into adjacent tab
- Neutral `bg-muted/50` surface → `ring-ring`

**Q-B2: NO press-scale + NO aria-pressed** ✅ Correct
- This is a **sliding-pill tab control** (framer `layoutId="qr-tab-pill"`), not a chip/segmented filter
- Tab-bar idiom: no press-scale, no aria-pressed
- Idiomatic ARIA would be `role="tab"` + `aria-selected` — out of scope for this className-only pass
- Constant visible labels → no aria-label needed

**Final cn() base (the shared part):**
```
"relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### C. Copy Link Button (L410)
**Plan: APPEND ring-only** ✅ Correct
- `transition` (shorthand) → no flip
- `active:scale-95` pre-existing → keep
- OUTWARD `ring-ring` — inset within `bg-muted/40` row padding, not clipped
- `aria-label="Copy link"` already present → keep

**Final className:**
```
"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### D. Save QR Button (L444)
**Plan: APPEND ring-only** ✅ Correct
- `transition` (shorthand) → no flip
- `active:scale-[0.98]` pre-existing → keep
- OUTWARD `ring-ring` on neutral page bg
- Visible text → no aria-label

**Final className:**
```
"flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card text-sm font-bold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### E. Share Button (L450)
**Plan: APPEND ring-only** ✅ Correct
- `transition` (shorthand) → no flip
- `active:scale-[0.98]` pre-existing → keep
- OUTWARD `ring-ring` — dark `bg-foreground` fill, but outward ring renders against **neutral page bg parent** → `ring-ring` ✅
- Visible text → no aria-label

**Final className:**
```
"flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### F. Open Camera Button (L538)
**Plan: APPEND ring-only** ✅ Correct
- `transition` (shorthand) → no flip
- `active:scale-[0.98]` pre-existing → keep
- OUTWARD `ring-ring` — centered within section's `px-6` padding, NOT flush to the `overflow-hidden` section edge → outward ring renders against neutral `bg-card` surface, not clipped ✅
- Visible text → no aria-label

**Final className:**
```
"mt-6 flex h-12 items-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### G. ReadOnly Input (L404) — **QUESTION Q-G**
**My recommendation: ADD focus ring** ✅

This is a focusable element (`readOnly` inputs are focusable by default) with `outline-none` stripping the native indicator. A keyboard user tabbing through the page would land here with no visible focus — that's a real a11y gap.

**Plan:**
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`
- `ring-inset` because it's a flush field inside the `bg-muted/40` row (no padding between input edge and row edge)
- Neutral surface → `ring-ring`

**Final className:**
```
"min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

## Answers to Your Questions

**Q1. Back (A), Copy (C):** ✅ Correct — APPEND ring-only, KEEP `active:scale-95`, KEEP `transition` (no flip), KEEP aria-labels, OUTWARD `ring-ring`.

**Q2. Tabs (B):** ✅ Correct — APPEND ring-only, NO scale, NO aria-pressed, KEEP `transition-colors` (no new transform). Q-B1: OUTWARD `ring-ring` (container not overflow-hidden, has p-1 + gap-1). Q-B2: NO scale + NO aria-pressed for sliding-pill tab control.

**Q3. Save QR (D), Share (E), Open camera (F):** ✅ Correct — APPEND ring-only, KEEP `active:scale-[0.98]`, KEEP `transition` (no flip), OUTWARD `ring-ring` (dark fill on E/F still → ring-ring on neutral parent), NO aria-label.

**Q4. ReadOnly input (G):** **ADD the focus ring** — it's a focusable element with `outline-none` and no replacement, creating a keyboard-focus gap. `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`.

**Q5. Leave-untouched list:** ✅ Correct — all presentational/loop `motion.div`s (header badge, swipe dots, tab pill, QR glow, scan-frame corners/pulse/sweep, how-it-works list), QRCodeSVG, VerifiedBadge, QRScannerModal child, all icons/text/Tips are correctly left untouched.

**Q6. Responsive layout at 375/768/1280:** ✅ No concerns.
- **375px:** Header (Back 40px + badge 40px + title/subtitle `min-w-0 flex-1`), 2-tab switcher (equal `flex-1` ~160px each), QR card (gradient header + 200px QR + profile-link row with `min-w-0 flex-1 truncate` input + 32px Copy button), 2-col Save/Share grid (each ~160px), Scan tab (scan frame 208px + Open camera button + How-it-works list) — all fit without crushing.
- **768/1024:** Same layout wider within `max-w-2xl` (672px) — comfortable.
- **1280:** Capped at `max-w-2xl` centered — no concern. The `lg:grid lg:grid-cols-[1fr_1fr]` on both tabs creates a nice two-column layout at desktop.

## Proposed Diff

```diff
--- a/src/pages/QRProfilePage.tsx
+++ b/src/pages/QRProfilePage.tsx
@@ -172,7 +172,7 @@ export default function QRProfilePage() {
         <div className="mx-auto flex max-w-2xl items-center gap-3">
           <button
             onClick={goBack}
             aria-label="Back"
-            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95"
+            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-5 w-5" />
           </button>
@@ -207,7 +207,7 @@ export default function QRProfilePage() {
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={cn(
-                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200",
+                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeTab === tab
                   ? "text-foreground"
                   : "text-muted-foreground hover:text-foreground/70"
@@ -401,7 +401,7 @@ function MyCodeTab({
             <input
               value={profileUrl}
               readOnly
               aria-label="Profile link"
-              className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none"
+              className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
             />
             <button
               onClick={onCopy}
               aria-label="Copy link"
-              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
+              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <AnimatePresence mode="wait" initial={false}>
@@ -441,7 +441,7 @@ function MyCodeTab({
         <div className="grid grid-cols-2 gap-3">
           <button
             onClick={onDownload}
-            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card text-sm font-bold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98]"
+            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card text-sm font-bold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Download className="h-4 w-4" /> Save QR
           </button>
           <button
             onClick={onShare}
-            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98]"
+            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Share2 className="h-4 w-4" /> Share
           </button>
@@ -535,7 +535,7 @@ function ScanTab({ onOpenCamera }: { onOpenCamera: () => void }) {
 
           <button
             onClick={onOpenCamera}
-            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98]"
+            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Camera className="h-4 w-4" /> Open camera
           </button>
```

## Summary

| Control | Change | Scale | Transition | Ring | ARIA |
|---------|--------|-------|------------|------|------|
| A. Back | APPEND ring | KEEP `scale-95` | KEEP `transition` | OUTWARD `ring-ring` | KEEP `aria-label="Back"` |
| B. Tabs ×2 | APPEND ring | NO scale | KEEP `transition-colors` | OUTWARD `ring-ring` | NO aria-pressed |
| C. Copy | APPEND ring | KEEP `scale-95` | KEEP `transition` | OUTWARD `ring-ring` | KEEP `aria-label="Copy link"` |
| D. Save QR | APPEND ring | KEEP `[0.98]` | KEEP `transition` | OUTWARD `ring-ring` | NO aria-label |
| E. Share | APPEND ring | KEEP `[0.98]` | KEEP `transition` | OUTWARD `ring-ring` | NO aria-label |
| F. Open camera | APPEND ring | KEEP `[0.98]` | KEEP `transition` | OUTWARD `ring-ring` | NO aria-label |
| G. Input | ADD ring | N/A | N/A | INSET `ring-ring` | KEEP `aria-label="Profile link"` |

**7 edits total, 0 logic lines touched, 0 transition flips, 0 scale renumbers, 0 aria-label changes.** Ready to apply.
