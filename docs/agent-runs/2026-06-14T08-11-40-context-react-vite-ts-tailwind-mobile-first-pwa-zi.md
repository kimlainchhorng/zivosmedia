# DeepSeek run — 2026-06-14T08:11:40.988Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/ReferAFriendPage.tsx (230-line "Refer a Friend" — user-to-user referral page at the referral route; REAL data via useReferrals() hook [referralCode/referrals/isLoading/getCurrentTier/getNextTier/copyReferralLink/shareReferral/getShareUrl] + useAuth; layout: AppLayout + a sticky header [raw icon Back + Gift icon + "Refer a Friend"] + isLoading spinner + a hero Card [stats] + a referral-code Card with shadcn Copy/Share Buttons + a tier-progress Card + a recent-referrals list of Cards/Badges + a How-It-Works Card + a footer <p> with an inline "Terms" link button). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, copyReferralLink, shareReferral, hook calls, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Card>/<Badge>/<Input> (own tokens). Don't churn motion.div wrappers. Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset only when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. NEW transition (no prior transition class, scale-only, no self-hover) → transition-transform NEW (not a flip).
- For bare icon/text-link buttons add `rounded` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way bg-conveyed toggle.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L49 HEADER BACK button (raw <button>, icon-only ArrowLeft h-5 w-5, one-shot onClick={() => navigate(-1)}, button had NO className at all [no transition/scale/focus/hover/aria]). Parent = sticky header bg-background/95 backdrop-blur-md (neutral). → applied: ADDED aria-label="Go back" + className `rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; transition-transform NEW [scale sole, no self-hover, no prior transition]; rounded so the focus ring traces the bare icon tightly; OUTWARD ring-ring on the neutral header; added aria-label — icon-only). Confirm tier scale-95 + transition-transform NEW + rounded + OUTWARD ring-ring + aria-label="Go back".

B) L223 "TERMS" inline text-link button (raw <button> inside a footer <p>, VISIBLE text "Terms", one-shot onClick={() => navigate("/terms")}, base `text-primary underline`, NO transition/scale/hover/focus/aria). Parent = the page bg-background column. → applied: APPENDED `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform NEW [scale sole, no self-hover, no prior transition]; rounded for the ring on the inline link; OUTWARD ring-ring on neutral bg-background; NO aria — visible text "Terms" conveys the action). Confirm tier [0.97] + transition-transform NEW + rounded + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE: the shadcn Copy <Button> L105 + Share <Button> L112 (own focus/scale tokens); all Card/CardContent/CardHeader/CardTitle/Badge/Input components (own tokens); all motion.div wrappers (entrance anim); the tier-progress bar <div> L139-145 (non-interactive); the How-It-Works step <div>s (non-interactive); AppLayout (wrapper); all icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed.
- files: src/pages/app/ReferAFriendPage.tsx

---

## Review: ReferAFriendPage.tsx — Both edits are **CORRECT**

### Edit A — Header Back button (L49)
**Final className:**
```
rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**aria:** `aria-label="Go back"`

✅ **Correct.** Icon-only tier `scale-95`, `transition-transform` NEW (no prior transition, scale sole animated prop, no self-hover), `rounded` for ring tracing, OUTWARD `ring-ring` on neutral `bg-background/95` header, `aria-label` added for icon-only control.

---

### Edit B — "Terms" inline text-link (L223)
**Final className (appended to existing `text-primary underline`):**
```
rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**aria:** none (visible text "Terms")

✅ **Correct.** Small inline text-link tier `[0.97]`, `transition-transform` NEW, `rounded` for ring tracing, OUTWARD `ring-ring` on neutral `bg-background`, no aria needed.

---

### Leave list — confirmed complete
- ✅ shadcn `Copy <Button>` L105 — own tokens
- ✅ shadcn `Share <Button>` L112 — own tokens
- ✅ All `Card`/`CardContent`/`CardHeader`/`CardTitle`/`Badge` — own tokens
- ✅ All `motion.div` wrappers — entrance anim only
- ✅ Tier progress bar `<div>` L139-145 — non-interactive
- ✅ How-It-Works step `<div>`s — non-interactive
- ✅ `AppLayout` — wrapper
- ✅ All icons — decorative

### No missed raw interactive controls
The file has exactly **2 raw `<button>`s** in scope (header back + terms link). Everything else is shadcn or non-interactive. Clean.

---

**Status: PASS — ready to commit.**
