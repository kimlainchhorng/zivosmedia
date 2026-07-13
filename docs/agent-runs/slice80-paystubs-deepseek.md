# DeepSeek run — 2026-06-14T12:19:20.178Z

- model: deepseek-chat
- task: You are reviewing ONE React + Tailwind page for a premium-feel interaction + accessibility token pass. The codebase has a strict, established design-token vocabulary. Propose ONLY className-string changes and display-only ARIA attributes (aria-label / aria-pressed / aria-expanded). DO NOT propose any logic, role, tabIndex, onKeyDown, structural, or data changes. Preserve all queries/handlers byte-identical.

FILE: src/pages/app/personal/PersonalPayStubsPage.tsx — a customer "Pay Stubs / Earnings History" page inside <AppLayout title="Pay Stubs" hideHeader>. A back button + a YTD summary grid + a list of monthly earnings periods, each an expandable accordion card (toggle header reveals a transactions panel + a "Download PDF" button that generates a jsPDF).

DESIGN TOKENS (house rules):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD by default; `ring-inset` ONLY for a flush edge child of a rounded overflow-hidden PARENT, or a flush media tile in a near-gapless grid. KEY NUANCE: a control inside a PADDED (p-1/p-4) overflow-hidden track is NOT a flush edge child — the outward ring renders within the padding → OUTWARD, not inset.
- Ring color: `--ring` resolves BLACK. Outward ring renders against the control's PARENT surface: neutral parent (bg-card/background/muted) = ring-ring; saturated/dark/image parent = ring-white/70. For an INSET ring it renders over the control's OWN surface — neutral = ring-ring.
- Press-scale tiers (CSS): icon-only active:scale-95; small text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale.
- "No second competing press": a control that ALREADY has a press effect (framer whileTap, OR an existing CSS active:scale, OR active:bg-wash, OR active:opacity) gets ring-ONLY — do NOT add a second CSS active:scale.
- transition rule: `transition-transform` if scale is the only animated CSS prop on the button; `transition-all` if also hover bg/text/border/opacity. A `transition-colors`/`transition-opacity` GAINING a new active:scale must FLIP to transition-all. A button with NO transition class GAINING only a new active:scale gets a fresh `transition-transform`. Adding ONLY a focus ring (no new animated prop) → leave/skip the transition.
- aria: aria-label ONLY on icon-only / image-only controls. aria-expanded on a disclosure/accordion toggle whose open/closed state it controls. aria-pressed ONLY on a persistent single-select segmented filter/tab.
- shadcn <Button>/<Badge> ship own focus/scale tokens → LEAVE.

CONTROLS in this file:
1. L153 Back button (icon-only <button>, lucide ArrowLeft). aria-label="Go back" present. className: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` (ALREADY active:scale-90 + transition-transform). Parent = the page content area (neutral AppLayout bg).
2. L209 period accordion-toggle <button> (the card header; toggles `expanded`). className: `w-full flex items-center justify-between p-4` (NO transition, NO scale, NO ring, NO aria). It fills a parent `motion.div` with `rounded-2xl bg-card border border-border/40 overflow-hidden` (the button is the flush top child of that rounded overflow-hidden card; the button itself has NO own bg — the card provides the surface). The header shows a chevron Up/Down reflecting `expanded === p.id`. onClick toggles expanded.
3. L257 "Download PDF" <button> (inside the expanded panel). className: `w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-[12px] font-bold text-foreground` (has OWN surface bg-muted/30 + hover:bg-muted/50 + transition-colors; NO scale, NO ring). Visible text "Download PDF". It sits inside the expanded panel `px-4 pb-4` (so it is inset by px-4 padding from the card's rounded overflow-hidden edges, NOT flush). Parent surface = neutral bg-card.

For EACH control: state (a) add/skip a focus ring + its exact tokens incl. ring color + inset/outward, (b) add/skip a press scale + which tier, (c) add/skip aria (which attribute), (d) whether the transition class must flip or be freshly added. Give the EXACT final className string. Resolve specifically: control 2's press tier (wide full-width row WITH own surface = [0.98], vs BARE full-width row = [0.99] — the button has no own bg but fills a bg-card card) and whether control 2's ring is INSET (flush child of overflow-hidden card) or OUTWARD; and whether control 2 should get aria-expanded. Flag anything needing a structural change as OUT OF SCOPE. Be precise and terse.
- files: src/pages/app/personal/PersonalPayStubsPage.tsx

---

## Plan

Three controls need token updates:

1. **Back button (L153)** — Already has `active:scale-90` + `transition-transform`. Ring-ONLY (no second press). Outward `ring-ring` on neutral parent. Keep existing `aria-label`.

2. **Period accordion toggle (L209)** — Wide full-width row filling a `bg-card` card. The button has **no own surface** (the card provides the bg), so it's a **BARE full-width row** → `active:scale-[0.99]`. **INSET ring** because it's the flush top child of a `rounded-2xl overflow-hidden` parent — an outward ring would be clipped. Add `aria-expanded` (disclosure toggle). Fresh `transition-transform` (only scale animates).

3. **"Download PDF" button (L257)** — Has own surface `bg-muted/30` + `hover:bg-muted/50` + `transition-colors`. Medium button tier → `active:scale-[0.98]`. Must **FLIP** `transition-colors` → `transition-all` (gaining a scale). Outward `ring-ring` (inset by `px-4` padding from the overflow-hidden card edge). No aria (visible text).

## Diff

```diff
--- a/src/pages/app/personal/PersonalPayStubsPage.tsx
+++ b/src/pages/app/personal/PersonalPayStubsPage.tsx
@@ -150,7 +150,7 @@ export default function PersonalPayStubsPage() {
           <button
             type="button"
             aria-label="Go back"
-            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
+            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="w-4 h-4" />
           </button>
@@ -196,7 +196,8 @@ export default function PersonalPayStubsPage() {
               <button
                 type="button"
-                className="w-full flex items-center justify-between p-4"
+                aria-expanded={expanded === p.id}
+                className="w-full flex items-center justify-between p-4 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                 onClick={() => setExpanded(expanded === p.id ? null : p.id)}
               >
                 <div className="flex items-center gap-3">
@@ -244,7 +245,7 @@ export default function PersonalPayStubsPage() {
                       <button
                         type="button"
                         onClick={() => downloadPeriod(p)}
-                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-[12px] font-bold text-foreground"
+                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all text-[12px] font-bold text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <Download className="w-3.5 h-3.5" /> Download PDF
                       </button>
```

## Key decisions

| Control | Ring | Press scale | Aria | Transition |
|---------|------|-------------|------|------------|
| **1. Back button** | OUTWARD `ring-ring` (neutral parent) | **SKIP** (already `active:scale-90`) | Keep existing `aria-label` | Leave `transition-transform` |
| **2. Accordion toggle** | **INSET** `ring-ring` (flush child of `rounded-2xl overflow-hidden` card) | `active:scale-[0.99]` (BARE full-width row — no own surface, fills card bg) | **ADD** `aria-expanded={expanded === p.id}` | Fresh `transition-transform` |
| **3. Download PDF** | OUTWARD `ring-ring` (inset by `px-4` padding from overflow-hidden edge → not flush) | `active:scale-[0.98]` (medium button with own surface) | **SKIP** (visible text) | **FLIP** `transition-colors` → `transition-all` |

## Owner verification

- **Control 2's INSET ring**: The `overflow-hidden` on the parent `motion.div` clips outward rings on flush-edge children. The `p-4` padding is on the button itself, not the parent — the button is flush to the card's top edge. INSET is correct.
- **Control 2's `aria-expanded`**: This is a disclosure toggle controlling the `AnimatePresence` panel below. `aria-expanded` is the correct semantic attribute (not `aria-pressed`).
- **Control 3's OUTWARD ring**: The `px-4 pb-4` padding on the expanded panel's `motion.div` creates 16px horizontal inset from the card's overflow-hidden edge — the button is not flush, so outward ring renders cleanly.
- Run `npm run update` to verify type-check + build pass.
