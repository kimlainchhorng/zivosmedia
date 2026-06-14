# MiMo run — 2026-06-14T05:20:20.850Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/CreatorDashboardPage.tsx (a "Creator Dashboard" page reached by in-app navigation; useNavigate + useAuth user; @tanstack/react-query reads creator_profiles/creator_tips/creator_subscriptions/subscription_tiers/store_posts/follows/ppv_posts/direct_message_unlocks; a type-aware UI [creatorType "content" | "of"]; a CreatorTypePicker modal toggled by showTypePicker state; useLiveEarnings; child components CreatorTipsLedger, VerifyIdentityButton, CreatorTypePicker, ZivoMobileNav. Root: plain <div className="min-h-dvh bg-background pb-24">. The page uses ZIVO custom CSS classes from src/index.css.)

ZIVO CUSTOM CSS (verified from src/index.css):
- `.zivo-card-organic`: background hsl(var(--card)) [NEUTRAL card surface], border 1px border/0.3, border-radius 20px, position relative, overflow:hidden, transition: transform .25s + box-shadow; AND `.zivo-card-organic:active { transform: scale(0.97) }` — so it SHIPS a press scale via CSS, but NO focus ring.
- `.zivo-btn-signature`: background linear-gradient(emerald 142->158) [GREEN GRADIENT fill], color white, border-radius 16px, overflow:hidden, transition: all .3s; AND `.zivo-btn-signature:active { transform: scale(0.97) }` — SHIPS a press scale via CSS + a shimmer ::before, but NO focus ring.
- `.zivo-icon-pill`, `.zivo-badge`, `.zivo-ribbon` are decorative containers (no interaction).

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-haspopup, framer-motion whileTap if warranted). Keep ALL logic byte-identical: every supabase query + react-query key, the useLiveEarnings, the creatorType/needsSelection/showTypePicker state + setters, the navigate targets, every onClick, the Link `to` targets, the cn() conditionals' selection logic, the totals math, the accentClasses map, the .map() iterations. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward ring would be clipped). NOTE: an element's OWN overflow-hidden does NOT clip its OWN outward ring/box-shadow (overflow clips descendants, not the element's own shadow) — so a self-overflow-hidden rounded button can take an OUTWARD ring.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; transition-opacity when only opacity. NOTE: Tailwind's bare `transition` shorthand already includes transform. FLIP RULE: a control shipping `transition-colors` (eases ONLY color, NOT transform) GAINING a NEW active:scale MUST flip transition-colors -> transition-all. A control already shipping transition-all/transition/transition-transform -> NO flip.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-* OR a custom-class CSS :active scale), KEEP it and do NOT renumber and do NOT add a SECOND competing scale.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT two-way toggle whose on/off is conveyed by bg; NOT on a one-shot action, NOT on a control that OPENS a modal/picker. aria-haspopup="dialog" MAY be added to a control that opens a modal/dialog (display-only, optional).
- Don't-churn: keep existing valid ring/aria/scale/transition.

RING COLOR: --ring resolves to BLACK. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a saturated gradient/image surface uses ring-white/70. A gradient-FILLED or dark-FILLED button on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, not the button's own fill).

COMPONENT-TYPE RULES we follow:
- A framer-motion motion.div with an entrance/loop initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens. A react-router <Link> renders a focusable <a> and ships NO tokens.
- Child components (VerifyIdentityButton, CreatorTipsLedger, ZivoMobileNav, CreatorTypePicker) ship their own tokens / are out of file scope -> leave.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Header Back (L275, RAW, ICON-ONLY ArrowLeft, ALREADY aria-label="Back" + title="Back" KEEP, onClick navigate("/more"), className "p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation" — has hover:bg, NO transition/scale/ring; in the sticky neutral header):
   plan: APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg color fade + new scale; icon tier scale-95; OUTWARD ring-ring on neutral header; KEEP aria-label/title).

B. Creator-type badge (L280, RAW, VISIBLE TEXT "OF Creator"/"Content"/"Set Type" + leading icon + a ChevronDown, onClick setShowTypePicker(true) [OPENS the CreatorTypePicker modal], cn() base "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition-colors" + conditional [of: bg-rose-500/15 ... hover:bg-rose-500/25 / else: bg-primary/10 ... hover:bg-primary/20] — HAS transition-colors + a hover:bg in BOTH states, NO scale/ring; sits in the neutral header):
   plan: FLIP transition-colors->transition-all + APPEND `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (FLIP because a NEW active:scale is added and the existing hover:bg must keep easing; medium chip tier [0.98]; OUTWARD ring-ring — the tinted chip on the neutral header parent; NO aria-label — visible text; NO aria-pressed — one-shot, OPENS a modal, not a persistent toggle).
   QUESTION Q-B1: add aria-haspopup="dialog" (it opens the CreatorTypePicker modal + shows a ChevronDown affordance) — yes/no? My read: optional-yes (display-only, accurately signals a popup).
   QUESTION Q-B2: FLIP transition-colors->transition-all + active:scale-[0.98] + outward ring-ring — correct?

C. Header analytics icon (L294, RAW, ICON-ONLY BarChart3, ALREADY aria-label="Open analytics" + title KEEP, onClick navigate("/creator-analytics"), className "p-2 rounded-full hover:bg-muted/50 touch-manipulation" — has hover:bg, NO transition/scale/ring):
   plan: APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all; icon tier; OUTWARD ring-ring; KEEP aria-label/title).

D. OF-banner "Change" (L307, RAW, VISIBLE TEXT "Change", onClick setShowTypePicker(true), className "text-[10px] font-bold text-rose-500 hover:underline shrink-0" — a small inline text-link [a shrink-0 flex item], hover:underline, NO transition/scale/ring; sits in the OF banner `bg-gradient-to-r from-rose-500/10 to-pink-500/5` [a LIGHT rose TINT over the page bg, low saturation]):
   plan: APPEND `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform — only the scale animates, hover:underline needs no transition; it's a flex item so transform applies; NO aria-label — visible text).
   QUESTION Q-D: ring color on the LIGHT rose-tint banner — ring-ring (the tint is low-saturation, essentially neutral-ish over page bg) vs ring-white/70? My read: ring-ring (it is a translucent tint, not a saturated gradient/image). Confirm.

E. Hero "Withdraw" (L361, RAW, custom class `.zivo-btn-signature` [EMERALD GRADIENT fill + CSS :active scale(0.97) + transition:all], VISIBLE TEXT "Withdraw" + Wallet icon, onClick navigate("/wallet"), className "zivo-btn-signature px-5 py-2.5 text-xs flex items-center gap-1.5 touch-manipulation"):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP the custom-class CSS :active scale(0.97) — do NOT add a competing Tailwind scale; the class already ships transition:all; OUTWARD ring-ring — the emerald-gradient button's OUTWARD ring renders against the hero `.zivo-card-organic` NEUTRAL card parent -> ring-ring; NO aria-label — visible text).

F. Hero "Analytics" (L364, RAW, VISIBLE TEXT "Analytics" + TrendingUp, onClick navigate("/creator-analytics"), className "px-5 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center gap-1.5 border border-border/30" — ALREADY active:scale-95 but with NO transition class [the scale snaps with no easing], NO hover color, NO ring; sibling to Withdraw on the neutral hero card):
   plan: APPEND `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95 — pre-existing, do NOT renumber; ADD transition-transform so the existing scale EASES instead of snapping [scale is the only animated prop, no hover color]; OUTWARD ring-ring on neutral card; NO aria-label — visible text).
   QUESTION Q-F: the button HAS active:scale-95 but NO transition class. ADD transition-transform to smooth the existing snap (my plan), or ring-ONLY and leave the snap (stricter don't-churn)? My read: ADD transition-transform — it completes the pre-existing-but-incomplete press affordance; it is not a renumber and not a competing scale. Confirm or correct.

G. Live-Earnings spotlight (L451, motion.button [conditional, only when liveEarningsCents>0], onClick navigate("/creator/live-earnings"), className "w-full text-left relative rounded-[20px] overflow-hidden touch-manipulation active:scale-[0.99] transition-transform" — ALREADY active:scale-[0.99] + transition-transform; the button is ITSELF rounded-[20px] overflow-hidden with an absolute-inset amber/orange GRADIENT cover as its content; sits in the page-level space-y-6 container on neutral bg-background):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.99] + transition-transform — no flip; OUTWARD ring-ring — the button's OWN overflow-hidden does NOT clip its OWN outward ring, and the outward ring renders against the NEUTRAL page bg parent [not the button's gradient fill] -> ring-ring; NO aria-label — the visible $amount + "Tap to withdraw" text names it).
   QUESTION Q-G: OUTWARD ring-ring (renders against neutral page, self-overflow-hidden doesn't clip own ring) vs ring-inset + ring-white/70 (inset onto the gradient cover)? My read: OUTWARD ring-ring — the button sits on a neutral page surface, it is NOT a flush child of an overflow-hidden parent, and its own overflow-hidden doesn't clip its own outward ring. Confirm.

H. Setup-step Links (L423, react-router <Link> x N, self-styled, `to={step.href}`, className template `flex items-center gap-3 p-2.5 rounded-xl border touch-manipulation active:scale-[0.98] transition-transform ${done ? "border-border/20 bg-muted/20 opacity-70" : "border-border/40 bg-card hover:bg-muted/30"}` — ALREADY active:scale-[0.98] + transition-transform [the not-done state also has a hover:bg-muted/30 that won't ease under transition-transform, but that's pre-existing], NO ring; rows sit inside the zivo-card-organic p-4 setup card, each its own rounded-xl bordered row):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the template's static prefix (KEEP active:scale-[0.98] + transition-transform — pre-existing, NO flip [not gaining a scale], leave the non-easing hover:bg as pre-existing don't-churn; OUTWARD ring-ring — rounded-xl row on the neutral card surface; NO aria-label — visible step text).
   QUESTION Q-H: ring-ONLY append + KEEP transition-transform (do NOT flip to transition-all for the pre-existing hover:bg) — correct? Or flip so the hover eases? My read: ring-only, no flip (the control is NOT gaining a scale; the flip rule is for transition-colors gaining a scale; here it's pre-existing transition-transform — don't-churn).

I. Quick-Action Links (L505, react-router <Link> x9, `to={action.href}`, NO className [the Link wraps a `motion.div.zivo-card-organic` child that carries the visual card + its CSS :active scale]; the Link is a grid item; the card child is NEUTRAL bg, rounded-20px, overflow-hidden):
   plan: APPEND `rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the bare Link (give the focusable <a> a matching 20px radius so the OUTWARD ring hugs the card edge; OUTWARD ring-ring — the Link is NOT overflow-hidden so its ring isn't clipped, renders against the neutral page/grid; the card child keeps its CSS :active scale; NO aria-label — visible action label).
   QUESTION Q-I: the focus ring belongs on the focusable <Link>, but the visual card is the motion.div CHILD. Add `rounded-[20px]` + ring to the Link (my plan) so the keyboard-focus ring is visible and matches the card shape — correct? Or is there a better placement? (We can't easily move the ring onto the child without changing logic; the Link is the Tab target.)

J. "+ Add" tier Link (L643, react-router <Link> to "/monetization", VISIBLE TEXT "+ Add", className "text-[10px] font-bold text-primary hover:underline" — a small inline text-link, a flex item in the section header `flex items-center gap-2`, hover:underline, NO transition/scale/ring):
   plan: APPEND `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform; flex item so transform applies; OUTWARD ring-ring on neutral surface; NO aria-label — visible text).
   QUESTION Q-J: add the press+ring to this tiny inline "+ Add" link (my plan) or leave it as a plain text link (some apps leave bare inline text links)? My read: add — it is a real navigation control and benefits from a keyboard-focus ring; the [0.97] press is consistent with our small-text-link tier.

K. Empty-tier Link (L673, react-router <Link> to "/monetization", `className="block"`, wraps a `zivo-card-organic p-6 ... border-dashed hover:border-primary/40 transition-colors` dashed CTA card child [NEUTRAL bg, rounded-20px, overflow-hidden, CSS :active scale]; conditional — only when tiers.length===0):
   plan: APPEND `rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the Link's existing `block` (give the focusable <a> a matching 20px radius for the OUTWARD ring; OUTWARD ring-ring — Link not overflow-hidden; the dashed card child keeps its CSS :active scale + its hover:border; NO aria-label — visible CTA text).
   QUESTION Q-K: same pattern as I — ring on the block Link wrapping the zivo-card child — correct?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The hero earnings motion.div L319, the setup-card motion.div L390, the progress-bar motion.divs, the stat-grid motion.divs L481, the quick-action motion.div children L506 (entrance anim, NO onClick — the Link parent is the control), the milestone motion.divs L534, the activity motion.divs L616, the growth-tip motion.divs L702 — all entrance/loop anim with NO onClick -> presentational -> leave.
- The tier rows L655 (plain divs, NO onClick), the activity tip rows, the KYC banner div L563, the watermark — non-interactive -> leave.
- VerifyIdentityButton L573 (child component, ships its own button tokens) -> leave. CreatorTipsLedger L582, ZivoMobileNav L727, CreatorTypePicker L266, SEOHead -> child/out-of-scope -> leave.
- All zivo-icon-pill / zivo-badge / icons / text -> decorative.

QUESTIONS:
Q1. Icon buttons A (Back) + C (analytics): FRESH transition-all + active:scale-95 + outward ring-ring + KEEP aria-label/title — correct?
Q2. Badge B: FLIP transition-colors->transition-all + active:scale-[0.98] + outward ring-ring + NO aria-pressed + (Q-B1) optional aria-haspopup="dialog" — correct?
Q3. "Change" D + "+ Add" J: small text-link active:scale-[0.97] + transition-transform + ring (+ Q-D ring color on the rose-tint banner = ring-ring?) — correct?
Q4. Hero buttons E (Withdraw, zivo-btn-signature) ring-only + F (Analytics, Q-F add transition-transform to the pre-existing snap-scale) — correct?
Q5. Live-Earnings motion.button G (Q-G outward ring-ring vs inset/white) — correct?
Q6. Links H (self-styled setup steps, ring-only no flip) + I/K (bare/block Links wrapping zivo-card children — add rounded-[20px] + ring to the Link) — correct? Is the rounded-[20px]-on-the-Link approach the right way to give those card-links a matching focus ring?
Q7. Confirm the leave-untouched list (all presentational/loop motion.divs, the non-interactive rows/banners, the child components, all decorative pills/icons/text).
Q8. At 375px, does the header (Back + h1 + type badge + analytics icon — 4 items in one row), the OF banner (icon + text + Change), the hero card (4xl amount + OF breakdown strip + Withdraw/Analytics buttons), the 3-col stat grid, the 3x3 quick-action grid, the 2-col milestones, the tier rows, and the growth tips lay out without crushing? And at iPad 768/1024 + desktop 1280 (the page is NOT width-capped — full-width px-4; any concern about the grids stretching)?

Please answer Q1-Q8 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/CreatorDashboardPage.tsx

---

## Review: CreatorDashboardPage — Interaction + A11y Pass

### Short plan

11 controls total (not 7 as the "planned edits" header states — H/I/J/K are real interactive controls that were correctly identified below but miscounted). Every edit is sound. I have one correction and a few minor confirmations.

---

### Q-by-Q answers

**Q1 — Icon buttons A (Back) + C (analytics):** **Correct.** FRESH `transition-all` (the existing `hover:bg-muted/50` is a color fade that must ease alongside the new scale — `transition-transform` alone would skip it). `active:scale-95` icon tier. `focus-visible:ring-ring` outward on the neutral sticky header. Keep both `aria-label` and `title`. No flip needed (no pre-existing transition class to flip).

**Q2 — Badge B:** **Correct with one addition.** FLIP `transition-colors` → `transition-all` + `active:scale-[0.98]` chip tier + outward `ring-ring` + NO `aria-pressed` (opens a modal, not a persistent toggle).

- **Q-B1: Yes, add `aria-haspopup="dialog"`.** Display-only, accurately signals the popup, consistent with our modal-trigger pattern. This is the one new `aria-*` attribute in the entire diff (1 total).
- **Q-B2: Confirmed.** FLIP is mandatory (gaining a NEW `active:scale` while `hover:bg` must keep easing). Ring-ring (the tinted chip sits on the neutral header parent).

**Q3 — "Change" D + "+ Add" J:** **Correct.** `active:scale-[0.97]` + `transition-transform` + outward `ring-ring`.

- **Q-D: Confirmed — `ring-ring`.** The `from-rose-500/10 to-pink-500/5` gradient is a low-opacity tint over the page bg, not a saturated gradient surface. The outward ring renders against essentially-neutral page bg → `ring-ring`.

**Q4 — Hero buttons E + F:** **Correct.**

- **E (Withdraw, `zivo-btn-signature`):** Ring-only. The CSS class already ships `transition: all` and `:active { transform: scale(0.97) }`. Adding a competing Tailwind `active:scale-*` would fight the CSS `:active` (Tailwind generates `!important`-adjacent utilities while the custom class uses a plain CSS pseudo-class — layering order unpredictable). Ring-only is the right call. Outward `ring-ring` — the emerald-gradient button sits inside the `.zivo-card-organic` neutral card parent.
- **F (Analytics):** **Q-F confirmed — ADD `transition-transform`.** This is completing a pre-existing-but-incomplete affordance, not adding a competing one. The existing `active:scale-95` snaps with no easing; adding `transition-transform` makes it smooth. This is not a renumber (same scale value), not a competing scale, and the flip rule doesn't apply (gaining a transition class, not flipping one). No hover color exists → `transition-transform` is sufficient.

**Q5 — Live-Earnings G:** **Q-G confirmed — OUTWARD `ring-ring`.** Your reasoning is correct on both counts: (1) the button's own `overflow-hidden` does NOT clip its own outward `box-shadow`/ring (overflow clips descendants' visual overflow, not the element's own shadow); (2) the button sits on a neutral `bg-background` page surface — the outward ring renders against that neutral parent → `ring-ring`. NOT `ring-inset` + `ring-white/70` — the structural precondition for `ring-inset` (flush edge child of a rounded overflow-hidden parent) is not met.

**Q6 — Links H + I + K:** **Correct.** The `rounded-[20px]`-on-the-`<Link>` approach is the right way to give card-wrapping Links a matching focus ring. The `<Link>` is the native Tab target (renders an `<a>`), and giving it the card's border-radius makes the outward focus ring hug the card shape visually. The child `motion.div.zivo-card-organic` keeps its own CSS `:active` scale + border-radius independently.

- **Q-H: Confirmed — ring-only, no flip.** The flip rule applies to `transition-colors` gaining a NEW scale. Here the existing class is `transition-transform` and the control is NOT gaining a scale (it already has `active:scale-[0.98]`). The non-easing `hover:bg-muted/30` is pre-existing don't-churn — it's a cosmetic inconsistency (the hover color snaps rather than eases), but fixing it would mean flipping `transition-transform` → `transition-all`, which is a change beyond ring-only scope. Flag it for a future pass if desired; don't fix it here.
- **Q-I: Confirmed.** `rounded-[20px]` on the Link + ring is correct.
- **Q-K: Confirmed.** Same pattern as I.

**Q7 — Leave-untouched list:** **All confirmed correct.** Every presentational `motion.div` (entrance/loop anim with no `onClick`), every non-interactive row/banner, all child components (`VerifyIdentityButton`, `CreatorTipsLedger`, `ZivoMobileNav`, `CreatorTypePicker`, `SEOHead`), all decorative pills/badges/icons/text — all correctly excluded.

**Q8 — Responsive at 375/768/1024/1280:**

- **375px — clean.** Header: Back `p-2` (40px) + `flex-1 min-w-0` h1 truncates + badge auto-width + analytics `p-2` (40px) → all 4 items fit in ~343px usable (375 − 32px padding). The badge text is `[10px]` uppercase with `gap-1` → compact. OF banner: icon `shrink-0` + `flex-1 min-w-0` paragraph + `shrink-0` "Change" → paragraph truncates first. Hero: `text-4xl` amount + `flex justify-center gap-3` buttons (each `px-5 py-2.5 text-xs` ~95px each, gap-3 = 12px → ~202px, plenty). Stat grid 3-col → each ~105px, the 9px labels + values fit. Quick-action 3x3 → each ~105px, icon + 9px label fits. Milestones 2-col → each ~155px, icon + 11px label + progress bar + 9px counter fits. Tier rows: icon tile + `flex-1 min-w-0` column (name + badges + price truncate).
- **768/1024px — same layout, wider columns, comfortable.**
- **1280px — one aesthetic note.** The page has **no `max-w-*` cap** (just `px-4`), so at 1280 the content stretches to ~1248px. The 3-col stat grid columns become ~406px each, and the 3×3 quick-action grid columns ~406px each. The cards won't break (card content is compact — icon + short text), but they'll be very wide with lots of whitespace. This is a **pre-existing layout decision**, not introduced by this pass, and not a breakage. If the owner wants to cap it later, adding `max-w-5xl mx-auto` to the `space-y-6` container would be a separate change.

---

### Inventory correction

The "planned edits" header says "7 interactive controls reviewed." The actual inventory is **11 controls / 11 edits / 11 className changes + 1 new `aria-haspopup`**:

| # | Control | Type | Edit |
|---|---------|------|------|
| A | Back arrow | icon button | FRESH transition-all + scale-95 + ring |
| B | Type badge | visible text button | FLIP + scale-[0.98] + ring + `aria-haspopup="dialog"` |
| C | Analytics icon | icon button | FRESH transition-all + scale-95 + ring |
| D | "Change" | text link | FRESH transition-transform + scale-[0.97] + ring |
| E | "Withdraw" | `.zivo-btn-signature` | ring-only |
| F | "Analytics" | existing scale-95, no transition | ADD transition-transform + ring |
| G | Live-earnings | motion.button | ring-only |
| H | Setup Links ×N | self-styled `<Link>` | ring-only |
| I | Quick-action Links ×9 | bare `<Link>` | +rounded-[20px] + ring |
| J | "+ Add" link | inline text `<Link>` | FRESH transition-transform + scale-[0.97] + ring |
| K | Empty-tier `<Link>` | block `<Link>` | +rounded-[20px] + ring |

---

### Proposed className changes (exact before → after)

**A — L275 (Back button)**
```
// BEFORE:
"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"
// AFTER:
"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**B — L280 (Type badge button)**
```
// BEFORE (cn() base string):
"flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition-colors"
// AFTER:
"flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
// + ADD to the <button> element: aria-haspopup="dialog"
```

**C — L294 (Analytics icon button)**
```
// BEFORE:
"p-2 rounded-full hover:bg-muted/50 touch-manipulation"
// AFTER:
"p-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**D — L307 ("Change" button)**
```
// BEFORE:
"text-[10px] font-bold text-rose-500 hover:underline shrink-0"
// AFTER:
"text-[10px] font-bold text-rose-500 hover:underline shrink-0 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**E — L361 ("Withdraw" button)**
```
// BEFORE:
"zivo-btn-signature px-5 py-2.5 text-xs flex items-center gap-1.5 touch-manipulation"
// AFTER:
"zivo-btn-signature px-5 py-2.5 text-xs flex items-center gap-1.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**F — L364 ("Analytics" button)**
```
// BEFORE:
"px-5 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center gap-1.5 border border-border/30"
// AFTER:
"px-5 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 transition-transform flex items-center gap-1.5 border border-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**G — L451 (Live-earnings motion.button)**
```
// BEFORE:
"w-full text-left relative rounded-[20px] overflow-hidden touch-manipulation active:scale-[0.99] transition-transform"
// AFTER:
"w-full text-left relative rounded-[20px] overflow-hidden touch-manipulation active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**H — L423 (Setup-step Links, template literal prefix)**
```
// BEFORE (the static part of the template literal):
"flex items-center gap-3 p-2.5 rounded-xl border touch-manipulation active:scale-[0.98] transition-transform "
// AFTER:
"flex items-center gap-3 p-2.5 rounded-xl border touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring "
```

**I — L505 (Quick-action Links, the bare `<Link>`)**
```
// BEFORE:
<Link key={action.label} to={action.href}>
// AFTER:
<Link key={action.label} to={action.href} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**J — L643 ("+ Add" link)**
```
// BEFORE:
"text-[10px] font-bold text-primary hover:underline"
// AFTER:
"text-[10px] font-bold text-primary hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**K — L673 (Empty-tier block Link)**
```
// BEFORE:
className="block"
// AFTER:
className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### Diff summary

| Metric | Count |
|--------|-------|
| Controls edited | 11 |
| className changes (`−`/`+` pairs) | 11 |
| New `aria-*` attributes | 1 (`aria-haspopup="dialog"` on B) |
| Pre-existing aria-labels KEPT | 2 (A "Back", C "Open analytics") |
| FRESH `transition-all` | 2 (A, C) |
| FRESH `transition-transform` | 2 (D, J) |
| ADD `transition-transform` (pre-existing scale) | 1 (F) |
| transition FLIP (`transition-colors` → `transition-all`) | 1 (B) |
| Ring-only (no scale/transition change) | 5 (E, G, H, I, K) |
| FRESH `active:scale-*` | 5 (A `95`, B `[0.98]`, C `95`, D `[0.97]`, J `[0.97]`) |
| ADD `rounded-[20px]` (for ring shape) | 2 (I, K) |
| `ring-inset` | 0 |
| `ring-white/70` | 0 |
| Logic lines touched | **0** |

---

### Owner verification checklist

1. Run `npm run update` → must be true exit 0 (type-check + worker type-check + production build).
2. Preview at 375/768/1024 — confirm the header row, hero buttons, stat grid, quick-action grid, milestone grid, and tier rows don't crush.
3. Keyboard-test: Tab through the header (Back → badge [should open CreatorTypePicker] → analytics), the OF banner "Change" [should open picker], the hero buttons, the quick-action cards (ring should hug the card shape), the setup-step rows, the "+ Add" link, the empty-tier CTA card, and the live-earnings card. Every control should show a visible `ring-2` on `:focus-visible`.
4. The `aria-haspopup="dialog"` on the type badge — confirm VoiceOver/NVDA announces "button, has popup dialog" when focused.
5. All logic (queries, navigate targets, `cn()` conditional logic, totals math) is byte-identical between `−` and `+`.
