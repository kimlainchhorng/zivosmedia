# MiMo run — 2026-06-14T07:38:52.543Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/RewardsPage.tsx (417-line "ZIVO Points" — the loyalty-program hub: REAL Supabase via `useLoyaltyPoints` hook + SIX `useQuery` reads (streak/challenges/leaderboard/referral-count/completed-actions/monthly-points) over loyalty_transactions/achievements/loyalty_points/referrals; AUTH-gated (`<Navigate to="/login?redirect=/rewards">` when !user); `useState activeTab` (overview|earn|redeem|refer). Layout: sticky header [framer motion.button icon Back + Sparkles + "ZIVO Points" title] + a PointsBalanceCard + a CUSTOM segmented tab row [4 raw buttons driving setActiveTab, NOT shadcn TabsTrigger] wrapped in shadcn <Tabs value/onValueChange> + per-tab TabsContent (TierProgressCard/PointsEarningList/RedemptionOptions/ReferralCard) + rich content cards (streak week-grid, Active Challenges, Points-history bar chart, Community Leaderboard, Milestone Rewards grid, Compliance disclaimer) + MobileBottomNav). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setActiveTab, useQuery/Supabase queries, useLoyaltyPoints, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button>/<Tabs> (ship own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A bg-card-FILLED active tab on a NEUTRAL muted container still uses ring-ring (the ring renders against the neutral container).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border/opacity OR existing color wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY framer whileTap → append the focus ring ONLY (NO CSS active:scale — that's the second competing press).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. For tabs WITHOUT a role=tablist/role=tab structure, aria-pressed is the house pattern (over aria-selected). NOT aria-pressed on one-shot actions (nav).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L183 HEADER BACK control (framer `motion.button`, `whileTap={{ scale: 0.88 }}`, one-shot `onClick={() => navigate(-1)}`, icon-only ArrowLeft, base `w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation`, NO focus/aria). Parent = sticky header `bg-background/95 backdrop-blur-2xl` (neutral). → plan: ADD `aria-label="Back"` (icon-only) + APPEND the focus ring ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (framer whileTap is ALREADY the press → NO CSS active:scale [second competing press]; whileTap is a transform handled by framer, NO Tailwind transition needed; OUTWARD ring-ring on the neutral header). Confirm: ring-ONLY (no CSS scale) + OUTWARD ring-ring + aria-label.

B) L219 SEGMENTED TAB button (raw `<button>`, mapped ×4 over [overview/earn/redeem/refer], single-select tab, selection bg-conveyed `bg-card text-foreground shadow-sm` [active] vs `text-muted-foreground hover:text-foreground` [inactive], one-shot `onClick={() => setActiveTab(tab.value)}`, renders an icon + a label; base via a TEMPLATE-LITERAL className static part `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 touch-manipulation` then a `${activeTab === tab.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}` conditional; ALREADY `transition-all`, NO scale/focus/aria). **Note:** these raw buttons drive `setActiveTab` directly — they are NOT shadcn `TabsTrigger`, so they carry NO role=tab/role=tablist/aria-selected; they live inside the shadcn `<Tabs>` wrapper but the trigger row is custom. Container = `flex gap-1 bg-muted/50 rounded-xl p-1` (neutral muted). → plan: **ADD `aria-pressed={activeTab === tab.value}`** (persistent single-select segmented tab, bg-conveyed state, no role=tablist → aria-pressed is the house pattern) + APPEND into the static part of the template literal `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented tab tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — the active tab's bg-card fill renders the ring against the neutral bg-muted/50 container; single edit hits all 4 tabs). Confirm aria-pressed + tier [0.97] + OUTWARD ring-ring + no-flip + that aria-pressed is correct over aria-selected (no role=tab structure).

ALSO CONFIRM I should LEAVE these: the shadcn `<Tabs>/<TabsContent>` (own component); `PointsBalanceCard`/`PointsEarningList`/`TierProgressCard`/`RedemptionOptions`/`ReferralCard` (own loyalty components); shadcn `<Card>/<Badge>/<Alert>` (own tokens); `MobileBottomNav`/`SEOHead` (wrappers/nav); all the `motion.div` entrance-animation wrappers (NO onClick — presentational); the streak week-grid `<div>`s + challenge cards + bar-chart `motion.div`s + leaderboard rows + milestone cards (non-interactive presentational); all icons (ArrowLeft/Sparkles/Star/Trophy/Gift/Users/Flame/Target/Zap/BarChart3/Award/Crown/Info etc — decorative); the `<Navigate>` redirect (routing).

Be concise and exact. Return the precise final className after-string per control + any aria attr. B is a mapped template (single edit hits all 4 tabs). Confirm A is ring-ONLY (framer whileTap present, no 2nd CSS scale) and B's aria-pressed (custom segmented tabs, no role=tab structure).
- files: src/pages/RewardsPage.tsx

---

## Plan

2 controls to edit, 0 logic touched. Both are raw controls (not shadcn-owned). Everything else left as-is per the LEAVE list.

---

### A) Header Back `motion.button` (~L183)

**Before:**
```jsx
<motion.button
  whileTap={{ scale: 0.88 }}
  onClick={() => navigate(-1)}
  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation"
>
```

**After:**
```jsx
<motion.button
  whileTap={{ scale: 0.88 }}
  onClick={() => navigate(-1)}
  aria-label="Back"
  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

| Detail | Value |
|--------|-------|
| Press | framer `whileTap={{ scale: 0.88 }}` already present → **NO CSS `active:scale`** (second competing press) |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-ring` appended |
| Ring color | `ring-ring` — parent is neutral `bg-background/95` header |
| Ring direction | OUTWARD |
| Transition | None needed (framer owns the transform) |
| FLIP | N/A |
| aria | `aria-label="Back"` (icon-only) |

---

### B) Segmented Tab `<button>` ×4 (~L219)

**Before** (static part of template literal):
```
`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 touch-manipulation ${...}`
```

**After** (static part of template literal):
```
`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${...}`
```

Plus add `aria-pressed={activeTab === tab.value}` on the `<button>` element:

**Before:**
```jsx
<button type="button"
  key={tab.value}
  onClick={() => setActiveTab(tab.value)}
  className={`...`}
>
```

**After:**
```jsx
<button type="button"
  key={tab.value}
  aria-pressed={activeTab === tab.value}
  onClick={() => setActiveTab(tab.value)}
  className={`...`}
>
```

| Detail | Value |
|--------|-------|
| Press tier | Segmented tab → `active:scale-[0.97]` |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-ring` appended |
| Ring color | `ring-ring` — active tab's `bg-card` fill renders against the neutral `bg-muted/50` container |
| Ring direction | OUTWARD |
| Transition | `transition-all` already present → **NO flip** |
| aria | `aria-pressed={activeTab === tab.value}` (persistent single-select segmented tab, bg-conveyed, no `role=tablist` → `aria-pressed` is the house pattern) |

---

### LEAVE list (confirmed — no edits)

- shadcn `<Tabs>/<TabsList>/<TabsContent>` — own component tokens
- `PointsBalanceCard`/`PointsEarningList`/`TierProgressCard`/`RedemptionOptions`/`ReferralCard` — own loyalty components
- shadcn `<Card>/<Badge>/<Alert>` — own tokens
- `MobileBottomNav`/`SEOHead` — wrappers/nav
- All `motion.div` wrappers (entrance anim, NO onClick — presentational)
- Streak week-grid `<div>`s (non-interactive presentational)
- Challenge cards, bar-chart bars, leaderboard rows, milestone cards (non-interactive)
- All icons (ArrowLeft/Sparkles/Star/Trophy/Gift/Users/Flame/Target/Zap/BarChart3/Award/Crown/Info — decorative)
- `<Navigate>` — routing
- The `<span className="hidden sm:inline">` inside tabs — presentational text child, not a control

---

### Guard summary

- **2 controls edited** (A + B)
- **2 className edits** (A ring append, B static template literal append)
- **2 aria attrs** added (`aria-label="Back"`, `aria-pressed={activeTab === tab.value}`)
- **0 logic lines touched** — every `onClick`/`navigate`/`setActiveTab`/`useQuery`/`useLoyaltyPoints`/Supabase byte-identical
- `focus-visible:ring=2`, `ring-ring=2` (both OUTWARD), `ring-inset=0`, `ring-white/70=0`
- `active:scale-[0.97]=1` new (B), no `active:scale` on A (framer owns it)
- FLIPs=0 (`transition-all` already on B; A has no Tailwind transition)
- **Edit path:** `src/pages/RewardsPage.tsx`

### Owner verify

Run `npm run update` (type-check + worker type-check + production build — must pass). Preview at `/rewards` to confirm the back button gets a visible focus ring on Tab and the 4 tab buttons get press-scale + focus ring + correct `aria-pressed` toggling.
