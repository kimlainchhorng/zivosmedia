# DeepSeek run — 2026-06-13T23:05:48.118Z

- model: deepseek-chat
- task: Analyze a customer-facing PUBLIC saved-share-links page — src/pages/ShareWatchlistPage.tsx (route /share/with-me; a localStorage list of saved /share/trip and /share/order links, with inline rename + remove + open per row) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any localStorage logic, the useShareWatchlist hook, navigation, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. The page has 3 raw icon-only <button>s lacking interaction tokens: header Back (~L31), Row Rename (~L153), Row Remove (~L160) — each already has an aria-label. For the page: (1) interaction consistency — add active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to those 3 icon-only buttons; do NOT touch the shadcn Open <Button> or the rename <Input> (already ship tokens); flag any interactive control I missed; (2) responsive issues at 375/768/1280 (single max-w-screen-md centered column); (3) any display-only polish worth doing. Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~800 tokens.
- files: src/pages/ShareWatchlistPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Three icon-only `<button>`s on `ShareWatchlistPage.tsx` lack interaction tokens present in the reference `JobPostingDetailPage.tsx` (which uses `active:scale-[0.98/0.99]` + `focus-visible:ring-2` on raw buttons). No other raw controls exist — the `Open` `<Button>` and rename `<Input>` are shadcn (already ship tokens). No responsive issues at 375/768/1280 (single column, `max-w-screen-md`). One display-only polish: the empty-state `Eye` icon could use a gradient ring for visual parity with the reference's icon-chip pattern.

## Proposed changes (file: `src/pages/ShareWatchlistPage.tsx`)

### 1. Header Back button (~L31)
**Before:** `className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"`
**After:** `className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 2. Row Rename button (~L153)
**Before:** `className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center"`
**After:** `className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 3. Row Remove button (~L160)
**Before:** `className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"`
**After:** `className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 4. (Optional polish) Empty-state icon ring (~L91)
**Before:** `className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3"`
**After:** `className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-fuchsia-500/10 border border-primary/20 flex items-center justify-center mx-auto mb-3"`

## Controls audit — nothing else needs tokens
- **`Open` `<Button>`** (L165): shadcn — already ships `active:scale-[0.98]` + `focus-visible:ring-2`
- **Rename `<Input>`** (L138): shadcn — already ships `focus-visible:ring-2`
- **Row card `<motion.div>`** (L121): non-interactive container (no `onClick`) — skip
- **Empty-state** (L88–103): all static text/divs — no interactive controls

## Verification
Run `npm run update` — must pass (type-check + worker type-check + production build). Preview at `/share/with-me` on 375/768/1280 — confirm the 3 buttons show `active:scale` press feedback and keyboard `focus-visible:ring`.
