# DeepSeek run — 2026-06-14T12:32:06.357Z

- model: deepseek-chat
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

# LoyaltyPage.tsx — Premium Interaction + A11y Token Pass

## Plan

Only **one raw interactive control** in this file needs tokens: the icon-only Back button (L88). All other interactive elements are shadcn `<Button>`, `<TabsTrigger>`, `<Badge>` — they ship their own focus/scale tokens and are LEFT untouched.

## Proposed Change

**File:** `src/pages/account/LoyaltyPage.tsx`

**Control:** L88 Back `<button>` (icon-only `ArrowLeft`, `onClick={() => navigate(-1)}`)

**Before className:**
```
w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center
```

**After className:**
```
w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Added aria:**
```
aria-label="Go back"
```

**Decision rationale:**
- **Ring:** `ring-ring` OUTWARD — the button sits in a `bg-background/80 backdrop-blur-xl` sticky header (neutral parent, not over photographic media). No `ring-inset` needed (not a flush child of a `rounded overflow-hidden` parent).
- **Press scale:** `active:scale-95` — icon-only tier. No existing press effect (no `whileTap`, no CSS `active:scale`, no `active:bg` wash), so a fresh scale is added.
- **Transition:** `transition-transform` — only the new `active:scale` is animated; no hover bg/border/opacity changes to animate.
- **Aria:** `aria-label="Go back"` — icon-only control with no visible text. `aria-pressed` does NOT apply (one-shot navigation, not a persistent toggle).

**Controls LEFT untouched (ship own tokens):**
- 5× `<TabsTrigger>` (shadcn — own focus/scale)
- 2× `<Button>` (shadcn — "View All" + "Redeem"/"Need more pts")
- `<Badge>` (shadcn)
- `<Card>` / `<CardHeader>` / `<CardContent>` (non-interactive)
- `<ScrollArea>` (shadcn)
- `<input>` (none present)
- `HistoryItem` rows (non-interactive `<div>`s)

**Out of scope (flagged, not changed):**
- The 5 `<TabsTrigger>`s are icon-only with no `aria-label` — a structural `aria-label` pass on shadcn triggers would be a separate task (shadcn's `<TabsTrigger>` already has `role="tab"` + `aria-selected` via Radix, but the icon-only triggers lack accessible names). This is a STRUCTURAL change beyond className/display-aria scope.

## Owner Verification

- **`npm run update`** must pass before committing.
- Confirm the Back button's `aria-label="Go back"` is correct (consistent with repo pattern).
- The 5 icon-only `<TabsTrigger>`s' missing accessible labels is a known gap — consider a follow-up task to add `aria-label` to each (e.g., `aria-label="Overview"`, `aria-label="Levels"`, etc.).
