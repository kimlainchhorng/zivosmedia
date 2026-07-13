# MiMo run — 2026-06-14T01:09:16.354Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/chat/CustomFoldersPage.tsx (217 lines, route /chat/custom-folders -- Telegram-style chat-folder manager reading/writing the `chat_folders` table; supports create, rename, reorder up/down, delete). Layout: sticky header (back + title + "+" new-folder); intro <p>; suggested-folders card (4 chips, shown only when folders.length===0); folder list rows (icon + name + Position N + move-up/move-down/edit/delete icon buttons); bottom-sheet modal (icon-picker grid of 12 emoji + name <input> + Save/Create CTA), with backdrop click-to-close.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 10 raw <button type="button">, 0 motion.button, 0 shadcn <Button>. The name <input> (L202-207) ALREADY has "focus:outline-none focus:ring-2 focus:ring-primary/30" => SKIP (repo rule: input w/ existing focus:ring => don't touch, never active:scale). Modal backdrop <div> (L185, onClick={()=>setEditing(null)} click-catcher) + inner modal <div> (L186, onClick stopPropagation) are presentational divs (no role/tabIndex) => leave as-is. No motion.div.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates (hover-bg) OR general raw-button standard; transition-transform when scale is the SOLE animated prop. aria-label for icon-only / image-only (no visible text). aria-pressed for TOGGLE/segmented buttons whose pressed-state is conveyed ONLY by color/bg/ring (NOT a text change). ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent (or IS an overflow-hidden tile in a tight grid). rounded-md on a bare icon button lacking rounding. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY.

HARD RULE: className + display-only attr (aria-label/aria-pressed) ONLY. Do NOT change any onClick / setEditing / save / addSuggested / remove / move / goBack / disabled / useState / useQuery / supabase / refresh / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (L119, icon ChevronLeft; onClick={goBack}; "p-1.5 rounded-full hover:bg-muted/60" -- NO aria, NO transition, NO scale) -> append " transition-all active:scale-95 focus-visible:...ring" + add aria-label="Go back" (icon tier; transition-all so hover:bg-muted/60 fades; rounded-full => normal ring).

(2) Header "+" new-folder (L123, icon Plus; onClick={()=>setEditing({name:"",icon:"📁"})}; "p-1.5 rounded-full hover:bg-muted/60" + aria-label="New folder" ALREADY) -> append " transition-all active:scale-95 focus-visible:...ring" (icon tier; aria already present).

(3) Suggested chips (L141, .map x4; onClick={()=>addSuggested(p)}; "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border border-border/60 text-xs font-medium hover:bg-muted/60"; visible text icon+name+Plus) -> append " transition-all active:scale-[0.97] focus-visible:...ring" (chip/pill tier; transition-all so hover:bg-muted/60 fades; visible text => NO aria-label; row is flex flex-wrap gap-1.5 NOT overflow-hidden => normal ring).

(4) Move up (L168, icon ArrowUp; onClick={()=>move(idx,-1)}; disabled={idx===0}; "p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30") -> append " transition-all active:scale-95 focus-visible:...ring" + add aria-label="Move up" (icon tier; PRESERVE disabled; disabled:opacity-30 stays; :active/focus-visible won't fire while disabled so no conflict).

(5) Move down (L171, icon ArrowDown; onClick={()=>move(idx,1)}; disabled={idx===folders.length-1}; same className) -> same as (4): append tokens + aria-label="Move down" (PRESERVE disabled).

(6) Edit pencil (L174, icon Pencil; onClick={()=>setEditing({id:f.id,name:f.name,icon:f.icon})}; "p-1.5 rounded-full hover:bg-muted/60") -> append " transition-all active:scale-95 focus-visible:...ring" + add aria-label="Rename folder" (icon tier).

(7) Delete trash (L177, icon Trash2; onClick={()=>remove(f.id)}; "p-1.5 rounded-full hover:bg-muted/60 text-destructive") -> append " transition-all active:scale-95 focus-visible:...ring" + add aria-label="Delete folder" (icon tier; text-destructive preserved; hover:bg-muted/60 => transition-all).

(8) Modal close X (L189, icon X; onClick={()=>setEditing(null)}; BARE -- NO className at all, NO rounding, NO padding, NO hover-bg, NO transition, NO scale, NO aria) -> add className="rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-label="Close" (icon tier; NO hover-bg => scale is SOLE animated prop => transition-transform; add rounded-md so the ring has a shape). Q: transition-transform (no hover-bg) + rounded-md OK? (it's a normal inline button in a flex row, NOT absolutely positioned -- so rounded-md adds no layout shift.)

(9) Icon-picker emoji buttons (L193, .map x12 over ICONS=["📁","⭐","💼","🏠","❤️","🎮","📚","🎵","✈️","🛒","👨‍👩‍👧","🤖"]; onClick={()=>setEditing({...editing,icon:ic})}; className TEMPLATE-LITERAL: `text-lg p-2 rounded-lg ${editing.icon===ic ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"}`; content = single emoji glyph; SELECTION toggle -- selected state shown ONLY by bg-primary/10 + ring-1 ring-primary/40, unselected has hover:bg-muted/50) -> prepend to STATIC base (the "text-lg p-2 rounded-lg" prefix, BEFORE the ${...}) " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-pressed={editing.icon === ic}. NO aria-label (see Q-c). NO ring-inset (flex flex-wrap gap-1.5, not overflow-hidden, not tight grid).
   OPEN QUESTIONS (3-part):
   (a) aria-pressed={editing.icon===ic} -- correct? It's a single-select swatch group (radio-like) where the picked state is conveyed by bg/ring only, no text change. Lean YES aria-pressed (toggle tier). (Could argue role="radio"+aria-checked is more semantically correct for single-select, but that needs role+arrow-key handling = logic; out of scope. aria-pressed is the in-repo display-only convention.) Agree aria-pressed, NOT aria-checked/role?
   (b) RING INTERACTION -- the SELECTED state already has "ring-1 ring-primary/40" (a persistent 1px selection ring). I'm adding "focus-visible:ring-2 focus-visible:ring-ring" (a 2px focus ring, keyboard-focus only). On a selected+focused emoji both apply; Tailwind's focus-visible:ring-2 + focus-visible:ring-ring OVERRIDE the ring width(2 vs 1) and color(ring vs primary/40) only while focus-visible is active => clean swap, no double-ring stacking. Same as the ChatThemes selection-ring-overlap precedent. Agree this is clean / no ring-offset needed?
   (c) aria-label for emoji buttons -- the emoji glyph IS the visible content & serves as the accessible name (SR announces unicode name e.g. "file folder, pressed, button"). Adding a GENERIC aria-label="Choose icon" to all 12 would make them indistinguishable (all read identical) => WORSE for SR. The ICONS array has no human names to build per-emoji labels from. Lean NO aria-label (let the emoji be the name). Agree?
   (d) TIER -- [0.95] icon-only (single emoji glyph, p-2, icon-like) vs [0.97] chip? Lean [0.95] (it's a glyph swatch, icon-only family). And transition-all (unselected branch has hover:bg-muted/50 hover-bg that should fade alongside the scale)? Agree transition-all + [0.95]?

(10) Save/Create CTA (L209, text "Save changes"/"Create folder"; onClick={save}; "w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium"; visible text, wide) -> append " transition-all active:scale-[0.98] focus-visible:...ring" (wide/primary tier; visible text => NO aria-label; transition-all = general wide-CTA standard even w/o hover-bg).

QUESTIONS:
(1) Modal close X (#8): bare icon, NO className -> add full className with rounded-md transition-transform active:scale-95 + ring + aria-label="Close". transition-transform (no hover-bg) right, or transition-all? rounded-md OK (normal inline button, no abs-position so no shift)?
(2) Icon-picker (#9): the big one -- (a) aria-pressed={editing.icon===ic} (not aria-checked/role)? (b) added focus-visible:ring-2 ring-ring cleanly overrides the existing conditional ring-1 ring-primary/40 selection ring (no stacking/offset needed)? (c) NO aria-label (emoji glyph is the name; generic label would be worse)? (d) tier [0.95] + transition-all (unselected hover:bg-muted/50)?
(3) Disabled move up/down (#4,#5): appending active:scale-95 + focus-visible ring to a button that can be disabled={...} disabled:opacity-30 -- any issue? (Expectation: none -- :active & focus-visible don't fire on disabled elements.)
(4) Icon buttons #1,#2,#6,#7 + chips #3 all use transition-all because of hover:bg-muted/60 (#7 also text-destructive). Header icons + folder-row icons [0.95], chips [0.97], CTA [0.98]. Agree on the per-button tiers?
(5) Responsive 375/768/1280: header flex (back p-1.5 + title flex-1 + "+" p-1.5); suggested card flex-wrap gap-1.5 (4 chips); folder rows flex gap-3 with FOUR trailing icon buttons (move-up/down/edit/delete each p-1.5) + icon + name(flex-1 min-w-0 truncate) -- any crush @375 with 4 action buttons + emoji + name on one row? modal max-w-sm w-full, icon grid flex-wrap 12 emoji p-2.

ALSO confirm: (a) inventory exhaustive (exactly 10 raw <button>, no missed control)? (b) name <input> already has focus:ring-primary/30 => correctly SKIP? (c) modal backdrop + inner divs presentational => correctly leave? (d) sub-44px tap targets to FLAG (back/+/move/edit/delete p-1.5 ~28px; close X bare ~16-20px; chips py-1.5 ~30px; emoji p-2 ~36px; CTA py-2.5 ~40px -- the four folder-row action buttons @ ~28px packed together are the tightest)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/chat/CustomFoldersPage.tsx

---

## Validation — all 10 controls confirmed correct

Your inventory, tiers, tokens, aria choices, and responsive analysis are all accurate. Here are my answers to each open question, then the ready-to-apply diff.

---

### Open questions resolved

**Q1 (close X #8):** `transition-transform` + `rounded-md` — **CORRECT.** No hover-bg → scale is sole animated prop. `rounded-md` gives the ring a shape; it's a normal inline button in a `flex justify-between` row (not absolutely positioned) so no layout shift.

**Q2 (emoji #9):** All four sub-parts **CORRECT:**
- **(a)** `aria-pressed={editing.icon === ic}` — the repo display-only convention for single-select swatches. `role="radio"` needs arrow-key logic → out of scope.
- **(b)** `focus-visible:ring-2 focus-visible:ring-ring` cleanly overrides the conditional `ring-1 ring-primary/40` via `:focus-visible` specificity. No stacking, no offset needed. ChatThemesPage precedent.
- **(c)** NO `aria-label` — emoji glyph is the accessible name. Generic "Choose icon" ×12 = indistinguishable → worse.
- **(d)** `transition-all active:scale-95` — unselected branch has `hover:bg-muted/50` → needs `transition-all`. Single-glyph swatch = icon family = `[0.95]`.

**Q3 (disabled move up/down #4,#5):** **No issue.** `:active` and `:focus-visible` don't fire on `disabled` elements in any browser. Appending the tokens is safe; the `disabled:opacity-30` remains undisturbed.

**Q4 (per-button tiers):** **All confirmed.** Header icons + folder-row icons `[0.95]`, chips `[0.97]`, CTA `[0.98]`.

**Q5 (375px crush):** **No crush.** Row has 6 children (emoji, name-div, up, down, edit, delete) → 5 × `gap-3` (12px) = 60px gaps. 4 buttons × ~28px = 112px. Emoji ~24px. Padding 32px. Remaining for `flex-1 min-w-0 truncate` name-div: ~147px — ample.

**Confirmations:**
- **(a)** Inventory exhaustive — exactly 10 raw `<button type="button">`, 0 motion.button, 0 shadcn Button. ✅
- **(b)** Name `<input>` has `focus:ring-2 focus:ring-primary/30` → correctly SKIP. ✅
- **(c)** Backdrop + inner divs are presentational → correctly leave. ✅
- **(d)** Sub-44px targets to FLAG (repo-wide compact pattern): header icons + folder-row icons `p-1.5` ~28px, close X bare ~16-20px, chips `py-1.5` ~30px, emoji `p-2` ~36px, CTA `py-2.5` ~40px. The four folder-row action buttons at ~28px packed together are the tightest.

---

### Proposed diff

**File:** `src/pages/chat/CustomFoldersPage.tsx`

```diff
--- a/src/pages/chat/CustomFoldersPage.tsx
+++ b/src/pages/chat/CustomFoldersPage.tsx
@@ -116,10 +116,10 @@
     <div className="min-h-screen bg-background pb-20">
       <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
-        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
+        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back">
           <ChevronLeft className="w-5 h-5" />
         </button>
         <h1 className="text-base font-semibold flex-1">Chat Folders</h1>
         <button type="button"
           onClick={() => setEditing({ name: "", icon: "📁" })}
-          className="p-1.5 rounded-full hover:bg-muted/60"
+          className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           aria-label="New folder"
         >
           <Plus className="w-5 h-5" />
@@ -141,7 +141,7 @@
               <button type="button"
                 key={p.name}
                 onClick={() => addSuggested(p)}
-                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border border-border/60 text-xs font-medium hover:bg-muted/60"
+                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border border-border/60 text-xs font-medium hover:bg-muted/60 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <span>{p.icon}</span>
                 <span>{p.name}</span>
@@ -168,16 +168,16 @@
-            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30">
+            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Move up">
               <ArrowUp className="w-4 h-4" />
             </button>
-            <button type="button" onClick={() => move(idx, 1)} disabled={idx === folders.length - 1} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30">
+            <button type="button" onClick={() => move(idx, 1)} disabled={idx === folders.length - 1} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Move down">
               <ArrowDown className="w-4 h-4" />
             </button>
-            <button type="button" onClick={() => setEditing({ id: f.id, name: f.name, icon: f.icon })} className="p-1.5 rounded-full hover:bg-muted/60">
+            <button type="button" onClick={() => setEditing({ id: f.id, name: f.name, icon: f.icon })} className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Rename folder">
               <Pencil className="w-4 h-4" />
             </button>
-            <button type="button" onClick={() => remove(f.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive">
+            <button type="button" onClick={() => remove(f.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Delete folder">
               <Trash2 className="w-4 h-4" />
             </button>
@@ -189,7 +189,7 @@
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-sm font-semibold">{editing.id ? "Edit folder" : "New folder"}</h3>
-              <button type="button" onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
+              <button type="button" onClick={() => setEditing(null)} className="rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close"><X className="w-4 h-4" /></button>
             </div>
             <div className="flex flex-wrap gap-1.5 mb-3">
               {ICONS.map((ic) => (
                 <button type="button"
                   key={ic}
                   onClick={() => setEditing({ ...editing, icon: ic })}
-                  className={`text-lg p-2 rounded-lg ${editing.icon === ic ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"}`}
+                  className={`text-lg p-2 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${editing.icon === ic ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"}`}
+                  aria-pressed={editing.icon === ic}
                 >
                   {ic}
                 </button>
@@ -209,7 +209,7 @@
-            <button type="button" onClick={save} className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium">
+            <button type="button" onClick={save} className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               {editing.id ? "Save changes" : "Create folder"}
             </button>
```

**Summary of changes (10 controls / 10 line-edits + 6 new aria attrs):**

| # | Control | Tier | Transition | New aria | Ring | Notes |
|---|---------|------|------------|----------|------|-------|
| 1 | Header back | `[0.95]` | `transition-all` (hover-bg) | `aria-label="Go back"` | normal | `rounded-full` present |
| 2 | Header + | `[0.95]` | `transition-all` (hover-bg) | already has | normal | — |
| 3 | Suggested chips ×4 | `[0.97]` | `transition-all` (hover-bg) | none (visible text) | normal | `flex-wrap` not overflow-hidden |
| 4 | Move up | `[0.95]` | `transition-all` (hover-bg) | `aria-label="Move up"` | normal | `disabled` preserved, no conflict |
| 5 | Move down | `[0.95]` | `transition-all` (hover-bg) | `aria-label="Move down"` | normal | same |
| 6 | Edit pencil | `[0.95]` | `transition-all` (hover-bg) | `aria-label="Rename folder"` | normal | — |
| 7 | Delete trash | `[0.95]` | `transition-all` (hover-bg) | `aria-label="Delete folder"` | normal | `text-destructive` preserved |
| 8 | Modal close X | `[0.95]` | `transition-transform` (no hover-bg) | `aria-label="Close"` | normal | bare button — add `rounded-md` |
| 9 | Emoji swatch ×12 | `[0.95]` | `transition-all` (unselected hover-bg) | `aria-pressed` | normal | focus ring overrides selection ring cleanly |
| 10 | Save/Create CTA | `[0.98]` | `transition-all` (standard) | none (visible text) | normal | wide primary CTA |

**SKIPPED (correctly):** name `<input>` (has `focus:ring-2 focus:ring-primary/30`), modal backdrop `<div>` + inner `<div>` (presentational, no role/tabIndex).

**git diff stats:** ~13 ins / 10 del, +3 net (6 new standalone `aria-*` attr lines offset by some lines getting shorter/longer). All changes are className + display-only attr; zero logic touched.

---

### Owner must verify

1. **`npm run update`** — must pass (type-check + worker type-check + production build).
2. **Preview at 375/768/1280** — the folder-row layout (6 children, 4 action buttons) is the key responsive check; emoji grid + modal at 375px.
3. **Keyboard walkthrough** — Tab through header → suggested chips → folder rows (all 4 action buttons per row) → open modal → Tab through emoji grid → name input → CTA → close X. All 10 controls should show focus-visible ring.
4. **Sub-44px tap targets** (established repo pattern, flag not fix): header icons + folder-row icons ~28px, close X ~16-20px, chips ~30px, emoji ~36px, CTA ~40px.
