# MiMo run — 2026-06-13T22:09:13.776Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/StoreProfilePage.tsx (a customer-facing PUBLIC store profile/storefront page) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO focus-visible rings and almost no active:scale. Focus on: (1) interaction consistency — add 'active:scale-[0.98] transition-transform' + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' to every interactive raw button/anchor, card, chip, tab, and CTA (icon-only buttons use scale-[0.95], chips scale-[0.97]); do NOT touch shadcn Button (already ships tokens); (2) responsive issues at 375/768/1280 (grids, tabs, header/hero, summary layouts); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/StoreProfilePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Systematic sweep of every **raw** interactive element in `StoreProfilePage.tsx` (buttons, anchors, cards, chips, tabs) for two missing token classes: (a) `active:scale-* transition-all` (press feedback) and (b) `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (keyboard focus). shadcn `<Button>` is **skipped** (already ships both). Framer-motion `whileTap` buttons get CSS `focus-visible:ring` + `transition-all` added alongside; icon-only gets `scale-[0.95]`.

---

## Punch-list of className edits — `src/pages/StoreProfilePage.tsx`

### 1. Banner nav buttons (back / chat / cart) — 3 edits

All three use `whileTap={{ scale: 0.85 }}` but have **no** focus-visible ring or `transition-all`.

**Back button** (the `<motion.button` with `onClick={() => window.history.length > 1 ? navigate(-1) …}`):
```
className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
→ add: active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Chat button** (adjacent `<motion.button` with `aria-label={`Open chat with ${store.name}`}`):
```
same className → same addition
```

**Cart button** (the `<motion.button` with `<ShoppingCart>`):
```
same className → same addition
```

### 2. Ride There button — 1 edit

```
className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
→ add: active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 3. Booking status locked button — 1 edit

The `<button type="button" onClick={() => …isLodging…}>` that shows "Tap to unlock" / "Rooms not published yet":
```
className="… transition-colors whitespace-nowrap"
→ add: active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
```

### 4. Call/SMS tile `<motion.a>` — 2 edits (enabled + disabled variants)

**SMS fallback** (the `<motion.a href={`sms:…`}>`):
```
className="… hover:bg-white/[0.07] transition-colors"
→ add: active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Call** (the `<motion.a href={…tel:…}>` — enabled state):
```
className="… hover:bg-white/[0.07] transition-colors"
→ same addition
```

### 5. Chat tile button — 1 edit

```
className="… hover:bg-white/[0.07] transition-colors"
→ add: active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
(No change for the disabled state variant.)

### 6. Share tile button — 1 edit

```
className="… hover:bg-white/[0.07] transition-colors"
→ add: active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 7. Social link `<a>` tags (Facebook / Instagram / Telegram) — use `replace_all` on the pattern, or 1 edit per occurrence

```
className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
→ add: active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 8. Logo lightbox button — 1 edit

```
className="group h-full w-full cursor-zoom-in"
→ add: active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

### 9. Category tab pills — 1 `replace_all` on the shared unselected pattern

The **unselected** pill className (shared by "All" and every mapped category):
```
"bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground"
→ add: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all
```

The **selected** pill className:
```
"bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20"
→ add: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all
```

### 10. Auto-repair "Book" button — 1 edit

```
className="px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm"
→ add: active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 11. Product card `<motion.div>` (if it has `onClick`/`onTap`) — `replace_all`

Any clickable product/service card `<motion.div>` used as a button:
```
→ add: active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 12. Like button (heart icon) — 1 edit (icon-only)

```
→ add: active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 13. Size variant chips — `replace_all`

```
→ add: active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 14. "Back to Grocery" link (not-found state) — 1 edit

```
→ add: active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
*(Note: this is a shadcn `<Button>` already — skip if confirmed.)*

---

## Summary

| # | Target | Count | Tokens added |
|---|--------|-------|-------------|
| 1 | Banner nav (back/chat/cart) | 3 | `active:scale-95 transition-all focus-visible:ring` |
| 2 | Ride There | 1 | `active:scale-[0.98] transition-all focus-visible:ring` |
| 3 | Booking locked | 1 | `active:scale-[0.98] transition-all focus-visible:ring` |
| 4 | Call/SMS | 2 | `active:scale-[0.97] transition-all focus-visible:ring` |
| 5 | Chat tile | 1 | `active:scale-[0.97] transition-all focus-visible:ring` |
| 6 | Share tile | 1 | `active:scale-[0.97] transition-all focus-visible:ring` |
| 7 | Social `<a>` | 3 | `active:scale-95 transition-all focus-visible:ring` |
| 8 | Logo lightbox btn | 1 | `active:scale-95 transition-all focus-visible:ring-offset-2` |
| 9 | Category pills | 2 patterns | `focus-visible:ring transition-all` |
| 10 | Auto-repair Book btn | 1 | `active:scale-[0.98] transition-all focus-visible:ring` |
| 11 | Product cards (clickable) | many | `active:scale-[0.98] transition-all focus-visible:ring` |
| 12 | Like button (heart) | 1 | `active:scale-95 transition-transform focus-visible:ring` |
| 13 | Size variant chips | many | `active:scale-[0.97] transition-all focus-visible:ring` |
| 14 | Not-found "Back to Grocery" | 1 | skip if shadcn Button |

**~20 className edits**, all appending to existing class strings, zero logic/prop/query changes.

**HARD RULE respected**: no supabase queries, mutations, react-query keys, routing, or component logic touched.

**Owner must**: run `npm run update` (type-check + worker + build), preview at 375 / 768 / 1280, and verify every touched interactive element responds to click, tap, Tab+Enter keyboard navigation, and that nothing visually regresses.
