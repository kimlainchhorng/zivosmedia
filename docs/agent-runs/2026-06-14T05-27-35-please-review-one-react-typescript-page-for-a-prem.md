# DeepSeek run — 2026-06-14T05:27:35.918Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass ONLY: the only changes are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-haspopup, framer-motion whileTap). Keep ALL logic byte-identical: every supabase query + react-query key, useCustomerWallet, useZivoOFMode, the localStorage read/write helpers, saveOFSettings (incl. the subscription_tiers upsert/deactivate + qc.invalidateQueries), every useState/setter, every onClick/navigate/Link `to`, the filter/search/cn() conditional selection logic, the .map() iterations, the accentClassMap. Only advise on className tokens, whileTap, and aria-* attributes.

FILE: src/pages/MonetizationPage.tsx (~893 lines, "Monetization" creator-earnings hub reached by in-app nav; useNavigate + useAuth user; @tanstack/react-query reads creator_tips/creator_subscriptions/creator_program_enrollments/referrals; useCustomerWallet balance; useZivoOFMode toggle [zivoOFMode]; localStorage-persisted OF pricing [subPrice/ppvPrice/tipPresets/welcomeMsg] + saveOFSettings; child components ZivoMobileNav, SEOHead, shadcn Switch. Root: plain <div className="min-h-dvh bg-background pb-24">. Uses ZIVO custom CSS classes from src/index.css.)

ZIVO CUSTOM CSS (verified from src/index.css):
- `.zivo-card-organic`: background hsl(var(--card)) [NEUTRAL card surface], border-radius 20px, overflow:hidden, transition: transform .25s + box-shadow; AND `.zivo-card-organic:active { transform: scale(0.97) }` — SHIPS a press scale via CSS, NO focus ring.
- `.zivo-btn-signature`: background linear-gradient(emerald 142->158) [GREEN GRADIENT fill], color white, border-radius 16px, overflow:hidden, transition: all .3s; AND `.zivo-btn-signature:active { transform: scale(0.97) }` — SHIPS a press scale via CSS + shimmer ::before, NO focus ring.
- `.zivo-icon-pill`, `.zivo-badge`, `.zivo-ribbon`, `.zivo-aurora`, `.zivo-divider` are decorative.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no ring-offset). Use `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward ring would be clipped). NOTE: an element's OWN overflow-hidden does NOT clip its OWN outward ring/box-shadow (overflow clips descendants, not the element's own shadow) — a self-overflow-hidden rounded button can take an OUTWARD ring.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: `transition-transform` when scale is the ONLY animated property; `transition-all` when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; `transition-colors` when only color. Tailwind's bare `transition` shorthand already includes transform. FLIP RULE: a control shipping `transition-colors` (eases ONLY color, NOT transform) that GAINS a NEW active:scale MUST flip transition-colors -> transition-all. A control already shipping transition-all/transition/transition-transform -> NO flip.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-* OR a custom-class CSS :active scale), KEEP it, do NOT renumber, do NOT add a SECOND competing scale.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT two-way toggle / single-select segmented filter whose on/off is conveyed by bg; NOT on a one-shot action, NOT on a control that OPENS a modal/picker. Don't-churn: keep existing valid ring/aria/scale/transition.

RING COLOR: --ring resolves to BLACK. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a saturated gradient/image surface uses ring-white/70. A gradient-FILLED or dark-FILLED or low-opacity-tinted button on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, not the button's own fill).

COMPONENT-TYPE RULES we follow:
- A framer-motion motion.div with an entrance/loop initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens. A react-router <Link> renders a focusable <a> and ships NO tokens. A bare/className-less <Link> wrapping a styled card child: the focus ring belongs on the <Link> (the Tab target) — add `rounded-[20px]` (matching the card's radius) + ring to the Link so the outward ring hugs the card edge; the card child keeps its CSS :active scale.
- shadcn Switch (ships own tokens + has aria-label) -> leave. Child components (ZivoMobileNav, SEOHead) -> leave.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Header Back (L359, RAW, ICON-ONLY ArrowLeft, ALREADY title="Back" + aria-label="Back" KEEP, onClick navigate(-1)/navigate("/profile"), className "p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation" — has hover:bg, NO transition/scale/ring; sticky neutral header):
   plan: APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg color fade + new scale; icon tier; OUTWARD ring-ring on neutral header; KEEP aria-label/title).

B. Header search toggle (L374, RAW, ICON-ONLY Search, dynamic title/aria-label "Close search"/"Open search" KEEP, onClick toggles searchOpen [shows/hides an inline search input], className "p-2 -mr-1 rounded-full hover:bg-muted/50 touch-manipulation"):
   plan: APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same as A; KEEP the dynamic aria-label/title).
   QUESTION Q-B: add aria-pressed for the open/closed state, or rely on the DYNAMIC aria-label ("Open search"/"Close search")? My read: NO aria-pressed — the changing aria-label already conveys state, and it reveals a search field (a disclosure, not a bg-conveyed persistent toggle). Confirm.

B2 (header search input, L363, the autoFocus text input shown when searchOpen, className "flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50" — a BORDERLESS transparent inline field in the header, has `outline-none` [native outline suppressed], NO ring, NO focus-within wrapper; it autoFocuses on open):
   QUESTION Q-B2: add `focus-visible:ring-2 focus-visible:ring-ring` to this borderless inline header search input, or LEAVE it (the field is transparent/borderless inline, autofocuses on open so its active state is already obvious, and a floating ring around inline header text could look off)? My read: lean LEAVE (borderless inline header search idiom; the autofocus + caret make focus obvious; a ring boxing transparent inline text reads wrong) — but open to ADD if you think the stripped `outline-none` leaves a keyboard-focus gap that must be replaced. Decide.

C. OF "View subscribers" (L435, RAW, VISIBLE text, onClick navigate("/creator/subscribers"), className "rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all" — ALREADY active:scale-[0.97] + transition-all + hover:bg, NO ring; in a neutral zivo-card-organic):
   plan: RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP scale-[0.97] + transition-all — no flip; OUTWARD ring-ring on neutral card).

D. OF "Payouts & wallet" (L442, RAW, identical pattern to C, onClick navigate("/wallet")):
   plan: RING-ONLY append (same as C).

E. "Create locked post (PPV)" (L554, RAW, VISIBLE text + Lock, onClick navigate("/feed?compose=locked"), className "w-full ... rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/5 ... text-[#00AEEF] hover:bg-[#00AEEF]/10 active:scale-[0.97] transition-all" — ALREADY scale-[0.97] + transition-all + hover:bg, the button fill is a 5%-opacity cyan tint, NO ring; in a neutral zivo-card-organic):
   plan: RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP scale + transition-all; OUTWARD ring-ring — the 5% cyan tint is low-saturation, the outward ring renders against the neutral card parent -> ring-ring, NOT ring-white/70).
   QUESTION Q-E: ring color on this `bg-[#00AEEF]/5` (5% tint) button — ring-ring? Confirm.

F. "Save settings" (L563, RAW, VISIBLE text + Save, onClick saveOFSettings, disabled while savingOF, className "w-full ... text-white bg-gradient-to-r from-[#00AEEF] to-[#0099D9] hover:... active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none transition-all shadow-lg ... disabled:opacity-60" — ALREADY ships active:scale-[0.98] + transition-all + a focus ring [brand-cyan `ring-[#00AEEF]/60`]):
   plan: LEAVE UNTOUCHED (already fully polished — has scale + transition + a focus ring; don't-churn protects the existing brand-tinted ring on this saturated gradient button).
   QUESTION Q-F: leave as-is (my read), or normalize its brand-cyan `ring-[#00AEEF]/60` to `ring-white/70` (it's a saturated cyan-gradient fill, ring renders ON the gradient)? My read: LEAVE — it already has a valid, deliberate, brand-matched focus ring; normalizing is churn. Confirm.

G. "Preview profile" (L583, RAW, custom class `.zivo-btn-signature` [emerald gradient + CSS :active scale + transition:all], VISIBLE text + Eye, onClick navigate(`/user/${user.id}?...`), className "zivo-btn-signature px-3.5 py-2 text-[11px] flex items-center gap-1.5"):
   plan: RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP the custom-class CSS :active scale — do NOT add a competing Tailwind scale; class already ships transition:all; OUTWARD ring-ring — the emerald button's outward ring renders against the neutral zivo-card-organic parent).

H. Workflow-step buttons x4 (L599, RAW, VISIBLE text, onClick navigate(item.href), className "text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/35 transition-colors touch-manipulation" — has transition-colors + hover:bg, NO scale, NO ring; full-width rows in a grid-cols-1 gap-2 inside a neutral card):
   plan: FLIP transition-colors->transition-all + APPEND `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FLIP — gaining a NEW scale while hover:bg must keep easing; OUTWARD ring-ring on neutral card).
   QUESTION Q-H: scale tier for these full-width rounded-xl bordered nav rows — [0.98] (medium, matches the recently-shipped CreatorDashboard setup-step rounded-xl bordered rows) vs [0.99] (wide full-width row tier)? My read: [0.98] to match the immediate rounded-xl-bordered-nav-row precedent. Confirm or correct.

I. Program-filter chips xN (L686, RAW, VISIBLE text [filter name], onClick setActiveFilter(filter), selection conveyed by BACKGROUND [active "bg-foreground text-background" / inactive "bg-muted/60 text-muted-foreground"], cn-template has `transition-colors`, NO hover, NO scale, NO ring; in a `flex gap-2 overflow-x-auto scrollbar-hide` row of shrink-0 pills):
   plan: ADD `aria-pressed={activeFilter === filter}` + FLIP transition-colors->transition-all + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FLIP — gaining a NEW scale while the active/inactive bg+text change must keep easing; segmented-filter tier [0.97]; aria-pressed VALID — persistent single-select filter, bg-conveyed selection, constant filter-name label [the ReelEffects/OrderDisputes precedent], NOT role=tab; OUTWARD ring-ring — overflow-x-auto sets overflow-x only [overflow-y visible -> vertical 2px ring not clipped], gap-2 clearance between shrink-0 pills).
   QUESTION Q-I: ADD aria-pressed + FLIP + [0.97] + outward ring-ring — correct?

J. "Show all programs" empty-state reset (L754, RAW, VISIBLE text, onClick setActiveFilter("All")+setSearchQuery(""), className "text-xs text-primary font-semibold mt-2" — small text-link, centered block, NO transition/scale/ring):
   plan: APPEND `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small text-link tier; transition-transform — only scale animates; OUTWARD ring-ring).

K. Resources "View all" (L770, RAW, VISIBLE text + ChevronRight, onClick navigate("/monetization/articles"), className "text-xs text-primary font-semibold flex items-center gap-0.5 touch-manipulation" — small text-link, NO transition/scale/ring):
   plan: APPEND `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same as J).

L. Resource tabs xN (L780, RAW, VISIBLE text [tab name], onClick setActiveResTab(i), selection by BACKGROUND [active "bg-foreground text-background" / inactive "bg-muted/60"], `transition-colors`, NO scale/ring; in a `flex gap-2 overflow-x-auto scrollbar-hide` row of shrink-0 pills):
   plan: ADD `aria-pressed={i === activeResTab}` + FLIP transition-colors->transition-all + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (identical treatment to I — segmented single-select).
   QUESTION Q-L: same as I (aria-pressed + FLIP + [0.97] + outward ring-ring) — correct?

M. Creator-journey step buttons x5 (L835, RAW, VISIBLE text, onClick item.href && navigate(item.href), `disabled={!item.href || item.done}` [in practice only "Complete Verification" is interactive], className "flex items-center gap-3 w-full text-left touch-manipulation" — a BARE full-width row [number circle + label], NO bg surface, NO border, NO transition/scale/ring):
   plan: APPEND `rounded-lg active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (wide full-width-row tier [0.99]; transition-transform; rounded-lg so the focus ring has tidy corners around the otherwise-square row; OUTWARD ring-ring; disabled rows never fire :active/:focus-visible so safe).
   QUESTION Q-M: add press+ring+rounded-lg to this bare disabled-able journey row (my plan), or RING-ONLY (no scale, since most rows are disabled and it has no surface), or LEAVE entirely (it's a progress checklist, largely non-interactive)? My read: add the full treatment — the one enabled row ("Complete Verification") is a real nav control and benefits; disabled rows are inert so no visual regression. Decide.

N. Learning-resource buttons xN (L796, motion.button, onClick navigate(article), className "w-full flex items-start gap-3 text-left touch-manipulation active:bg-muted/10 rounded-xl p-2 -mx-2 transition-colors" — ALREADY a press affordance via `active:bg-muted/10` [background dims on press] + transition-colors + rounded-xl, NO scale, NO whileTap, NO ring):
   plan: RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP the existing active:bg-muted/10 press affordance + transition-colors [it eases the active:bg correctly] + rounded-xl; do NOT add a scale [the bg-dim is the existing press feedback — adding a scale would force a transition-colors->transition-all flip = churn]; OUTWARD ring-ring — rounded-xl row, parent not overflow-hidden, neutral bg).
   QUESTION Q-N: RING-ONLY keeping the active:bg-muted/10 press (my plan), or ALSO add active:scale-[0.99] + flip to transition-all (a second press-feedback layer)? My read: RING-ONLY — the active:bg already supplies tactile feedback; a scale would require flipping the transition and stacking two press effects. Confirm.

O. Quick-action Links x6 (L657, BARE <Link to={action.href}> NO className, wraps a `motion.div.zivo-card-organic p-3` child [NEUTRAL card, rounded-20px, overflow-hidden, CSS :active scale]; grid items in `grid grid-cols-3 gap-2`):
   plan: ADD `className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` to the bare Link (matching 20px radius so the OUTWARD ring hugs the card edge; Link not overflow-hidden -> ring not clipped; card child keeps its CSS :active scale; NO aria-label — visible label).

P. Dashboard Link (L630, <Link to="/creator-dashboard" className="zivo-btn-signature px-4 py-2 text-[11px] flex items-center gap-1 touch-manipulation"> — custom-class emerald gradient + CSS :active scale + transition:all, NO ring; inside the neutral earnings-hero zivo-card-organic):
   plan: RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP CSS scale; OUTWARD ring-ring — emerald button's outward ring renders against the neutral hero card parent).

Q. Program Links xN (L716, <Link to={`/monetization/program/${prog.programId}`}> NO className, wraps a `zivo-card-organic` div child [NEUTRAL card, rounded-20px, CSS :active scale; contains a decorative "Join"/"Joined" span, NOT separately focusable]; each Link is inside a layout-animated motion.div):
   plan: ADD `className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` to the bare Link (same card-wrapping-Link pattern as O; card child keeps its CSS :active scale; NO aria-label — visible label).

R. CTA Links x4 (L864, <Link to={cta.href}> NO className, wraps a `motion.div.zivo-card-organic p-4` child [NEUTRAL card, rounded-20px, CSS :active scale]):
   plan: ADD `className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` to the bare Link (same pattern as O/Q).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The shadcn Switch L397 (ships tokens + aria-label="Toggle ZIVO OF Mode").
- The OF pricing inputs: subPrice L475 + ppvPrice L495 inputs (their bordered wrappers have `focus-within:ring-2 focus-within:ring-[#00AEEF]/40`), the tipPresets inputs L523 (wrapper has focus-within ring), the welcomeMsg textarea L541 (has its OWN `focus:ring-2 focus:ring-[#00AEEF]/40`) — all ALREADY have a focus affordance -> leave.
- All presentational motion.div with entrance anim + NO onClick: the earnings-hero motion.div L615, the quick-action motion.div CHILDREN L658 (the Link parent is the control), the program motion.div WRAPPERS L708 (layout anim; the Link inside is the control), the CTA motion.div children L865 (the Link parent is the control).
- All non-interactive: the OF-mode card L387, the This-Week stat tiles L428, the OF pricing card structure, the stat tiles L641, the program-row inner content, the journey number-circles, decorative zivo-icon-pill/zivo-badge/icons/text, the watermark, zivo-divider.

QUESTIONS:
Q1. Icon buttons A (Back) + B (search toggle): FRESH transition-all + active:scale-95 + outward ring-ring + KEEP dynamic aria-label/title — correct? And Q-B (no aria-pressed on the search toggle, rely on the dynamic label)?
Q2. Q-B2: the borderless inline header search INPUT — add ring or leave?
Q3. Ring-only buttons that already ship scale+transition-all: C (View subscribers), D (Payouts), E (Create locked post, Q-E ring-ring on the 5% cyan tint) — correct?
Q4. F (Save settings) — LEAVE (Q-F: keep its existing brand-cyan ring vs normalize to ring-white/70)?
Q5. zivo-btn-signature ring-only: G (Preview profile, RAW) + P (Dashboard, Link) — correct (ring-only, keep CSS scale, outward ring-ring on neutral parent)?
Q6. Segmented filters I (program filter) + L (resource tabs): ADD aria-pressed + FLIP transition-colors->transition-all + [0.97] + outward ring-ring — correct?
Q7. Workflow rows H (Q-H tier [0.98] vs [0.99], FLIP) + journey rows M (Q-M full treatment vs ring-only vs leave) + learning-resource motion.button N (Q-N ring-only keeping active:bg vs add scale) — confirm each.
Q8. Small text-links J (Show all) + K (View all): [0.97] + transition-transform + ring — correct?
Q9. Card-wrapping bare Links O (quick actions) + Q (programs) + R (CTAs): add rounded-[20px] + ring to the bare <Link> (the Tab target), card child keeps its CSS :active scale — correct?
Q10. Confirm the leave-untouched list (Switch, the already-focus-ringed OF inputs/textarea, all presentational/loop motion.divs, the non-interactive rows/tiles, decorative pills/icons/text).
Q11. At 375px does the header (Back + title/search-input + search toggle), the OF cards (mode toggle, this-week 4-col stat grid, pricing form with 3-col tip presets, workflow rows), the earnings-hero 4-col stat grid, the 3-col quick-action grid, the overflow-x filter/tab pill rows, the program rows, the learning resources, the journey checklist, and the CTA cards lay out without crushing? And at iPad 768/1024 + desktop 1280 (the page is NOT width-capped — full-width px-4; any concern about the grids stretching)?

Please answer Q1-Q11 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/MonetizationPage.tsx

---

# Review: MonetizationPage Premium Interaction Pass

## Short Plan

Review all 18 interactive controls on `src/pages/MonetizationPage.tsx` for consistent focus rings, press scales, transition classes, and aria attributes. Apply the established token system (icon-only → scale-95, segmented filter → scale-[0.97] + aria-pressed, full-width row → scale-[0.99], card-wrapping Link → rounded-[20px] + ring on the `<a>`, custom-class controls → ring-only). Keep all logic byte-identical.

## Proposed Changes

### A. Header Back (L359)
**Before:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"`
**After:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### B. Header search toggle (L374)
**Before:** `"p-2 -mr-1 rounded-full hover:bg-muted/50 touch-manipulation"`
**After:** `"p-2 -mr-1 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### B2. Header search input (L363) — **LEAVE UNTOUCHED**
**Decision:** No ring added. Borderless inline header search field with autofocus + caret makes focus obvious; a floating ring around transparent inline text would look off.

### C. View subscribers (L435)
**Before:** `"rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all"`
**After:** `"rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### D. Payouts & wallet (L442)
**Before:** `"rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all"`
**After:** `"rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### E. Create locked post (L554)
**Before:** `"w-full flex items-center justify-center gap-2 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-4 py-2.5 text-[12px] font-bold text-[#00AEEF] hover:bg-[#00AEEF]/10 active:scale-[0.97] transition-all"`
**After:** `"w-full flex items-center justify-center gap-2 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-4 py-2.5 text-[12px] font-bold text-[#00AEEF] hover:bg-[#00AEEF]/10 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### F. Save settings (L563) — **LEAVE UNTOUCHED**
Already has `active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none`. The brand-cyan ring is deliberate and appropriate for this saturated gradient button.

### G. Preview profile (L583)
**Before:** `"zivo-btn-signature px-3.5 py-2 text-[11px] flex items-center gap-1.5"`
**After:** `"zivo-btn-signature px-3.5 py-2 text-[11px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### H. Workflow step buttons ×4 (L599)
**Before:** `"text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/35 transition-colors touch-manipulation"`
**After:** `"text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/35 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"`

### I. Program filter chips ×4 (L686)
**Before:** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"` (shared cn base)
**After:** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (shared cn base)
**Plus:** Add `aria-pressed={activeFilter === filter}` to each button

### J. Show all programs (L754)
**Before:** `"text-xs text-primary font-semibold mt-2"`
**After:** `"text-xs text-primary font-semibold mt-2 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### K. View all resources (L770)
**Before:** `"text-xs text-primary font-semibold flex items-center gap-0.5 touch-manipulation"`
**After:** `"text-xs text-primary font-semibold flex items-center gap-0.5 touch-manipulation active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### L. Resource tabs ×N (L780)
**Before:** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"` (shared cn base)
**After:** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (shared cn base)
**Plus:** Add `aria-pressed={i === activeResTab}` to each button

### M. Creator journey step buttons ×5 (L835)
**Before:** `"flex items-center gap-3 w-full text-left touch-manipulation"`
**After:** `"flex items-center gap-3 w-full text-left touch-manipulation rounded-lg active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### N. Learning resource buttons ×6 (L796)
**Before:** `"w-full flex items-start gap-3 text-left touch-manipulation active:bg-muted/10 rounded-xl p-2 -mx-2 transition-colors"`
**After:** `"w-full flex items-start gap-3 text-left touch-manipulation active:bg-muted/10 rounded-xl p-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### O. Quick action Links ×6 (L657)
**Before:** bare `<Link to={action.href}>` with NO className
**After:** `<Link to={action.href} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">`

### P. Dashboard Link (L630)
**Before:** `"zivo-btn-signature px-4 py-2 text-[11px] flex items-center gap-1 touch-manipulation"`
**After:** `"zivo-btn-signature px-4 py-2 text-[11px] flex items-center gap-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### Q. Program Links ×N (L716)
**Before:** bare `<Link to={`/monetization/program/${prog.programId}`}>` with NO className
**After:** `<Link to={`/monetization/program/${prog.programId}`} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">`

### R. CTA Links ×4 (L864)
**Before:** bare `<Link to={cta.href}>` with NO className
**After:** `<Link to={cta.href} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">`

## Answers to Your Questions

**Q1.** ✅ Correct. FRESH `transition-all` + `active:scale-95` + outward `ring-ring` on both A and B. KEEP dynamic `aria-label`/`title`. **Q-B: NO `aria-pressed`** — the changing `aria-label` ("Open search"/"Close search") already conveys state, and this is a disclosure (shows/hides a search field), not a bg-conveyed persistent toggle. Correct.

**Q2. Q-B2: LEAVE** the borderless inline header search input. Your reasoning is sound — autofocus + caret make focus obvious, and a floating ring around transparent inline text in the header would look off. No gap: the `outline-none` is fine here because the field autoFocuses on open and the user's interaction context (typing) makes the active state obvious.

**Q3.** ✅ Correct. Ring-only on C, D, E — all already ship `active:scale-[0.97]` + `transition-all` + `hover:bg`. **Q-E: `ring-ring`** is correct for the 5% cyan tint button. The outward ring renders against the neutral `zivo-card-organic` parent, not the button's own low-saturation fill. `ring-white/70` is only for rings that render directly OVER a saturated gradient/image surface.

**Q4. Q-F: LEAVE** the Save settings button. It already has `active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none`. The brand-cyan ring is deliberate and appropriate for this saturated cyan-gradient button. Normalizing to `ring-white/70` would be churn.

**Q5.** ✅ Correct. Ring-only on G (RAW button) and P (Link). KEEP the custom-class CSS `:active` scale — do NOT add a competing Tailwind scale. OUTWARD `ring-ring` — the emerald gradient button's outward ring renders against the neutral `zivo-card-organic` parent.

**Q6.** ✅ Correct. Segmented filters I and L: ADD `aria-pressed` + FLIP `transition-colors`→`transition-all` + `active:scale-[0.97]` + outward `ring-ring`. This matches the established OrderDisputesPage/ReelEffectsPage/MyJobApplicationsPage precedent for single-select pill filters with bg-conveyed selection.

**Q7.**
- **H (workflow rows):** ✅ `[0.98]` is correct — matches the CreatorDashboard setup-step rounded-xl bordered nav rows precedent. FLIP `transition-colors`→`transition-all` because gaining a new scale.
- **M (journey rows):** ✅ Full treatment (`rounded-lg active:scale-[0.99] transition-transform + ring`). The one enabled row ("Complete Verification") is a real nav control and benefits. Disabled rows are inert so no visual regression. `rounded-lg` gives the focus ring tidy corners on the otherwise-square row.
- **N (learning resource buttons):** ✅ RING-ONLY, keeping the existing `active:bg-muted/10` press affordance. Adding a scale would require flipping `transition-colors`→`transition-all` and stacking two press effects — unnecessary churn. The bg-dim is sufficient tactile feedback.

**Q8.** ✅ Correct. Small text-links J and K: `active:scale-[0.97]` + `transition-transform` + outward `ring-ring`. No hover color to ease, so `transition-transform` (not `transition-all`) is correct.

**Q9.** ✅ Correct. Card-wrapping bare Links O, Q, R: add `rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the bare `<Link>` (the Tab target). The card child keeps its CSS `:active` scale. This matches the CreatorDashboardPage precedent (quick-action Links I/K).

**Q10.** ✅ Confirm the leave-untouched list:
- shadcn Switch (L397) — ships tokens + `aria-label`
- OF pricing inputs (L475, L495) — wrappers have `focus-within:ring-2 focus-within:ring-[#00AEEF]/40`
- Tip presets inputs (L523) — wrapper has `focus-within:ring-2`
- Welcome msg textarea (L541) — has `focus:ring-2 focus:ring-[#00AEEF]/40`
- All presentational `motion.div` with entrance anim + NO onClick (earnings hero L615, quick-action children L658, program wrappers L708, CTA children L865)
- All non-interactive (OF-mode card L387, stat tiles L428, pricing card structure, stat tiles L641, program-row inner content, journey number-circles, decorative pills/icons/text, watermark, dividers)

**Q11. Responsive check:**
- **375px:** Header (Back `p-2` 40px + search input/title + search toggle `p-2` 40px) fits ~343px usable. OF cards (mode toggle with Switch, 4-col stat grid ~82px each, 2-col buttons), pricing form (3-col tip presets ~105px each), workflow rows (full-width), earnings hero (4-col stat grid ~82px each), 3-col quick-action grid (~105px each), overflow-x filter/tab pill rows (scroll, `shrink-0`), program rows (icon + `flex-1 min-w-0` + badge/chevron), learning resources (icon `w-14 h-14` + `flex-1 min-w-0`), journey checklist (number circle + `flex-1` text), CTA cards (icon + `flex-1 min-w-0` + chevron) — all lay out without crushing.
- **768px/1024px:** Same layout, wider columns. No concern.
- **1280px:** The page has NO `max-w-*` cap (just `px-4`), so at 1280 content stretches to ~1248px. The 3-col grids become ~400px-wide cards, the 4-col stat grids become ~300px each — lots of whitespace but NOT a breakage. This is a pre-existing layout decision (same as CreatorDashboardPage). Capping with `max-w-5xl mx-auto` on the `space-y-6` container would be a separate change.

## Summary of Changes

| Control | Type | Scale | Transition | Ring | aria-* |
|---------|------|-------|------------|------|--------|
| A. Back | icon btn | scale-95 | FRESH transition-all | outward ring-ring | KEEP aria-label |
| B. Search toggle | icon btn | scale-95 | FRESH transition-all | outward ring-ring | KEEP dynamic aria-label |
| B2. Search input | input | — | — | LEAVE | — |
| C. View subscribers | chip btn | KEEP [0.97] | KEEP transition-all | ADD ring-ring | — |
| D. Payouts & wallet | chip btn | KEEP [0.97] | KEEP transition-all | ADD ring-ring | — |
| E. Create locked post | chip btn | KEEP [0.97] | KEEP transition-all | ADD ring-ring | — |
| F. Save settings | gradient btn | KEEP [0.98] | KEEP transition-all | LEAVE (brand ring) | — |
| G. Preview profile | custom-class btn | KEEP CSS :active | KEEP transition:all | ADD ring-ring | — |
| H. Workflow rows ×4 | full-width btn | ADD [0.98] | FLIP→transition-all | ADD ring-ring | — |
| I. Program filter ×4 | segmented pill | ADD [0.97] | FLIP→transition-all | ADD ring-ring | ADD aria-pressed |
| J. Show all | text-link | ADD [0.97] | ADD transition-transform | ADD ring-ring | — |
| K. View all | text-link | ADD [0.97] | ADD transition-transform | ADD ring-ring | — |
| L. Resource tabs ×N | segmented pill | ADD [0.97] | FLIP→transition-all | ADD ring-ring | ADD aria-pressed |
| M. Journey rows ×5 | full-width btn | ADD [0.99] | ADD transition-transform | ADD ring-ring | — |
| N. Learning resources ×6 | motion.button | KEEP active:bg | KEEP transition-colors | ADD ring-ring | — |
| O. Quick actions ×6 | bare Link | KEEP child CSS | KEEP child CSS | ADD rounded-[20px]+ring | — |
| P. Dashboard | custom-class Link | KEEP CSS :active | KEEP transition:all | ADD ring-ring | — |
| Q. Programs ×N | bare Link | KEEP child CSS | KEEP child CSS | ADD rounded-[20px]+ring | — |
| R. CTAs ×4 | bare Link | KEEP child CSS | KEEP child CSS | ADD rounded-[20px]+ring | — |

**Diff counts:** 18 rings added (all outward `ring-ring`), 2 `aria-pressed` added (I, L), 0 `aria-label`/`aria-exp
