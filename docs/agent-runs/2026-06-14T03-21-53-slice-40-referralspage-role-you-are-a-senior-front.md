# DeepSeek run — 2026-06-14T03:21:53.105Z

- model: deepseek-chat
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

# SLICE 40 — ReferralsPage: Interaction Token + A11y Polish

## Plan

Six RAW controls on `src/pages/ReferralsPage.tsx` need className-only + display-only ARIA changes. All follow the established house style from `JobPostingDetailPage.tsx` and 38+ prior slices.

## Proposed Changes

### File: `src/pages/ReferralsPage.tsx`

#### (A) Cancel button (L225–232) — RAW icon-only X

**Before:**
```tsx
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
```

**After:**
```tsx
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** Fresh `transition-all` (has `hover:bg-secondary` color fade + new press-scale); icon-only → `scale-95`; keep `aria-label="Cancel"`; outward ring (p-4 clearance inside overflow-hidden card).

---

#### (B) Duration chips (L237–249) — 3 RAW segmented buttons

**Before:**
```tsx
className={cn(
  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
  duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
  duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)}
```

Add `aria-pressed={duration === d}` after `onClick={() => setDuration(d)}`.

**Rationale:** `transition-all` already present → append-only; segmented-chip tier `[0.97]`; `aria-pressed` valid (selection conveyed only by bg, label word constant per chip); outward ring (p-4 clearance).

---

#### (C) Copy button (L347–352) — RAW visible-text action

**Before:**
```tsx
className="flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
```

**After:**
```tsx
className="flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** Ring-only append (`active:scale-95` + `transition-all` already present); no `aria-pressed` (action button, not toggle); no `aria-label` (visible text "Copy"); outward ring (non-overflow-hidden row).

---

#### (D) Share button (L354–360) — RAW visible-text action

**Before:**
```tsx
className="flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all"
```

**After:**
```tsx
className="flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** Ring-only append; no `aria-pressed`; no `aria-label` (visible text "Share"); outward ring.

---

#### (E) Pause/Resume button (L361–371) — RAW toggle with flipping label

**Before:**
```tsx
className={cn(
  "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all",
  l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white",
)}
```

**After:**
```tsx
className={cn(
  "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all",
  l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)}
```

**Rationale:** Ring-only append; **NO `aria-pressed`** — visible text flips "Pause"/"Resume" AND `aria-label` flips "Deactivate"/"Reactivate" → state conveyed by changing label, not ONLY by bg (same rule as media play/pause); keep dynamic `aria-label`; outward ring.

---

#### (F) Delete button (L372–379) — RAW icon-only destructive

**Before:**
```tsx
className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
```

**After:**
```tsx
className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** FLIP `transition-colors`→`transition-all` (existing hover color fades + new press-scale); icon-only → `scale-95`; keep `aria-label="Delete link"`; outward ring (non-overflow-hidden row).

---

## SKIP List (confirmed)

| Element | Line | Reason |
|---------|------|--------|
| shadcn back `<Button>` | L179 | Ships own tokens, has `aria-label="Back"` |
| shadcn "New" `<Button>` | L189 | Ships own tokens, visible text |
| shadcn "Generate link" `<Button>` | L273 | Ships own tokens, visible text |
| shadcn "Generate your first link" `<Button>` | L302 | Ships own tokens, visible text |
| RAW `<input>` (linkType) | L254 | Existing `focus:ring-rose-500/30` — leave as-is (don't-churn text inputs) |
| RAW `<input>` (maxUses) | L264 | Same — leave as-is |
| Hero stat `motion.div` | L202 | NO `onClick` → presentational |
| Create-card `motion.div` | L217 | NO `onClick` → presentational |
| Each link-row `motion.div` | L321 | Entrance anim + `inactive` opacity, NO `onClick` → presentational |
| All icons (Gift, Plus, Copy, Trash2, etc.) | — | Decorative children |

## Keyboard/Responsive Flags

- **No keyboard gaps on edited controls** — all 6 are real `<button>` elements (natively focusable; added rings functional; (A) has `aria-label`, (B) gets `aria-pressed`, (C)/(D) have visible text, (E) has dynamic `aria-label`, (F) has `aria-label`).
- **Responsive at 375px** — `max-w-2xl mx-auto px-4` → ~343px inner; the 4-button row (Copy/Share/Pause/Delete) at `flex gap-2` fits: Copy `flex-1` + Share `flex-1` + Pause `px-3` (~60px) + Delete `h-9 w-9` (36px) + 3×`gap-2` (24px) = well within 343px.
- **Owner flag (established repo compact pattern):** sub-44px tap targets — Cancel `h-8 w-8` (~32px), duration chips `py-1.5` (~24px), Delete `h-9 w-9` (~36px), Copy/Share/Pause `h-9` (~36px).

## Diff Summary

```
6 edits, all className-only + 1 display-only ARIA attr (aria-pressed on duration chips)
0 logic lines touched
0 handler anchors changed
0 role/tabIndex/onKeyDown added
0 ring-inset needed (all controls have adequate clearance or non-overflow-hidden parents)
```

## Verification

Run `npm run update` — must pass (type-check + worker type-check + production build) before marking done.
