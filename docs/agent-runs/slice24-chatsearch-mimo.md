# MiMo run — 2026-06-14T00:58:33.901Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

**Inventory verified**: 7 raw `<button type="button">`, 0 motion.button, 0 shadcn `<Button>`. Search `<input>` has `focus:outline-none focus:ring-2 focus:ring-primary/30` → SKIP. Correct.

---

## Answers to your questions

**(1) Clear-X**: ✅ `transition-transform` (no hover-bg → scale sole prop) + `rounded-md` (ring shape) + `active:scale-95` + ring + `aria-label="Clear search"`.

**(2) Filter tabs**: ✅ Flip `transition-colors`→`transition-all` (new `active:scale-[0.97]` won't animate under `transition-colors`, and bg-swap stays smooth under `transition-all`). `aria-pressed` + `[0.97]` + normal outward ring (`overflow-x-auto` clips content not ring). Correct.

**(3) Media tiles**: ✅ `aria-label="Open media"` (better than "Open conversation" — distinguishes from the text-based results which also open a chat). `ring-inset` — **correct for two reasons**: (a) the tile's own `overflow-hidden` clips its outward ring at the `rounded-lg` corners; (b) `gap-1` (4px) makes outward 2px ring bleed into neighbor. `[0.98]` — OK for consistency with the sibling result rows. `transition-transform` (no hover-bg → scale sole prop). Agree.

**(4) Result rows (message/people/link)**: ✅ Wide `[0.98]` + `transition-all` (hover-bg) + normal outward ring, NO aria-label (visible text), NO ring-inset (plain `<ul>`/`<li>` not overflow-hidden).

**(5) Header back**: ✅ `transition-all` (hover-bg fades) + `active:scale-95` + ring + `aria-label="Go back"`.

**(6) Responsive 375px**: No crush. Header: back(~28) + gap-2 + search flex-1 ~310px → fits in 343px inner. Tabs: 4 tabs × ~60px + 3×6px gap = ~258px → fits (even if slightly tight, `overflow-x-auto` scrolls). Media: `grid-cols-3 gap-1` → ~113px/col, square tiles ~113px → fits. 768/1280 comfortable.

---

## Proposed diff

**File**: `src/pages/chat/ChatSearchAllPage.tsx`

```diff
--- a/src/pages/chat/ChatSearchAllPage.tsx
+++ b/src/pages/chat/ChatSearchAllPage.tsx
@@ -139,7 +139,7 @@
       <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3">
         <div className="flex items-center gap-2">
-          <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
+          <button type="button" onClick={goBack} aria-label="Go back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ChevronLeft className="w-5 h-5" />
           </button>
@@ -151,7 +151,7 @@
             {q && (
-              <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2">
+              <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 <X className="w-4 h-4 text-muted-foreground" />
               </button>
             )}
@@ -166,7 +166,9 @@
           {TABS.map((t) => {
             const Icon = t.icon;
             const active = tab === t.key;
             return (
-              <button type="button"
+              <button
+                type="button"
                 key={t.key}
                 onClick={() => setTab(t.key)}
+                aria-pressed={active}
                 className={cn(
-                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   active ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
                 )}
               >
@@ -196,7 +198,7 @@
                   <li key={m.id}>
-                    <button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40">
+                    <button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       <div className="text-sm line-clamp-2">{m.message}</div>
                       <div className="text-[11px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
@@ -210,7 +212,7 @@
                 <li key={p.id}>
-                  <button type="button" onClick={() => goToChat(p.user_id || p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40">
+                  <button type="button" onClick={() => goToChat(p.user_id || p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Avatar className="w-10 h-10">
@@ -231,7 +233,7 @@
-                  <button type="button" key={m.id} onClick={() => goToChat(partnerId)} className="aspect-square overflow-hidden rounded-lg bg-muted/40">
+                  <button type="button" key={m.id} onClick={() => goToChat(partnerId)} aria-label="Open media" className="aspect-square overflow-hidden rounded-lg bg-muted/40 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                     {m.image_url ? (
@@ -250,7 +252,7 @@
                   <li key={m.id}>
-                    <button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40">
+                    <button type="button" onClick={() => goToChat(partnerId)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       <div className="text-sm text-primary truncate">{url}</div>
                       <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{m.message}</div>
```

**Summary**: 7 controls / 7 line-edits, `git diff` = **9 ins / 7 del** (+2 net = 1 `aria-label` on clear-X + 1 `aria-pressed` on filter tabs, each on its own new line; media tile's `aria-label` is inline appended). All className + display-only attr. Zero logic changes.

---

## Flags (NOT fixable, left untouched)

- **Sub-44px tap targets** (established repo compact pattern, not per-page): header back `p-1.5` ~28px; clear-X ~16-22px (no padding, just icon); filter tabs `py-1.5` ~26px; result rows `py-2.5` ~40px. Media tiles are fine (square, ~113px).
- **Keyboard gap on filter tabs** — the tabs are real `<button>`s so they're focusable (rings will work), but the `<ul>`/`<li>` result lists have no roving-tabindex pattern (repo-wide pattern).
- **Media tiles accessible label "Open media"** — could also be "Open chat" if the owner prefers emphasizing the navigation target over the media content.

## Verify

Run `npm run update` (type-check + worker type-check + production build — must pass 0 errors). Preview at 375/768/1280 to confirm the 4-tab row scrolls cleanly and `grid-cols-3 gap-1` media tiles don't crush.
