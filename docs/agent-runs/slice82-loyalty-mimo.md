# MiMo run — 2026-06-14T12:32:29.576Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: You are reviewing ONE React + Tailwind page for a premium-feel interaction + accessibility token pass. The codebase has a strict, established design-token vocabulary. Propose ONLY className-string changes and display-only ARIA attributes (aria-label / aria-pressed). DO NOT propose any logic, role, tabIndex, onKeyDown, structural, or data changes. Preserve all queries/handlers byte-identical.

FILE: src/pages/account/LoyaltyPage.tsx — a customer "ZIVO Points" loyalty page (app-native layout, no web header). A sticky app header with an icon-only Back button; a balance card; a shadcn <Tabs> with 5 icon-only <TabsTrigger>s (overview/levels/history/rewards/refer); inside the tabs: shadcn <Card>s, a "View All" shadcn <Button>, reward cards each with a "Redeem" shadcn <Button>, non-interactive history rows, and a referral card.

DESIGN TOKENS (house rules):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD by default; ring-inset ONLY for a flush edge child of a rounded overflow-hidden PARENT, or a flush media tile in a near-gapless grid.
- Ring color: `--ring` resolves BLACK. Outward ring renders against the control's PARENT surface: neutral parent (bg-card/background/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or a ring rendering directly OVER photographic media) = ring-white/70.
- Press-scale tiers (CSS): icon-only active:scale-95; small text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row active:scale-[0.99]. Don't renumber an existing scale.
- "No second competing press": a control that ALREADY has a press effect (framer whileTap, existing CSS active:scale, active:bg-wash, active:opacity) gets ring-ONLY.
- transition rule: `transition-transform` if scale is the only animated CSS prop; `transition-all` if also hover bg/text/border/opacity. A `transition-colors`/`transition-opacity` GAINING a new active:scale must FLIP to transition-all. ALREADY `transition-all` → append without flipping. A button with NO transition class GAINING only a new active:scale gets a fresh `transition-transform`.
- aria: aria-label ONLY on icon-only / image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker whose on/off is bg-conveyed.
- shadcn <Button>/<Tabs>/<TabsTrigger>/<Card>/<Badge> ship own focus/scale tokens → LEAVE. Raw <input> with native focus tokens → LEAVE.

CONTROLS in this file:
1. L88 Back button (icon-only <button>, lucide ArrowLeft). NO aria-label present. onClick={() => navigate(-1)}. className: `w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center` (NO transition, NO scale, NO ring). It sits in a sticky header `sticky top-0 ... bg-background/80 backdrop-blur-xl border-b` — a NEUTRAL parent surface (not over media).

For the Back button: state (a) add/skip a focus ring + its exact tokens incl. ring color (ring-ring vs ring-white/70) + inset/outward, (b) add/skip a press scale + which tier, (c) add/skip aria-label (icon-only, no visible text) and whether aria-pressed applies, (d) whether the transition class must be freshly added (none currently → fresh transition-transform?). Give the EXACT final className string + the exact aria attribute. Confirm: ring-ring OUTWARD (neutral sticky header, not over media)? icon-tier active:scale-95? fresh transition-transform? aria-label="Go back"? Confirm the 5 icon-only shadcn <TabsTrigger>s and all shadcn <Button>s are LEFT (ship own tokens). Flag anything needing a structural change as OUT OF SCOPE. Be precise and terse.
- files: src/pages/account/LoyaltyPage.tsx

---

## Plan

Only **one raw interactive control** exists in this file: the icon-only Back `<button>` (L88). Everything else is either shadcn (own tokens) or non-interactive `<div>` wrappers. One edit.

---

## Proposed change

**File:** `src/pages/account/LoyaltyPage.tsx`

**L88 — Back `<button>`** (icon-only, no transition/scale/ring/aria)

```diff
-          <button type="button"
+          <button type="button"
             onClick={() => navigate(-1)}
-            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
+            aria-label="Go back"
+            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
```

**Rationale per token:**

| Token | Why |
|-------|-----|
| `aria-label="Go back"` | Icon-only (ArrowLeft, no visible text) |
| `transition-transform` | Fresh — no prior transition; only animated prop is `active:scale` |
| `active:scale-95` | Icon-only tier; no existing press effect |
| `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | Neutral parent (`bg-background/80` sticky header), not over media → OUTWARD `ring-ring` |

**Confirmed skipped:**
- `aria-pressed` — one-shot nav, not a persistent toggle ✗
- `ring-inset` — not a flush child of `overflow-hidden` ✗
- `ring-white/70` — parent is neutral bg, not over media ✗
- 5× shadcn `<TabsTrigger>`s — ship own tokens ✗
- "View All" `<Button variant="ghost">` + "Redeem" `<Button>` — shadcn, own tokens ✗
- `HistoryItem` rows, pending-redemption rows, reward-card wrappers — non-interactive `<div>`s (no `onClick`) ✗

---

## Owner verification

- **`npm run update`** must pass (0 TypeScript errors + production build).
- Guard: exactly 1 className edit, 1 new `aria-label`, 0 logic lines changed. The `onClick={() => navigate(-1)}` is byte-identical.
- No structural changes needed. The 5 icon-only `<TabsTrigger>`s could optionally get `aria-label`s for screen-reader discoverability (they only contain lucide icons), but that's a shadcn structural concern → **FLAGGED as OUT OF SCOPE** per the rule that shadcn ships own tokens.
