# DeepSeek run — 2026-06-14T00:57:40.254Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/chat/ChatSearchAllPage.tsx (267 lines, route /chat/search-all -- unified global chat search across messages/people/media/links via direct_messages + profiles). Sticky header (back + search <input> + clear-X); filter-tab row (Messages/People/Media/Links, overflow-x-auto); results per tab: messages = list of text-row buttons, people = list of avatar+name row buttons, media = grid-cols-3 of image/video tile buttons, links = list of url+message row buttons. Each result button onClick=goToChat(partnerId) => nav(`/chat?with=...`). State: useState tab, q, debounced, loading, messages/people/media/links. useSmartBack("/chat") for back.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 7 raw <button type="button">, 0 motion.button, 0 shadcn <Button>. The search <input> (L146-152) ALREADY has "focus:outline-none focus:ring-2 focus:ring-primary/30" => SKIP (repo rule: input w/ existing focus:ring => don't touch, never active:scale). <Avatar> is shadcn display (not a button). No motion.div.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates (hover-bg) OR general raw-button standard; transition-transform when scale is the SOLE animated prop. aria-label for icon-only / image-only (no visible text). aria-pressed for TOGGLE/segmented buttons whose pressed-state is conveyed ONLY by color/bg (NOT a text change). ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent (or IS an overflow-hidden tile in a tight grid). rounded-md on a bare icon button lacking rounding. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY -- don't change existing scale value or flip transition-* unless a hover/color-bg demands the new scale to animate.

HARD RULE: className + display-only attr (aria-label/aria-pressed) ONLY. Do NOT change any onClick / goToChat / nav / goBack / setTab / setQ / supabase / useEffect / useState / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (L141, icon ChevronLeft; onClick={goBack}; "p-1.5 rounded-full hover:bg-muted/60" -- NO transition, NO active:scale) -> append " transition-all active:scale-95 focus-visible:...ring" + add aria-label="Go back" (icon tier; transition-all so hover:bg-muted/60 fades; rounded-full => normal ring).

(2) Search clear-X (L154, icon X; onClick={() => setQ("")}; "absolute right-3 top-1/2 -translate-y-1/2" -- BARE: NO rounding, NO padding, NO hover-bg, NO transition, NO scale, NO aria-label) -> append " rounded-md transition-transform active:scale-95 focus-visible:...ring" + add aria-label="Clear search" (icon tier; NO hover-bg => scale is SOLE prop => transition-transform; add rounded-md so the ring has a shape). Q: transition-transform (no hover-bg) ok, or transition-all? And rounded-md ok for ring shape (no padding change -- it's absolutely positioned, padding would shift it)? Lean transition-transform + rounded-md.

(3) Filter tabs (L166-176, .map x4; onClick={() => setTab(t.key)}; cn() base "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors" [transition-colors] + active "bg-ig-gradient text-white" vs inactive "bg-muted/50 text-muted-foreground"; label ALWAYS visible, selection by bg only) -> FLIP transition-colors->transition-all + append " active:scale-[0.97] focus-visible:...ring" to cn base + add aria-pressed={active} (segmented tier; FLIP because the new active:scale won't animate under transition-colors, and the active/inactive bg-swap stays smooth under transition-all; row "flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide" => overflow-x-auto clips CONTENT not the ~2px outward ring => NORMAL ring, NO ring-inset). Q: agree on the transition-colors->transition-all flip + aria-pressed + [0.97]?

(4) Message result rows (L196, .map; onClick={() => goToChat(partnerId)}; "w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40" -- NO transition/scale; visible message+date text) -> append " transition-all active:scale-[0.98] focus-visible:...ring" (wide/card tier; transition-all so hover:bg-muted/40 fades; visible text = accessible name => NO aria-label; rows in plain <ul>/<li> NOT overflow-hidden => NORMAL ring, NO ring-inset).

(5) People result rows (L210, .map; onClick={() => goToChat(p.user_id||p.id)}; "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40"; avatar + visible name) -> same as (4): append " transition-all active:scale-[0.98] focus-visible:...ring" (wide tier; visible name = accessible name => NO aria-label; NO ring-inset).

(6) Media tiles (L231, .map; onClick={() => goToChat(partnerId)}; "aspect-square overflow-hidden rounded-lg bg-muted/40"; contains ONLY <img alt=""> or <video> => NO visible text => NO accessible name) -> add aria-label + append scale + ring. Q (3-part): (a) aria-label wording -- "Open conversation" (these tiles open the chat w/ that partner)? (b) ring-inset vs normal outward ring -- the tile IS "overflow-hidden rounded-lg" in a "grid grid-cols-3 gap-1" (4px gap); the tile's OWN overflow-hidden does NOT clip its OWN ring (overflow clips descendants, not the element's box-shadow), BUT the 4px gap makes a 2px outward ring cramped/overlapping => lean ring-inset (draws cleanly over the flush image edge); (c) tier -- [0.98] (consistency w/ the sibling result rows, all open a chat) or [0.97] (compact grid cell)? And transition-transform (no hover-bg => scale sole prop)? Lean aria-label="Open conversation" + transition-transform active:scale-[0.98] + ring-inset.

(7) Link result rows (L250, .map; onClick={() => goToChat(partnerId)}; "w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40"; visible url+message text) -> same as (4): append " transition-all active:scale-[0.98] focus-visible:...ring" (wide tier; visible text => NO aria-label; NO ring-inset).

QUESTIONS:
(1) Clear-X bare icon: transition-transform (no hover-bg) + rounded-md (ring shape, no padding shift) + active:scale-95 + ring + aria-label="Clear search". Agree?
(2) Filter tabs: flip transition-colors->transition-all + aria-pressed={active} + active:scale-[0.97] + ring. Agree on flip?
(3) Media tiles: aria-label="Open conversation"? ring-inset (overflow-hidden tile in grid-cols-3 gap-1)? tier [0.98] or [0.97]? transition-transform (no hover-bg)?
(4) Result rows (message/people/link): wide [0.98] + transition-all (hover:bg-muted/40) + ring, NO aria-label (visible text), NO ring-inset (plain ul/li). Agree?
(5) Header back: transition-all (hover:bg-muted/60) + active:scale-95 + ring + aria-label="Go back". Agree?
(6) Responsive 375/768/1280: header flex (back p-1.5 + search flex-1 relative + clear-X absolute); tabs flex gap-1.5 overflow-x-auto (4 tabs); main px-3; media grid-cols-3 gap-1. Any crush @375 (esp the 4-tab row + grid-cols-3 tiles)?

ALSO confirm: (a) inventory exhaustive (exactly 7 raw <button>, no missed control)? (b) the search <input> already has focus:ring-primary/30 => correctly SKIP? (c) sub-44px tap targets to FLAG (back p-1.5~28px; clear-X ~16-22px; tabs py-1.5~26px; rows py-2.5~40px; media tiles aspect-square = large, fine)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/chat/ChatSearchAllPage.tsx

---

# ChatSearchAllPage — Premium Interaction + Responsive QA

## Plan

Apply the repo's standard interaction tokens to all 7 raw `<button>` controls. No logic changes. No motion.button. No shadcn Button.

## Proposed Diff

**File:** `src/pages/chat/ChatSearchAllPage.tsx`

### 1. Header back button (L141)
**Before:**
```tsx
<button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
```
**After:**
```tsx
<button type="button" onClick={goBack} aria-label="Go back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 2. Search clear-X button (L154)
**Before:**
```tsx
<button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2">
```
**After:**
```tsx
<button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 3. Filter tabs (L166-176)
**Before:**
```tsx
className={cn(
  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
  active ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
)}
```
**After:**
```tsx
className={cn(
  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  active ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
)}
```
Add `aria-pressed={active}` to the `<button>` element.

### 4. Message result rows (L196)
**Before:**
```tsx
<button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40">
```
**After:**
```tsx
<button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 5. People result rows (L210)
**Before:**
```tsx
<button type="button" onClick={() => goToChat(p.user_id || p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40">
```
**After:**
```tsx
<button type="button" onClick={() => goToChat(p.user_id || p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 6. Media tiles (L231)
**Before:**
```tsx
<button type="button" key={m.id} onClick={() => goToChat(partnerId)} className="aspect-square overflow-hidden rounded-lg bg-muted/40">
```
**After:**
```tsx
<button type="button" key={m.id} onClick={() => goToChat(partnerId)} aria-label="Open conversation" className="aspect-square overflow-hidden rounded-lg bg-muted/40 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
```

### 7. Link result rows (L250)
**Before:**
```tsx
<button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40">
```
**After:**
```tsx
<button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

## Answers to Your Questions

1. **Clear-X:** ✅ `transition-transform` (no hover-bg, scale is sole prop) + `rounded-md` (gives ring shape, no padding shift since absolute) + `active:scale-95` + ring + `aria-label="Clear search"`. Correct.

2. **Filter tabs:** ✅ Flip `transition-colors`→`transition-all` (so `active:scale-[0.97]` animates) + `aria-pressed={active}` + `[0.97]` + normal outward ring (`overflow-x-auto` ≠ ring clip). Correct.

3. **Media tiles:** ✅ `aria-label="Open conversation"` + `transition-transform` (no hover-bg) + `active:scale-[0.98]` (matches sibling result rows tier) + **`ring-inset`** (4px `gap-1` makes outward ring cramped; tile's own `overflow-hidden` doesn't clip its ring but neighbor bleed is real). Correct.

4. **Result rows (message/people/link):** ✅ `transition-all` (hover-bg fades) + `active:scale-[0.98]` (wide tier) + ring, NO `aria-label` (visible text), NO `ring-inset` (plain `<ul>/<li>` flow). Correct.

5. **Header back:** ✅ `transition-all` (hover-bg fades) + `active:scale-95` + ring + `aria-label="Go back"`. Correct.

6. **Responsive 375/768/1280:** Clean. Header: back `p-1.5` (~28px) + `gap-2` + search `flex-1` (~275px @375) + clear-X absolute. Tabs: `flex gap-1.5 overflow-x-auto` (4 tabs × ~75px = 300px → scrolls). Main `px-3`. Media `grid-cols-3 gap-1` (~112px/col). No crush.

## Confirmations

- **(a) Inventory exhaustive:** ✅ Exactly 7 raw `<button type="button">`. Zero missed controls.
- **(b) Search `<input>`:** ✅ Already has `focus:ring-2 focus:ring-primary/30` → correctly SKIP.
- **(c) Sub-44px tap targets to FLAG:** Back `p-1.5` ≈ 28px; clear-X ≈ 16-22px; tabs `py-1.5` ≈ 26px; rows `py-2.5` ≈ 40px. All below 44px touch minimum — consistent with repo-wide pattern, flag only.

## Owner Verify

Run `npm run update` (type-check + worker type-check + production build) before committing. Preview at `/chat/search-all` on localhost (needs auth + populated `direct_messages`/`profiles` rows for non-empty results).
