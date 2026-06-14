# MiMo run — 2026-06-14T05:54:50.179Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/SavedLocationsPage.tsx (115 lines, "Saved pickup/destination locations", REAL Supabase saved_locations (orphan), AUTH-aware via useAuth [user.id scopes query + delete]). One useQuery ["saved-locations-me", user.id] (own rows, order created_at asc, enabled !!user.id). useQueryClient qc. remove(id) = optimistic qc.setQueryData filter + supabase delete().eq("id", id) + toast + invalidate-on-error rollback. useMemo home/work. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + MapPin badge + title); gradient hero stat motion.div (count, NO onClick); loading skeletons; empty-state card; list of location rows (each presentational motion.div [entrance anim, NO onClick]: icon tile + label + address + RAW Remove trash button + decorative ChevronRight).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (Remove trash L105) + 1 shadcn back <Button> (L71). 0 motion.button. The location rows L99 are motion.div with NO onClick (presentational). Hero motion.div L79 NO onClick. ChevronRight L106 decorative (NO onClick).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L71) => SKIP (ships tokens, labeled).
- (A) Remove trash button (L105, RAW, icon-only): aria-label="Remove" (ALREADY present), onClick remove(l.id) (optimistic delete). Base BEFORE: "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors" (transition-colors + hover color/bg, NO scale, NO ring).

TOKEN TIERS: wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP transition-colors→transition-all when ADDING a NEW scale to a button that ALSO has a hover bg/color. APPEND-not-flip when transition-all already present. aria-pressed ONLY for persistent toggle/segmented/filter — NOT a one-shot action. OUTWARD ring default.

EDITS APPLIED (validate exact):
(A) Remove trash button (L105): keep aria-label="Remove" + FLIP transition-colors→transition-all + APPEND "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only tier scale-95; FLIP mandatory — adding scale to a transition-colors button with hover:text-rose-500 + hover:bg-rose-500/10; NO aria-pressed — one-shot destructive action, not a toggle; OUTWARD ring-ring on neutral card-row parent). NEW base: "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Remove (A): FLIP transition-colors→transition-all mandatory (new scale + hover:text/bg)? icon-only scale-95? keep existing aria-label="Remove" (NO aria-pressed — one-shot destructive)? OUTWARD ring-ring (neutral card row)?
(2) Inventory exhaustive (1 RAW + 1 shadcn back)? hero motion.div L79 + each location motion.div L99 correctly presentational (NO onClick)? skeletons L86 + empty-state L88 non-interactive? icon tile L100 decorative?
(3) ChevronRight L106 — the row motion.div has NO onClick, so the ChevronRight is a MISLEADING affordance (implies the row is tappable to view/edit the location, but nothing handles it). FLAG as a no-op affordance / UX gap (do NOT add onClick — out of scope)? Or is a decorative chevron acceptable?
(4) Responsive 375/768/1280: header; hero (text-3xl count + "Home set · Work set" subline); the location row (icon tile h-10 w-10 + flex-1 min-w-0 label/address line-clamp-1 + remove h-8 w-8 + chevron). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; remove h-8 32px)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround (×2 — query + delete); remove() optimistic qc.setQueryData WITH invalidate-on-error rollback (good pattern — note it); no confirm dialog before destructive delete (single tap removes — FLAG as UX risk?); no limit on the query; the ChevronRight no-op (see Q3); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/SavedLocationsPage.tsx

---

## Plan

Validate the single edit already applied to `src/pages/SavedLocationsPage.tsx`. No additional changes needed — the file is correct as-is. One owner-flag cluster (ChevronRight no-op + missing confirm dialog + sub-44px destructive target).

---

## Proposed change

**None — the edit at (A) is already applied and correct.** The file is green as-is.

---

## Answers

**(1) Remove (A) — all correct ✅**

| Decision | Verdict |
|----------|---------|
| FLIP `transition-colors` → `transition-all` | ✅ MANDATORY — adding `active:scale-95` to a button with `hover:text-rose-500 hover:bg-rose-500/10`; `transition-colors` wouldn't animate the transform |
| `active:scale-95` | ✅ icon-only tier (`h-8 w-8` = 32px, Trash2 icon) |
| Keep `aria-label="Remove"`, no `aria-pressed` | ✅ one-shot destructive action, not a toggle |
| OUTWARD `ring-ring` | ✅ neutral card-row parent (`bg-card border border-border`) |

Final className: `"h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` — matches file exactly.

**(2) Inventory exhaustive ✅**

- **L71** shadcn back `<Button aria-label="Back">` → SKIP (ships tokens, labeled)
- **L105** RAW trash button → EDITED (above)
- **L79** hero `motion.div` → presentational (entrance anim, NO onClick)
- **L99** each location row `motion.div` → presentational (entrance anim + delay, NO onClick)
- **L86** skeletons → non-interactive
- **L88** empty-state card → non-interactive
- **L100** icon tile `<div>` → decorative

1 RAW + 1 shadcn = 2 controls, 1 edit. Exhaustive. ✅

**(3) ChevronRight L106 — FLAG 🚩**

The `ChevronRight` icon on each row implies navigability (tap-to-view/edit the location). The parent `motion.div` has **no onClick / no Link**. This is a **misleading affordance / UX gap**. Owner should either: (a) add tap-through to a location detail/edit route, or (b) remove the `ChevronRight`. **Do NOT add onClick here — out of scope.** Flag only.

**(4) Responsive 375/768/1280 — clean, one sub-44px flag**

| Element | 375 | Notes |
|---------|-----|-------|
| Header (Back `h-10` + badge + title) | ✅ | Fits cleanly |
| Hero (`text-3xl` count + subline) | ✅ | Single column, no wrap issue |
| Location row (`h-10` icon + `flex-1 min-w-0` label/address `line-clamp-1` + remove `h-8` + chevron `h-4`) | ✅ | ~207px for text after fixed elements + gaps. No crush |

**Sub-44px tap targets FLAG:**
- Back `h-10` (40px) — repo-wide compact pattern, not introduced here.
- **Remove `h-8 w-8` (32px) — under 44px on a DESTRUCTIVE action.** More concerning than typical compact icon buttons since it permanently deletes location data with no confirm dialog. FLAG.

**(5) Owner flags (logic / out of scope — FLAG not fix)**

1. **`supabase as unknown as {...}` cast workaround ×2** (query builder L51 + delete builder L60) — existing pattern; clean up when types regenerate.
2. **`remove()` optimistic `qc.setQueryData` with `invalidateQueries` rollback on error** — **good pattern, noted** (best-practice optimistic delete).
3. **⚠ No confirm dialog before destructive delete** — single tap on the trash icon permanently removes a saved location. UX risk, especially combined with the 32px tap target. Owner should consider a confirm step or at minimum an undo toast (the current `toast.success("Removed")` is informational, not undoable).
4. **No `.limit()` on the query** — could grow unbounded for a power user (minor; saved locations are typically few).
5. **ChevronRight no-op** — see (3) above.
6. **`home`/`work` useMemo** — correct pattern; `undefined` when not found → subline renders only the set ones. Clean.

---

## Summary

The file has **0 additional changes needed**. The single RAW button edit (A) is correctly applied: FLIP `transition-colors`→`transition-all` (mandatory — new scale + existing hover), icon-only `scale-95`, `aria-label` kept, no `aria-pressed` (one-shot), outward `ring-ring`. Inventory is exhaustive (1 RAW edited, 1 shadcn skipped, all `motion.div`s presentational). Responsive clean at 375/768/1280.

**Owner flags to triage (all non-blocking):**
1. 🚩 **ChevronRight misleading affordance** — implies tap-through but row is non-interactive. Remove or wire up.
2. 🚩 **No confirm dialog on destructive delete** + **32px tap target** — risk of accidental removal. Consider confirm step or undo.
3. ⚠ Sub-44px Back (40px) — repo-wide compact pattern.

Run `npm run update` to verify (type-check + worker type-check + production build → must pass).
