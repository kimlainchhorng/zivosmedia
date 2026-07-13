# MiMo run — 2026-06-14T07:44:17.817Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/account/GiftCardsPage.tsx (507-line "Gift Cards" — buy/send/redeem ZIVO gift cards. REAL data via `useGiftCards` hook (myGiftCards/cardsLoading/purchaseGiftCard.mutateAsync/redeemGiftCard.mutateAsync); useAuth; useI18n `t`. `handlePurchase` calls `purchaseGiftCard.mutateAsync` then dynamic-imports `openExternalUrl` to a Stripe checkout url; `handleRedeem` calls `redeemGiftCard.mutateAsync`; `copyCode` navigator.clipboard + toast + 2s reset. useState: selectedAmount/customMode/customAmount/recipientName/recipientEmail/message/cardFilter/redeemCode/redeemResult/copiedId. Layout: sticky header [raw icon Back + i18n title] + hero motion.div + shadcn <Tabs defaultValue="buy"> [TabsList/TabsTrigger buy|send|redeem] + per-tab TabsContent (AmountSelector + RecipientFields + shadcn Purchase/Send/Redeem <Button>s) + a "My Gift Cards" motion.div [status-filter pills + card list rows w/ copy-code button]). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setSelectedAmount/setCustomMode/setCardFilter/handlePurchase/handleRedeem/copyCode, useGiftCards mutateAsync, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale — note: NONE of the raw buttons here use framer whileTap). Don't churn shadcn <Button>/<Tabs>/<TabsTrigger>/<Input> (ship own focus/scale tokens). Don't migrate the <textarea> (already has focus:ring-primary/50 native field). Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED button (bg-ig-gradient) selected state on a NEUTRAL parent still uses ring-ring (ring renders against the neutral parent, not the button's own fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select picker active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF OR existing color wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. NO transition class at all + adding scale + a hover:bg ON THE BUTTON → use transition-all (NEW, not a flip — nothing to flip from). NO transition + scale-only + NO hover ON THE BUTTON → transition-transform NEW.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, copy, submit).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L126 PRESET-AMOUNT button (raw <button>, mapped ×4 over PRESET_AMOUNTS [$10/$25/$50/$100], single-select amount picker, selection bg-conveyed `bg-ig-gradient text-white shadow-lg shadow-primary/30` [selected] vs `bg-muted text-muted-foreground hover:bg-muted/80` [unselected], one-shot `onClick={() => { setCustomMode(false); setSelectedAmount(amt.cents); }}`, VISIBLE text = amount label; base via TEMPLATE-LITERAL static part `py-3 rounded-xl font-bold text-base transition-all` then a `${!customMode && selectedAmount === amt.cents ? "bg-ig-gradient text-white shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}` conditional; ALREADY transition-all, NO scale/focus/aria). Container = `grid grid-cols-5 gap-2` inside the buy/send card `bg-card border border-border/50` (neutral). → my plan: ADD `aria-pressed={!customMode && selectedAmount === amt.cents}` (persistent single-select amount picker, bg-conveyed) + APPEND into the static template part `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (single-select picker tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — the selected bg-ig-gradient fill renders the ring against the neutral bg-card container; single edit hits all 4 presets). Confirm tier [0.97] vs [0.98], aria-pressed, no-flip, OUTWARD ring-ring.

B) L138 CUSTOM button (raw <button>, part of the same amount picker row, two-way-ish member, selection bg-conveyed `customMode ? bg-ig-gradient text-white shadow-lg shadow-primary/30 : bg-muted text-muted-foreground hover:bg-muted/80`, one-shot `onClick={() => setCustomMode(true)}`, VISIBLE text "Custom" + Pencil icon; base via TEMPLATE-LITERAL static part `py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1`; ALREADY transition-all, NO scale/focus/aria). Same `grid grid-cols-5` container on bg-card. → my plan: ADD `aria-pressed={customMode}` (persistent single-select picker member, bg-conveyed) + APPEND into the static template part `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same picker tier [0.97]; NO flip — transition-all present; OUTWARD ring-ring on neutral bg-card). Confirm.

C) L209 HEADER BACK button (raw <button>, icon-only ArrowLeft, one-shot `onClick={() => navigate(-1)}`, base `w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center`, NO transition/scale/hover/focus/aria). Parent = sticky header `bg-background/80 backdrop-blur-xl` (neutral). → my plan: ADD `aria-label="Back"` (icon-only) + APPEND `active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; NO prior transition + NO hover on the button → scale is the SOLE animated prop → transition-transform NEW, NOT a flip; OUTWARD ring-ring on neutral header). Confirm transition-transform (not transition-all — no hover on this button) + scale-95 + aria-label.

D) L418 STATUS-FILTER PILL (raw <button>, mapped ×4 over [all/active/redeemed/expired], single-select filter, selection bg-conveyed `bg-ig-gradient text-white border-primary` [selected] vs `bg-card text-muted-foreground border-border/40 hover:border-primary/30` [unselected], one-shot `onClick={() => setCardFilter(opt.key)}`, VISIBLE text = label + optional count badge; base via TEMPLATE-LITERAL static part `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors` then the conditional; ALREADY transition-colors + hover:border, NO scale/focus/aria). Container = `flex gap-2 overflow-x-auto` pill row inside the "My Gift Cards" motion.div on bg-background (neutral). → my plan: ADD `aria-pressed={cardFilter === opt.key}` (persistent single-select segmented filter, bg-conveyed) + APPEND into the static template part `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (segmented filter tier [0.97]; FLIP REQUIRED — transition-colors GAINING a new active:scale MUST flip to transition-all; OUTWARD ring-ring — selected bg-ig-gradient fill on neutral bg-background container). Confirm the FLIP (transition-colors→transition-all) + tier [0.97] + aria-pressed + OUTWARD ring-ring.

E) L471 COPY-CODE button (raw <button>, icon-only [Copy icon, swaps to Check when copiedId===card.id], one-shot `onClick={() => copyCode(card.code, card.id)}`, base `p-1 rounded hover:bg-muted`, NO transition/scale/focus/aria). Parent = the gift-card row `bg-card border border-border/50` (neutral). → my plan: ADD `aria-label="Copy code"` (icon-only — the visible sibling is the code text, not this button's own label) + APPEND `active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; has hover:bg-muted ON THE BUTTON + NO prior transition class + gaining scale → transition-all NEW [not a flip — nothing to flip from, but the button has a self-hover:bg so transition-all covers both]; OUTWARD ring-ring on neutral bg-card row). Confirm transition-all (button has hover:bg) + scale-95 + aria-label="Copy code".

ALSO CONFIRM I should LEAVE these: the shadcn Purchase <Button> L257, Send <Button> L296, Redeem <Button> L325, "View Wallet" ghost <Button> L354, "Show all" link <Button> L454 (all ship own focus/scale tokens); shadcn <Tabs>/<TabsList>/<TabsTrigger>/<TabsContent> (own component); shadcn <Input> ×several (custom-amount/recipient-name/recipient-email/redeem-code — own focus tokens); the <textarea> L192 (already `focus:outline-none focus:ring-2 focus:ring-primary/50` — native form field, NOT migrated to ring-ring); all motion.div wrappers (hero L222, my-cards L369, redeem-result L340 — entrance anim, NO onClick); the gift-card row <div> L463 (non-interactive presentational); the count-badge <span>s + status <span> (non-interactive); Gift/Send/Ticket/Copy/Check/Loader2/ShieldCheck/CreditCard/Wallet/Pencil/ArrowLeft icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. A & D are mapped templates (single edit each hits all 4). Resolve: A/B tier [0.97]-vs-[0.98]; C transition-transform-vs-all (no hover on button); D the transition-colors→transition-all FLIP; E transition-all (button self-hover:bg) + aria-label.
- files: src/pages/account/GiftCardsPage.tsx

---

## Plan

Your analysis is **100% correct on all five controls**. Every tier, ring color, transition ruling, FLIP decision, and aria attribute matches the house standard. Here's the confirmed summary + precise diff.

---

## Confirmed decisions

| Control | Tier | Transition | FLIP? | Ring | Ring color (reason) | aria |
|---------|------|-----------|-------|------|---------------------|------|
| **A** preset-amount ×4 | `[0.97]` picker | already `transition-all` | **No** | OUTWARD | `ring-ring` (selected gradient fill on neutral `bg-card` parent) | `aria-pressed={!customMode && selectedAmount === amt.cents}` |
| **B** Custom | `[0.97]` picker | already `transition-all` | **No** | OUTWARD | `ring-ring` (same `bg-card` container) | `aria-pressed={customMode}` |
| **C** header Back | `95` icon-only | `transition-transform` **NEW** | **No** (nothing to flip from) | OUTWARD | `ring-ring` (neutral `bg-background/80` header) | `aria-label="Back"` |
| **D** status-filter pill ×4 | `[0.97]` segmented filter | `transition-colors` → `transition-all` | **YES** | OUTWARD | `ring-ring` (selected gradient fill on neutral `bg-background` parent) | `aria-pressed={cardFilter === opt.key}` |
| **E** copy-code | `95` icon-only | `transition-all` **NEW** | **No** (nothing to flip from) | OUTWARD | `ring-ring` (neutral `bg-card` row) | `aria-label="Copy code"` |

**Key reasoning confirmations:**
- **A/B tier [0.97] not [0.98]:** single-select picker maps to the segmented-filter/tab/picker tier — correct.
- **C `transition-transform`:** `hover:bg-muted` is NOT on the button (it's on the className string, but actually checking the source — `bg-muted` is the **base** background, no `hover:` variant). No hover prop on button → scale is sole animated prop → `transition-transform`. Correct.
- **D FLIP:** `transition-colors` gaining `active:scale` MUST flip to `transition-all`. The unselected state has `hover:border-primary/30` on the button → `transition-all` covers both. Correct.
- **E `transition-all` (not `transition-transform`):** `hover:bg-muted` IS on the button → needs `transition-all` to cover both hover-bg and scale. Not a flip (no prior transition). Correct.

---

## Proposed diff — `src/pages/account/GiftCardsPage.tsx`

### A) Preset-amount button (L126 area)

**Before:**
```tsx
<button type="button"
  key={amt.cents}
  onClick={() => { setCustomMode(false); setSelectedAmount(amt.cents); }}
  className={`py-3 rounded-xl font-bold text-base transition-all ${
    !customMode && selectedAmount === amt.cents
```

**After:**
```tsx
<button type="button"
  key={amt.cents}
  onClick={() => { setCustomMode(false); setSelectedAmount(amt.cents); }}
  aria-pressed={!customMode && selectedAmount === amt.cents}
  className={`py-3 rounded-xl font-bold text-base transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    !customMode && selectedAmount === amt.cents
```

### B) Custom button (L138 area)

**Before:**
```tsx
<button type="button"
  onClick={() => setCustomMode(true)}
  className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1 ${
    customMode
```

**After:**
```tsx
<button type="button"
  onClick={() => setCustomMode(true)}
  aria-pressed={customMode}
  className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center gap-1 ${
    customMode
```

### C) Header Back button (L209 area)

**Before:**
```tsx
<button type="button"
  onClick={() => navigate(-1)}
  className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
>
```

**After:**
```tsx
<button type="button"
  onClick={() => navigate(-1)}
  aria-label="Back"
  className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

### D) Status-filter pill (L418 area)

**Before:**
```tsx
<button type="button"
  key={opt.key}
  onClick={() => setCardFilter(opt.key)}
  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    cardFilter === opt.key
```

**After:**
```tsx
<button type="button"
  key={opt.key}
  onClick={() => setCardFilter(opt.key)}
  aria-pressed={cardFilter === opt.key}
  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    cardFilter === opt.key
```

### E) Copy-code button (L471 area)

**Before:**
```tsx
<button type="button"
  onClick={() => copyCode(card.code, card.id)}
  className="p-1 rounded hover:bg-muted"
>
```

**After:**
```tsx
<button type="button"
  onClick={() => copyCode(card.code, card.id)}
  aria-label="Copy code"
  className="p-1 rounded hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

---

## LEAVE list — confirmed

All items in your LEAVE list are correct:
- **shadcn `<Button>`** (Purchase L257, Send L296, Redeem L325, "View Wallet" L354, "Show all" L454) — own focus/scale ✓
- **shadcn `<Tabs>/<TabsList>/<TabsTrigger>/<TabsContent>`** — own component ✓
- **shadcn `<Input>` ×4** (custom-amount, recipient-name, recipient-email, redeem-code) — own focus ✓
- **`<textarea>` L192** — already `focus:ring-primary/50`, native field, not migrated ✓
- **motion.div wrappers** (hero L222, my-cards L369, redeem-result L340) — entrance anim, no onClick ✓
- **gift-card row `<div>` L463** — non-interactive presentational ✓
- **count-badge `<span>`s, status `<span>`** — non-interactive ✓
- **All icons** (Gift/Send/Ticket/Copy/Check/Loader2/ShieldCheck/CreditCard/Wallet/Pencil/ArrowLeft) — decorative ✓

---

## Guard summary

- **5 controls edited** (3 unique raw `<button>` patterns, 2 mapped)
- **5 className edits** (A static-template append, B static-template append, C string append, D static-template append+FLIP, E string append)
- **4 aria attrs added** (A `aria-pressed`, B `aria-pressed`, C `aria-label`, D `aria-pressed`, E `aria-label`)
- **0 logic lines touched** — every `onClick`/`navigate`/`setSelectedAmount`/`setCustomMode`/`setCardFilter`/`handlePurchase`/`handleRedeem`/`copyCode`/`useGiftCards`/`mutateAsync` byte-identical
- **FLIPs=1** (D `transition-colors`→`transition-all`)
- **New transitions=2** (C `transition-transform` NEW, E `transition-all` NEW)
- **Ring: all OUTWARD, all `ring-ring`** — no inset, no `ring-white/70`

## Owner action

1. Apply the diff above to `src/pages/account/GiftCardsPage.tsx`
2. Run `npm run update` — must pass (0 type errors + build)
3. No deploy until owner confirms
