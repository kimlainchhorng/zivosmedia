# MiMo run — 2026-06-14T04:38:24.359Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/PaymentMethodsPage.tsx (a "Payment Methods" management page reached by in-app navigation; `useNavigate`; `useI18n` t(); `useAuth` user; `useLocalPaymentMethods()` -> { methods, deleteCard, setDefault, isEmpty, isLoading } [DEVICE-LOCAL card store, no server PII]; `showAddForm` useState; `handleDelete(card)` [deleteCard + toast], `handleSetDefault(card)` [early-return if already default, else setDefault + toast]. Layout: sticky header [RAW icon-only back button + a CreditCard icon-pill + title/subtitle]; a security trust bar [3 decorative icon+text chips]; then one of: a "Sign in required" empty state [shadcn Button], a loading line, an isEmpty empty state [motion.div + shadcn "Add card" Button], or the cards list — an AnimatePresence of per-card motion.div rows [layout/entrance/exit anim, NO onClick] each holding a CreditCard icon, brand/last4 + an optional DEFAULT badge + expiry + cardholder, and a 2-button icon action cluster [Set-as-default Star button + Delete Trash2 button]; below the list a "Add New Card" motion.button [dashed-border, full-width]; and an AnimatePresence-wrapped AddCardForm (a separate child component, OUT OF SCOPE).)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: `useLocalPaymentMethods`, `handleDelete`, `handleSetDefault`, every onClick, the navigate, the `disabled={card.isDefault}` prop, the toast calls, `setShowAddForm`, the t() keys, the AddCardForm child. Only advise on className tokens, whileTap, and aria-* attributes. Do NOT touch the AddCardForm child component (its own slice).

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset only when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; transition-opacity when only opacity animates. IMPORTANT FLIP RULE: a control that currently ships `transition-colors` (which eases ONLY color/bg/border, NOT transform) and is GAINING a NEW active:scale MUST be flipped `transition-colors` -> `transition-all` so the transform eases too. (If scale is added via framer-motion `whileTap` instead of a CSS `active:scale`, framer drives the transform and NO flip is needed — `transition-colors` correctly stays to ease the hover colors.)
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-95/90, active:opacity-*), KEEP it and do NOT renumber.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT toggle/segmented control whose on/off selection is conveyed by bg and which you can toggle BOTH ways; NOT on a one-shot action, NOT on a control that is disabled in its "on" state, NOT when an icon-fill/badge already conveys the state.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app. An OUTWARD ring renders against the control's PARENT surface. A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted/bg-primary/10 parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70.

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A framer-motion motion.button WITH an onClick IS an interactive control -> it gets the token treatment (it is NOT presentational just because it has an entrance anim).
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Header back button (L45, RAW, ICON-ONLY ArrowLeft, ALREADY aria-label="Go back" KEEP, onClick={() => navigate(-1)}, className "p-2 rounded-full hover:bg-muted transition-colors touch-manipulation" — HAS transition-colors + hover:bg, NO scale/ring; sticky header on neutral bg):
   plan: FLIP transition-colors -> transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (flip because a NEW active:scale is added and the existing hover:bg must keep easing; icon tier scale-95; KEEP aria-label; OUTWARD ring-ring on neutral header bg).

B. Set-as-default Star button (L170, RAW, ICON-ONLY Star, ALREADY aria-label="Set as default" KEEP, onClick={() => handleSetDefault(card)}, disabled={card.isDefault}, cn() base "p-2 rounded-lg transition-colors touch-manipulation" + conditional [default: "text-primary cursor-default" / non-default: "text-muted-foreground hover:text-amber-400 hover:bg-muted/50"] — HAS transition-colors + conditional hover, NO scale/ring; the "is default" state is ALSO conveyed by a fill-primary on the star + a separate DEFAULT badge + the button being DISABLED in the default state; the button sits on the card surface [bg-card, or bg-primary/10 when default]):
   plan: FLIP transition-colors -> transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base; KEEP aria-label; NO aria-pressed.
   QUESTION Q-B (the KEY call): should this Star button get `aria-pressed={card.isDefault}` or NOT? My read: NO aria-pressed, because (1) it is a ONE-SHOT "make this the default" action, not a two-way toggle — `handleSetDefault` early-returns when already default and the button is `disabled` in the default state, so you can never "un-press" it here; (2) the default state is already conveyed by the fill-primary star + the DEFAULT badge + the disabled attribute; (3) aria-pressed on a disabled-in-on-state control is misleading. Confirm NO aria-pressed, or correct.

C. Delete Trash2 button (L188, RAW, ICON-ONLY Trash2, ALREADY aria-label="Delete card" KEEP, onClick={() => handleDelete(card)}, className "p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation" — HAS transition-colors + hover:text + hover:bg, NO scale/ring):
   plan: FLIP transition-colors -> transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (flip for the new scale; icon tier scale-95; KEEP aria-label; one-shot action -> NO aria-pressed; OUTWARD ring-ring on the card surface).

D. "Add New Card" motion.button (L203, framer-motion motion.button WITH onClick={() => setShowAddForm(true)}, entrance anim initial={{opacity:0}} animate={{opacity:1}} [OPACITY ONLY, framer does NOT drive transform after mount], VISIBLE TEXT "Add New Card" [Plus icon + text], className "w-full p-4 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors touch-manipulation" — HAS transition-colors + hover:text + hover:border, NO scale/ring; full-width wide row):
   QUESTION Q-D (the KEY call): for a motion.button, do I add the press-scale via (option 1) framer-motion `whileTap={{ scale: 0.99 }}` [then KEEP transition-colors as-is, since framer drives the transform and CSS only eases the hover colors -> NO flip], or (option 2) Tailwind `active:scale-[0.99]` [then FLIP transition-colors -> transition-all so the CSS transition eases the transform too]? Either way ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`, wide tier 0.99, visible text -> NO aria-label, OUTWARD ring-ring (dashed-border button on neutral bg). Pick the single most idiomatic + most consistent option for a motion.button and give the exact final className (+ the whileTap prop if option 1).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The "Sign in" shadcn Button L90, the isEmpty "Add card" shadcn Button L111 -> ship tokens -> leave.
- The per-card motion.div rows L123 (layout/entrance/exit anim, NO onClick -> presentational) -> leave.
- The isEmpty motion.div L99 + the AddCardForm-wrapper motion.div L219 (entrance anim, NO onClick) -> leave.
- The AddCardForm child component L225 -> separate slice, OUT OF SCOPE -> leave.
- The security trust bar L64 + all icons + all text/badges -> decorative.

QUESTIONS:
Q1. Back (A): FLIP transition-colors->transition-all + active:scale-95 + ring + KEEP aria-label + OUTWARD ring-ring — correct?
Q2. Set-default Star (B): FLIP + active:scale-95 + ring + KEEP aria-label, and the KEY call — NO aria-pressed (one-shot action, disabled-in-on-state, fill+badge convey state)? Confirm or correct.
Q3. Delete (C): FLIP + active:scale-95 + ring + KEEP aria-label + one-shot -> NO aria-pressed — correct?
Q4. Add New Card motion.button (D): the KEY call — whileTap (option 1, no flip) vs Tailwind active:scale-[0.99] (option 2, flip)? Pick the most idiomatic/consistent and give the exact className (+ whileTap if option 1). Wide 0.99 tier, NO aria-label, OUTWARD ring-ring — confirm.
Q5. Confirm the leave-untouched list (both shadcn Buttons, all 3 presentational motion.divs, the AddCardForm child, the trust bar/icons/text) is handled correctly.
Q6. At 375px, does the header (back + icon-pill + title/subtitle), the 3-chip trust bar, and a card row (icon + brand/last4 + DEFAULT badge + expiry + cardholder + a 2-icon action cluster) lay out without crushing? And at iPad 768/1024 + desktop 1280 (note any max-w concern)?

Please answer Q1-Q6 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/PaymentMethodsPage.tsx

---

## Plan

Four RAW interactive controls to polish (A–D), zero logic changes. All four need a transition flip, focus ring, and press-scale. No `aria-pressed` on any of them. The `motion.button` uses `whileTap` (framer-native) instead of a CSS `active:scale`. Everything else stays.

---

## Q1 — Back (A): **Correct ✓**

FLIP `transition-colors` → `transition-all` (new `active:scale` + existing `hover:bg-muted` both need easing). `active:scale-95` icon tier. KEEP `aria-label="Go back"`. OUTWARD `ring-ring` on neutral header bg.

**Before (L48):**
```
className="p-2 rounded-full hover:bg-muted transition-colors touch-manipulation"
```
**After:**
```
className="p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
```

---

## Q2 — Set-as-default Star (B): **Correct — NO aria-pressed ✓**

Your reasoning is exactly right on all three counts:

1. **One-shot, not a toggle.** `handleSetDefault` early-returns when `card.isDefault` and the button is `disabled` in the default state — you can never "un-default" via this control.
2. **State already conveyed** three ways: `fill-primary` star, the `DEFAULT` badge span, and the `disabled` attribute.
3. **`aria-pressed` on a disabled-in-on-state control is misleading** — it signals a persistent toggle affordance that doesn't exist.

FLIP base `transition-colors` → `transition-all`. APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base. KEEP `aria-label="Set as default"`. Ring is OUTWARD `ring-ring` — the button sits on `bg-card` (non-default) or `bg-primary/10` (default), both neutral surfaces. When `disabled` (default state), focus/press/ring are inert — correct.

**Before (cn() base, L173):**
```
"p-2 rounded-lg transition-colors touch-manipulation"
```
**After (cn() base):**
```
"p-2 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
```
Conditional strings unchanged. `aria-label="Set as default"` unchanged. No `aria-pressed` added.

---

## Q3 — Delete (C): **Correct ✓**

FLIP `transition-colors` → `transition-all` (new `active:scale` + existing `hover:text-destructive hover:bg-destructive/10`). `active:scale-95` icon tier. KEEP `aria-label="Delete card"`. One-shot action → NO `aria-pressed`. OUTWARD `ring-ring` on the card surface (`bg-card` or `bg-primary/10`, both neutral).

**Before (L191):**
```
className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
```
**After:**
```
className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
```

---

## Q4 — Add New Card motion.button (D): **Option 1 — `whileTap` ✓**

**This is the KEY call and the answer is `whileTap={{ scale: 0.99 }}`** (option 1). Three reasons:

1. **Idiomatic.** The control is a `motion.button` — it already lives inside framer's animation system. `whileTap` is the purpose-built gesture API for exactly this.
2. **No flip needed.** Framer drives the transform; `transition-colors` correctly stays to ease `hover:text-foreground` and `hover:border-primary/40`. The rulebook explicitly permits this: *"If scale is added via framer-motion `whileTap` instead of a CSS `active:scale`, framer drives the transform and NO flip is needed."*
3. **No conflict risk.** Framer sets an inline `transform`/`scale` on the element. Mixing a CSS `active:scale` with framer's managed style could cause competing scale sources. `whileTap` avoids that entirely.

APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the className (Tailwind handles focus rings; framer doesn't). Wide tier `0.99`. Visible text → NO `aria-label`. OUTWARD `ring-ring` — dashed-border button on neutral bg.

**New prop to add:**
```tsx
whileTap={{ scale: 0.99 }}
```

**Before (L203–L210):**
```tsx
<motion.button
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  onClick={() => setShowAddForm(true)}
  className="w-full p-4 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors touch-manipulation"
>
```
**After:**
```tsx
<motion.button
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  whileTap={{ scale: 0.99 }}
  onClick={() => setShowAddForm(true)}
  className="w-full p-4 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
>
```

Note: `transition-colors` stays (not `transition-all`) — framer drives the transform via `whileTap`, CSS only eases the hover color/border. This is correct and intentional.

---

## Q5 — Leave-untouched list: **All confirmed ✓**

| Control | Reason | Verdict |
|---|---|---|
| "Sign in" shadcn `Button` L90 | Ships built-in tokens | ✅ Leave |
| isEmpty "Add card" shadcn `Button` L111 | Ships built-in tokens | ✅ Leave |
| Per-card `motion.div` rows L123 | layout/entrance/exit anim, NO onClick → presentational | ✅ Leave |
| isEmpty `motion.div` L99 | entrance anim, NO onClick → presentational | ✅ Leave |
| AddCardForm-wrapper `motion.div` L219 | entrance anim, NO onClick → presentational | ✅ Leave |
| `AddCardForm` child L225 | Separate component, OUT OF SCOPE | ✅ Leave |
| Security trust bar L64 | Decorative icon+text chips, no interactive controls | ✅ Leave |
| All icons + text + DEFAULT badge | Decorative / informational | ✅ Leave |

---

## Q6 — Responsive: **Clean at all breakpoints ✓**

**375px** (inner width ~311px after `px-4` padding):
- **Header:** back ~36px + gap 12px + icon-pill 40px + gap 10px + title/subtitle ≈ leaves ~213px. "Payment Methods" at `text-lg` ≈ 170–180px. Fits.
- **Trust bar:** 3 chips at `text-xs` with compact labels (Stripe secured / PCI / Secure) ≈ 60–75px each + `gap-4` (16px×2) ≈ 240–270px. Fits in 311px. I18n may push slightly tighter but `flex-wrap` isn't needed at `text-xs` scale.
- **Card row:** `p-4` (32px total) → inner 279px. Icon div 36px + gap 12px + middle flex-1 + action cluster (2× `p-2` = 2×32px = 64px + gap 4px = 68px). Middle gets ~163px. Brand "Visa •••• 4242" at `text-sm` + DEFAULT badge, expiry + cardholder at `text-xs` with `truncate`. Clean.

**768/1024:** Wider cells, same flex layout. More breathing room. No crush.

**1280:** No `max-w-*` wrapper — content spans full viewport. This is a **pre-existing layout choice**, not introduced by this pass. The card rows stretch very wide but the flex structure holds. **Owner flag** (consider `max-w-2xl mx-auto` on the `<div className="px-4 py-6 space-y-6">` wrapper, same as other utility pages — out of scope for this pass).

---

## Summary diff

Four className flips + one `whileTap` prop. Zero logic. Zero new aria-pressed. Two aria-labels preserved.

| # | Control | Change |
|---|---|---|
| A | Back button | `transition-colors` → `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| B | Star button | cn() base: `transition-colors` → `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; NO aria-pressed |
| C | Delete button | `transition-colors` → `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| D | Add New Card | ADD prop `whileTap={{ scale: 0.99 }}`; className append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; KEEP `transition-colors` |

**Verify:** run `npm run update` (must be true exit 0). The `whileTap` prop is type-safe (`motion.button` accepts it natively — no type error expected). The page is device-local (`useLocalPaymentMethods` — no server PII, works on any account).
