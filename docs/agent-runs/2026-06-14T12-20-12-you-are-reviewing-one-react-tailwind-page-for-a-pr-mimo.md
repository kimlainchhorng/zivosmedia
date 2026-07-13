# MiMo run — 2026-06-14T12:20:12.335Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

Three controls need tokens. Analysis below, then the exact diffs.

---

### Control 1 — L153 Back button (icon-only)

| Aspect | Verdict |
|--------|---------|
| **Press** | Already `active:scale-90` → **ring-ONLY**, no second competing scale |
| **Ring** | APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — **OUTWARD** (parent is neutral page content area) |
| **aria** | `aria-label="Go back"` already present → keep, nothing new |
| **Transition** | Only adding a ring (no new animated CSS prop) → leave `transition-transform` as-is |

**Final className (unchanged tokens kept verbatim):**
```
w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

### Control 2 — L209 accordion toggle button

**Ring — INSET, not OUTWARD.** The button's outer edge sits flush against the parent `motion.div`'s clip boundary (`rounded-2xl overflow-hidden`). There is no padding/gap between the button and the card edge. An outward ring would extend outside the button → clipped by the parent's `overflow-hidden`. So: `ring-inset`.

**Press — `active:scale-[0.99]` (BARE full-width row, no own surface).** The button has no `bg` class of its own; the parent card provides `bg-card`. This is "BARE full-width row NO own surface" → `[0.99]`, not `[0.98]`.

**aria-expanded — YES.** This is a disclosure/accordion toggle (controls whether the transaction panel is shown). Add `aria-expanded={expanded === p.id}`.

**Transition — fresh `transition-transform`.** No existing transition class; gaining only `active:scale` (the ring is focus-visible, not a CSS-animated prop) → `transition-transform`.

**Final className:**
```
w-full flex items-center justify-between p-4 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-transform
```

---

### Control 3 — L257 "Download PDF" button

| Aspect | Verdict |
|--------|---------|
| **Press** | No existing scale → fresh `active:scale-[0.98]` (medium chip/pill/button tier; has own surface `bg-muted/30`) |
| **Ring** | APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — **OUTWARD** (the button sits inside `px-4 pb-4` padding of the expanded panel, inset from the card's overflow-hidden edges → not a flush edge child; parent surface is neutral `bg-card`) |
| **aria** | Visible text "Download PDF" → no aria-label. Not a toggle → no aria-expanded/aria-pressed. |
| **Transition** | Has `transition-colors`, gaining new `active:scale` → **FLIP** to `transition-all` |

**Final className:**
```
w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all text-[12px] font-bold text-foreground
```

---

## Proposed diff

```diff
--- a/src/pages/app/personal/PersonalPayStubsPage.tsx
+++ b/src/pages/app/personal/PersonalPayStubsPage.tsx
@@ -153,7 +153,7 @@
             type="button"
             aria-label="Go back"
             onClick={() => navigate(-1)}
-            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
+            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="w-4 h-4" />
           </button>
@@ -209,7 +209,9 @@
                 <button
                   type="button"
-                  className="w-full flex items-center justify-between p-4"
+                  aria-expanded={expanded === p.id}
+                  className="w-full flex items-center justify-between p-4 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-transform"
                   onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                 >
@@ -257,7 +259,7 @@
                       <button
                         type="button"
                         onClick={() => downloadPeriod(p)}
-                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-[12px] font-bold text-foreground"
+                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all text-[12px] font-bold text-foreground"
                       >
                         <Download className="w-3.5 h-3.5" /> Download PDF
```

---

## Guard tally

| Metric | Count |
|--------|-------|
| className edits | 3 |
| New aria attrs | 1 (`aria-expanded` on #2) |
| New aria-label | 0 (#1's pre-existing kept) |
| New aria-pressed | 0 |
| focus-visible:ring | 3 (controls 1, 2, 3) |
| ring-ring | 2 (#1 OUTWARD, #3 OUTWARD) |
| ring-inset | 1 (#2 — flush child of overflow-hidden card) |
| active:scale new | 2 (#2 `[0.99]`, #3 `[0.98]`) |
| active:scale kept | 1 (#1 `scale-90`) |
| FLIPs | 1 (#3 `transition-colors` → `transition-all`) |
| Fresh transitions | 1 (#2 `transition-transform`) |
| Logic lines touched | 0 |

## Owner verification

1. Run `npm run update` — must pass (0 type errors + worker + build).
2. Visual: confirm control 2's inset ring renders correctly inside the rounded card at 375/768/1280 (the ring traces the button's edges, visible inside the card, not clipped).
3. Visual: confirm control 2's `active:scale-[0.99]` press feels right on the full-width accordion header (subtle — it's a bare row with no own bg).
4. The shadcn `<Badge variant="outline">` inside the accordion header (L222) ships its own tokens → left untouched (correct).
5. No logic, role, tabIndex, onKeyDown, structural, or data changes — className + 1 display-only `aria-expanded` only.
