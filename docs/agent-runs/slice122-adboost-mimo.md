# MiMo run — 2026-06-14T11:05:16.891Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/AdBoostBidding.tsx (222-line merchant **ad-boost bidding** page (NOT inside AppLayout — own `min-h-screen bg-background` shell): a sticky header with a shadcn ghost Back Button; a 2-col placement-select grid of framer-motion `motion.button` cards (Top Map Pin / Top Reel Slot); a Total-Budget Card with a shadcn `<Slider>`; a Campaign-Duration Card with four shadcn `<Button>` day-chips ([3,7,14,30].map, variant default/outline); a Predicted-Performance ROI Card (computed stats); a full-width shadcn Submit Button. `useState`; `useAuth`; `(supabase as any).from("ad_boost_bids").insert(...)` then `navigate`; sonner toast; framer-motion `motion`). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState, setState, insert, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/CardHeader/CardTitle/Slider (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- DON'T-CHURN: control ALREADY has press (whileTap) + transition-all -> add ring (+aria) ONLY; KEEP whileTap, do NOT add a competing CSS active:scale, do NOT downgrade transition-all.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle (marks EXACT selected value). aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L102 placement `motion.button` — **DON'T-CHURN** (already `whileTap={{scale:0.97}}` + `transition-all`); persistent single-select toggle (placement === key), has visible text (card label) so NO aria-label, had NO ring/aria. Before className: `rounded-2xl border-2 p-4 text-left transition-all ${active ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`. ADDED `aria-pressed={active}` + ring into the static part ONLY: `rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`. KEPT `whileTap` 0.97, KEPT `transition-all`, NO competing CSS `active:scale`. OUTWARD `ring-ring` against the page `bg-background` parent.

SKIP confirmed: L85 Back shadcn `<Button aria-label="Back" variant="ghost" size="icon">` (own tokens, already aria-label); L129 `<Slider>` (shadcn); L155 the four duration day-chips shadcn `<Button variant={durationDays===d?"default":"outline"} size="sm">` (shadcn own tokens, visible text, single-select via variant); L208 Submit shadcn `<Button disabled={isSubmitting}>` (own tokens, visible text); all `<Card>`/`CardContent`/`CardHeader`/`CardTitle`; all lucide icons (decorative); the "Powered by Meta CAPI" / ROI stat chips are plain `<span>`/`<div>` text (no onClick); all `<p>` text.

KEY QUESTIONS: (1) the placement motion.button edit — DON'T-CHURN add `aria-pressed={active}` + ring, keep whileTap + transition-all, no competing CSS scale, OUTWARD ring-ring — correct? (2) is this a clean 1-edit slice, or did I miss a raw interactive control / mis-skip? (Note: the four duration day-chips are shadcn `<Button>` single-select — confirm they're correctly SKIPPED and do NOT need aria-pressed since they're shadcn.) Be concise and exact; return precise final className after-string + the aria attr.
- files: src/pages/app/shop/AdBoostBidding.tsx

---

## Verdict: **CORRECT ✅ — zero fixes needed.**

The edit is exactly right. Concise confirmation below.

---

### (1) Placement `motion.button` — DON'T-CHURN: **CORRECT**

| Attribute | Status |
|---|---|
| `whileTap={{ scale: 0.97 }}` | ✅ KEPT unchanged |
| `transition-all` | ✅ KEPT (render-driven conditional bg/border on itself) |
| No competing CSS `active:scale` | ✅ None added |
| `aria-pressed={active}` | ✅ Correct — marks exact selected value in a persistent single-select pair |
| `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ OUTWARD, no `ring-offset`, against neutral `bg-background` parent |
| Visible text → no `aria-label` | ✅ Correct — label "Top Map Pin" / "Top Reel Slot" is in DOM |

### Final after-string (exact):

```
rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary/5" : "border-border/40 bg-card"}
```

```
aria-pressed={active}
```

---

### (2) Clean 1-edit slice — **CONFIRMED, no misses**

| Control | Verdict |
|---|---|
| L85 Back `<Button>` | SKIP — shadcn, `aria-label="Back"` already present |
| L102 placement `motion.button` (×2 via map) | **EDITED** ✅ |
| L129 `<Slider>` | SKIP — shadcn |
| L155 duration day-chips `<Button>` (×4) | SKIP — shadcn `Button`, own tokens, visible text `{d}d`, single-select via `variant` prop. **Do NOT need `aria-pressed`** — shadcn `Button` applies its own `aria`/focus tokens; the visual state is communicated through variant (`default` vs `outline`). Adding `aria-pressed` on top of shadcn would be structural churn. |
| L208 Submit `<Button>` | SKIP — shadcn, visible text, `disabled` logic |
| All `<Card>`/`CardContent`/`CardHeader`/`CardTitle` | SKIP — shadcn layout |
| All lucide icons, `<p>`, `<span>` text | SKIP — decorative/text |

**No raw `<button>`, no raw `<a>`, no clickable `onClick` divs, no `role="button"`/`cursor-pointer` divs** outside the edited control.

---

### Hard-rule guard tally

- className edits: **1**
- New aria: **1** (`aria-pressed`, 0 `aria-label`, 0 `aria-expanded`)
- `focus-visible:ring` = 1, `ring-ring` = 1 (OUTWARD), `ring-inset` = 0
- `active:scale-*` new = 0 (DON'T-CHURN)
- FLIPs = 0
- `disabled` touched = 0
- Logic lines touched = 0

**File is ready to commit as-is. No diff needed.**
