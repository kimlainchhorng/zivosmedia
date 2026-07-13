# MiMo run — 2026-06-14T03:23:36.839Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 40 — ReferralsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append the missing tokens (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh.
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH (few px) inside a SEPARATE overflow-hidden rounded ancestor. A control with AMPLE padding clearance (p-3.5/p-4 >= ring width) inside an overflow-hidden card -> OUTWARD ring (not clipped). A control in a non-overflow-hidden row -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls NEED aria-label. aria-pressed ONLY for toggle/segmented controls whose pressed-state is conveyed ONLY by background. A toggle whose accessible name + visible text FLIP between states (Pause <-> Resume, with aria-label also flipping Deactivate <-> Reactivate) does NOT use aria-pressed (state already conveyed by the changing label, not ONLY by bg).

PAGE: src/pages/ReferralsPage.tsx (389 lines, reached via in-app nav, useAuth + SwipeBackContainer + SEOHead noIndex). "Referrals" manage invitation links backed by real `invitation_links` table (key ["invitation-links", user?.id]; createMutation/toggleMutation/deleteMutation). Layout: sticky header (shadcn back Button + Gift badge + "Referrals" title + conditional shadcn "New" Button); gradient hero stat motion.div (NO onClick); an AnimatePresence create-card motion.div (inline, overflow-hidden, p-4) holding a RAW Cancel X button + 3 RAW duration chips + 2 RAW <input> + shadcn "Generate link" Button; loading skeletons; empty-state card (shadcn Button); then a list of link-row motion.div (each presentational [entrance anim + inactive opacity via cn(), NO onClick]: a RAW Copy button + RAW Share button + RAW Pause/Resume button + RAW Delete icon button).

SKIP (confirm): shadcn back Button L179 (aria-label="Back", ships tokens); shadcn "New" Button L189; shadcn "Generate link" Button L273; shadcn "Generate your first link" Button L302; two RAW <input> L254/L264 (existing focus:ring -> leave as-is, never active:scale); hero stat motion.div L202 (NO onClick); create-card motion.div L217 (NO onClick); each link-row motion.div L321 (entrance anim + inactive cn() opacity, NO onClick); all icons.

SIX edits to resolve:

(A) Cancel button, L225-232 — RAW <button type="button" aria-label="Cancel" onClick={() => setCreating(false)}>, icon-only (X). className = "h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground" (NO transition currently). Sits in create-card motion.div `rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden` (p-4 clearance).
Q-A: ADD `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (fresh transition-all because it HAS hover:bg-secondary color fade; icon-only scale-95; KEEP aria-label; OUTWARD ring — p-4 clearance >> ring width inside overflow-hidden card). Agree?

(B) Duration chips, L237-249 ×3 — RAW <button type="button" onClick={() => setDuration(d)}> in (["7d","30d","none"]).map, visible text ("7 days"/"30 days"/"Never expires"). className = cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all", duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). Selected conveyed by bg; visible-text label is constant per button. Sits in same overflow-hidden create-card (p-4).
Q-B: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() BASE (transition-all already present -> append, DON'T-CHURN; segmented-chip tier [0.97]); ADD `aria-pressed={duration === d}` (segmented toggle, selection conveyed only by bg, label word constant per button); NO aria-label (visible text); OUTWARD ring. Agree?

(C) Copy button, L347-352 — RAW <button type="button" onClick={() => copy(url)}>, visible text "Copy". className = "flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all". Sits in link-row motion.div `rounded-2xl bg-card border border-border p-3.5 space-y-3` (NOT overflow-hidden).
Q-C: ring-only append ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (active:scale-95 + transition-all already -> ring-only DON'T-CHURN); NO aria-pressed (action button, not a toggle); NO aria-label (visible text); OUTWARD ring. Agree?

(D) Share button, L354-360 — RAW <button type="button" onClick={() => share(l)}>, visible text "Share". className = "flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all". Same link-row (NOT overflow-hidden).
Q-D: ring-only append (active:scale-95 + transition-all already); NO aria-pressed; NO aria-label; OUTWARD ring. Agree?

(E) Pause/Resume button, L361-371 — RAW <button type="button" aria-label={l.is_active ? "Deactivate" : "Reactivate"} onClick={() => toggleMutation.mutate(...)}>, visible text FLIPS "Pause"/"Resume". className = cn("h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all", l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white"). Same link-row.
Q-E: ring-only append ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() BASE (active:scale-95 + transition-all already); KEEP dynamic aria-label; NO aria-pressed (visible text "Pause"/"Resume" AND aria-label "Deactivate"/"Reactivate" both FLIP -> state conveyed by changing label, not ONLY by bg, so aria-pressed redundant — same rule as media play/pause); OUTWARD ring. Agree?

(F) Delete button, L372-379 — RAW <button type="button" aria-label="Delete link" onClick={() => { if (confirm(...)) deleteMutation.mutate(l.id); }}>, icon-only (Trash2). className = "h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors". Same link-row (NOT overflow-hidden).
Q-F: FLIP `transition-colors`->`transition-all` + append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (existing transition-colors eases hover:text-destructive + hover:bg-destructive/10 but not the new transform -> transition-all superset; transition-transform would regress the hover fades to a snap; icon-only scale-95); KEEP aria-label; OUTWARD ring. Agree?

============================================================
DELIVERABLE: Give the EXACT final className string + attrs for (A)-(F). Resolve: (A) fresh transition-all vs transition-transform; (B) [0.97] tier + aria-pressed yes/no on segmented chips; (C)/(D) ring-only; (E) ring-only + aria-pressed yes/no on a Pause/Resume toggle whose label flips + keep dynamic aria-label; (F) transition flip + scale tier. Confirm the SKIP list (esp. the two RAW <input>). Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/ReferralsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Six surgical edits — all className + display-only ARIA. No logic, no handlers, no new components. Every edited control is a real `<button>` (natively focusable). The SKIP list is confirmed.

---

## Exact changes for `src/pages/ReferralsPage.tsx`

### (A) Cancel X button — L225–232

**Before:**
```jsx
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setCreating(false)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
```

**After:**
```jsx
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setCreating(false)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
```

**Rationale:** `hover:bg-secondary` color fade → needs `transition-all` (fresh, no prior transition). Icon-only → `scale-95`. KEEP `aria-label` (icon-only). `p-4` clearance inside `overflow-hidden` card → OUTWARD ring.

---

### (B) Duration chips — L237–249

**Before:**
```jsx
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                        duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                      )}
                    >
```

**After:**
```jsx
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      aria-pressed={duration === d}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                      )}
                    >
```

**Rationale:** `transition-all` already present → append only (DON'T-CHURN). Segmented chip tier → `[0.97]`. `aria-pressed={duration === d}` — selection conveyed ONLY by bg; visible label word is constant per chip. NO `aria-label` (visible text). Same `p-4` `overflow-hidden` card → OUTWARD ring.

---

### (C) Copy button — L347–352

**Before:**
```jsx
                    <button
                      type="button"
                      onClick={() => copy(url)}
                      className="flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
```

**After:**
```jsx
                    <button
                      type="button"
                      onClick={() => copy(url)}
                      className="flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Rationale:** `active:scale-95` + `transition-all` already present → ring-only append (DON'T-CHURN). Visible text → no `aria-label`. Action button → no `aria-pressed`. `p-3.5` clearance in non-`overflow-hidden` row → OUTWARD ring.

---

### (D) Share button — L354–360

**Before:**
```jsx
                    <button
                      type="button"
                      onClick={() => share(l)}
                      className="flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all"
                    >
```

**After:**
```jsx
                    <button
                      type="button"
                      onClick={() => share(l)}
                      className="flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Rationale:** Same as (C) — ring-only append. Visible text → no `aria-label`. Not a toggle → no `aria-pressed`. OUTWARD ring.

---

### (E) Pause/Resume button — L361–371

**Before:**
```jsx
                    <button
                      type="button"
                      aria-label={l.is_active ? "Deactivate" : "Reactivate"}
                      onClick={() => toggleMutation.mutate({ id: l.id, isActive: !!l.is_active })}
                      className={cn(
                        "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all",
                        l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white",
                      )}
                    >
```

**After:**
```jsx
                    <button
                      type="button"
                      aria-label={l.is_active ? "Deactivate" : "Reactivate"}
                      onClick={() => toggleMutation.mutate({ id: l.id, isActive: !!l.is_active })}
                      className={cn(
                        "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white",
                      )}
                    >
```

**Rationale:** `active:scale-95` + `transition-all` already → ring-only append. KEEP dynamic `aria-label`. **NO `aria-pressed`** — visible text "Pause"/"Resume" AND `aria-label` "Deactivate"/"Reactivate" both FLIP → state conveyed by the changing names, not ONLY by bg → `aria-pressed` would double-announce (same rule as media play/pause toggle). OUTWARD ring.

---

### (F) Delete icon button — L372–379

**Before:**
```jsx
                    <button
                      type="button"
                      aria-label="Delete link"
                      onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(l.id); }}
                      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
```

**After:**
```jsx
                    <button
                      type="button"
                      aria-label="Delete link"
                      onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(l.id); }}
                      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Rationale:** FLIP `transition-colors` → `transition-all` — existing `transition-colors` eases `hover:text-destructive` + `hover:bg-destructive/10` color fades but does NOT cover the new `active:scale` transform; `transition-all` (superset) eases both; `transition-transform` would regress the hover fades to an instant snap → rejected. Icon-only → `scale-95`. KEEP `aria-label="Delete link"`. Not a toggle → no `aria-pressed`. OUTWARD ring.

---

## SKIP list (confirmed)

| Control | Reason |
|---------|--------|
| shadcn back `<Button>` L179 | Ships tokens, labeled |
| shadcn "New" `<Button>` L189 | Ships tokens |
| shadcn "Generate link" `<Button>` L273 | Ships tokens |
| shadcn "Generate your first link" `<Button>` L302 | Ships tokens |
| RAW `<input>` L254 (link type) | Has `focus:ring-2 focus:ring-rose-500/30` already — don't-churn (`focus:` appropriate for always-click-focus text fields; migrating to `focus-visible:` would regress mouse-click focus visibility) |
| RAW `<input>` L264 (max uses) | Same — existing focus ring left as-is |
| Hero stat `motion.div` L202 | Presentational, NO `onClick` |
| Create-card `motion.div` L217 | Presentational container |
| Link-row `motion.div` L321 | Presentational (entrance anim + inactive `cn()` opacity), NO `onClick` |
| All icons | Decorative |

---

## Diff summary

| Metric | Count |
|--------|-------|
| Focus-visible rings added | 6 (A,B,C,D,E,F) |
| `active:scale` added | 2 fresh (A=`-95`, B=`[0.97]`) + 0 kept + 1 added (F=`-95`); C/D/E already had `-95` kept |
| `transition` changes | 1 fresh `transition-all` (A), 1 FLIP `transition-colors`→`transition-all` (F), 4 kept |
| `aria-pressed` added | 1 (B — duration chips) |
| `aria-label` changed | 0 (A kept, E kept, F kept) |
| `ring-inset` | 0 |
| Line changes | 7 ins / 6 del (+1 net line) |

---

## Keyboard / responsive flags

**Keyboard:** All 6 controls are real `<button>` elements → natively focusable. Added rings are functional, not dead CSS. Zero keyboard gaps on edited controls.

**Responsive (375/768/1280):** `max-w-2xl mx-auto px-4` → ~343px inner at 375px. Link row button bar `flex gap-2`: Copy (flex-1, ~120px) + Share (flex-1, ~120px) + Pause/Resume (`px-3` auto, ~60px) + Delete (`w-9`, 36px) + 3×`gap-2` (24px) ≈ 360px budget → fits. Create-card: Cancel `h-8 w-8` (32px) in header; 3 duration chips `px-3 py-1.5` in `flex gap-2` → fits; inputs `w-full`. No crush.

**Owner flags (established repo compact pattern, not per-page):** Sub-44px tap targets — Cancel `h-8 w-8` ~32px, Delete `h-9 w-9` ~36px, action buttons `h-9` ~36px, duration chips `py-1.5` ~24px.

---

## Verification

Run `npm run update` — must pass (type-check + worker type-check + production build) before marking done. Preview caveat: ReferralsPage is auth-gated (`useAuth`) so the link rows + all 6 controls render only for a signed-in user with `invitation_links` rows.
