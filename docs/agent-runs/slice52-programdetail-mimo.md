# MiMo run — 2026-06-14T05:38:25.087Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). I am applying a premium interaction + accessibility token pass to src/pages/ProgramDetailPage.tsx (individual monetization-program detail). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, Link `to`, react-query, mutations byte-identical. Do NOT add second competing press effects; don't churn already-polished controls.

DESIGN TOKEN VOCABULARY (house standard, must match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/muted) = ring-ring; saturated gradient/image surface as the PARENT = ring-white/70. A gradient-FILLED or low-opacity-tinted button sitting ON a neutral parent still uses ring-ring (ring renders against neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card with its own bordered surface active:scale-[0.98]; BARE full-width row no surface active:scale-[0.99].
- transition rule: transition-transform when scale is ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a new active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/toggle whose on/off is bg-conveyed. aria-expanded on a disclosure/accordion. NOT aria-pressed on one-shot actions or modal openers.
- Link-wrapping-card pattern: a bare or className-less react-router <Link> wrapping a styled card child — the ring belongs on the <Link> (the Tab target); add radius matching the card (rounded-xl) + ring tokens to the Link; the card child keeps its own active:scale.
- No-op policy: if a control already ships active:scale + transition, append ring ONLY; do not renumber, do not stack a second scale.

CONTROLS IN THIS FILE (give me, per control: exact after-string of appended/changed classes, ring color choice with reason, press tier, transition class, and any aria-* attr):

A) L446 program-not-found fallback: `<button onClick=navigate("/monetization") className="mt-4 text-primary font-semibold text-sm">← Back to Monetization`. Bare text link, no scale/ring/transition.

B) L468 header Back icon button: `className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"` onClick navigate("/monetization"). Icon-only (ArrowLeft). No aria-label, no scale, no transition class (only hover:bg).

C) L472 header Share icon button: `className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"` onClick copies link to clipboard + toast. Icon-only (Share2). No aria-label/scale/transition.

D) L524 "Leave Program" button: `className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"`. Already has scale+transition. Bordered button on neutral page bg.

E) L533 "Join Program — It's Free" button: `className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"` + inline style background:linear-gradient(135deg, accent, accent cc) (gradient-filled). Sits full-width on neutral page bg (bg-background). Already has scale+transition. → confirm ring COLOR (ring-ring vs ring-white/70) given gradient fill but neutral parent.

F) L547 tab nav buttons ×3 (overview/earnings/stories): inside parent `flex gap-1 p-1 rounded-xl bg-muted/40` (NOT overflow-hidden, has p-1 padding). Each: `className={flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${activeTab===tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}}` onClick setActiveTab(tab). Persistent single-select segmented filter, selection bg-conveyed.

G) L638 FAQ accordion buttons ×N: `className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"` onClick toggles expandedFaq (i or null). Has a ChevronRight that rotate-90 when open. No scale/transition class. Full-width bordered card disclosure.

H) L727 "Go to Wallet": `<Link to="/wallet" className="block">` wrapping `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`. Card child already has scale.

I) L801 related-programs `<Link key to={`/monetization/program/${rp.id}`}>` (NO className) wrapping `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`.

J) L817/L827/L837 bottom Links ×3 (Creator Academy /monetization/articles, Creator Dashboard /creator-dashboard, All Programs /monetization): each `<Link to=...>` (NO className) wrapping a `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`.

For each control return the precise final className after-string (or the new className to add on a bare Link) plus any aria attribute. Flag any control I should LEAVE untouched. Be concise and exact.
- files: src/pages/ProgramDetailPage.tsx

---

## Plan

10 controls (A–J) across `src/pages/ProgramDetailPage.tsx`. 5 get FRESH scale+transition+ring (A bare text, B/C icon buttons, F segmented tabs, G FAQ accordion). 2 get ring-only (D/E already have scale+transition). 3+ get the Link-wrapping-card ring pattern (H/I/J). New aria: `aria-label` on B+C (icon-only), `aria-pressed` on F (segmented filter), `aria-expanded` on G (disclosure). All rings outward `ring-ring` (neutral parent surfaces throughout).

---

## Proposed diff — `src/pages/ProgramDetailPage.tsx`

### A) Fallback "← Back to Monetization" — small text-link tier

```diff
- <button type="button" onClick={() => navigate("/monetization")} className="mt-4 text-primary font-semibold text-sm">
+ <button type="button" onClick={() => navigate("/monetization")} className="mt-4 text-primary font-semibold text-sm active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### B) Header Back icon button — icon tier, FRESH transition-all+scale-95+ring

```diff
- <button type="button" onClick={() => navigate("/monetization")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+ <button type="button" onClick={() => navigate("/monetization")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### C) Header Share icon button — icon tier, same treatment

```diff
- <button type="button"
+ <button type="button"
     onClick={() => {
       navigator.clipboard.writeText(`${window.location.origin}/monetization/program/${programId}`);
       toast.success("Link copied!");
     }}
-   className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
+   aria-label="Share link"
+   className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
   >
```

### D) "Leave Program" — ring-only (already has scale+transition)

```diff
-   className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"
+   className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### E) "Join Program — It's Free" — ring-only (already has scale+transition)

```diff
-   className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"
+   className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Ring color: `ring-ring`** — the button's gradient fill is its own surface; the ring renders against the PARENT which is neutral `bg-background`. Not `ring-white/70`.

### F) Tab nav buttons ×3 — segmented filter: FLIP transition-colors→transition-all + ADD aria-pressed + scale + ring

```diff
-           className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
+           aria-pressed={activeTab === tab}
+           className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
               activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
-           }`}
+           } active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
```

FLIP mandatory — `transition-colors` gaining new `active:scale` → `transition-all` (eases the bg/text color change + the new scale). Parent `bg-muted/40` with `p-1` is NOT `overflow-hidden`, so outward ring, not inset. `gap-1` is tight (4px) but the `ring-2` (2px each side) extends slightly beyond the `p-1` gap — visually acceptable and consistent with other segmented rows.

### G) FAQ accordion buttons ×N — wide bordered-row tier + aria-expanded

```diff
-   className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"
+   className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Add `aria-expanded` attribute:
```diff
     onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
-   className="w-full rounded-xl ..."
+   aria-expanded={expandedFaq === i}
+   className="w-full rounded-xl ..."
```

### H) "Go to Wallet" Link — Link-wrapping-card pattern

```diff
- <Link to="/wallet" className="block">
+ <Link to="/wallet" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

Card child div keeps its existing `active:scale-[0.98] transition-transform`.

### I) Related programs Links ×N — Link-wrapping-card pattern

```diff
- <Link key={rp.id} to={`/monetization/program/${rp.id}`}>
+ <Link key={rp.id} to={`/monetization/program/${rp.id}`} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### J) Bottom Links ×3 — Link-wrapping-card pattern

```diff
- <Link to="/monetization/articles">
+ <Link to="/monetization/articles" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

```diff
- <Link to="/creator-dashboard">
+ <Link to="/creator-dashboard" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

```diff
- <Link to="/monetization">
+ <Link to="/monetization" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Summary table

| Ctrl | Tier | Scale | Transition | Ring | Aria |
|------|------|-------|------------|------|------|
| A | small text-link | FRESH `[0.97]` | FRESH `transition-transform` | `ring-ring` (neutral page) | — |
| B | icon-only | FRESH `95` | FRESH `transition-all` (eases hover:bg) | `ring-ring` (neutral header) | `aria-label="Back"` |
| C | icon-only | FRESH `95` | FRESH `transition-all` (eases hover:bg) | `ring-ring` (neutral header) | `aria-label="Share link"` |
| D | wide bordered | KEEP `[0.98]` | KEEP `transition-transform` | `ring-ring` (neutral page) | — |
| E | wide gradient-fill | KEEP `[0.98]` | KEEP `transition-transform` | `ring-ring` (neutral parent, NOT fill) | — |
| F ×3 | segmented filter | FRESH `[0.97]` | FLIP → `transition-all` | `ring-ring` (neutral tint) | `aria-pressed={activeTab === tab}` |
| G ×N | wide bordered disclosure | FRESH `[0.98]` | FRESH `transition-transform` | `ring-ring` (neutral page) | `aria-expanded={expandedFaq === i}` |
| H | Link-wrapping-card | — (child keeps `[0.98]`) | — (child keeps) | `ring-ring` (neutral page) | — |
| I ×N | Link-wrapping-card | — (child keeps `[0.98]`) | — (child keeps) | `ring-ring` (neutral page) | — |
| J ×3 | Link-wrapping-card | — (child keeps `[0.98]`) | — (child keeps) | `ring-ring` (neutral page) | — |

**Diff counts:** 13 className edits (A×1, B×1, C×1, D×1, E×1, F×1 template, G×1 template, H×1, I×1 template, J×3), 4 new aria attrs (2 `aria-label`, 1 `aria-pressed`, 1 `aria-expanded`), 5 FRESH scales, 1 FLIP, 5 ring-only, 0 logic lines, 0 `ring-inset`, 0 `ring-white/70`.

---

## Owner verification

1. Run `npm run update` — must be TRUE EXIT 0 (type-check + worker type-check + production build).
2. Visual check: tab segmented row at 375px — confirm the `gap-1` (4px) doesn't clip the outward 2px ring awkwardly. If it does, the parent `p-1` can be bumped to `p-1.5` (cosmetic only, separate fix).
3. Preview at `/monetization/program/creator-rewards` (or any program slug) — verify all controls respond to Tab/keyboard focus with visible rings, and the FAQ accordion shows `aria-expanded` toggling.
