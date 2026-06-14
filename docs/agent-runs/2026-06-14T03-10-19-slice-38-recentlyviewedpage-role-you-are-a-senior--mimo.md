# MiMo run — 2026-06-14T03:10:19.747Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 38 — RecentlyViewedPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all.
- shadcn <Button>/<Input>/<Textarea>/<Progress> already ship tokens -> DO NOT add className tokens (display-only ARIA attrs MAY still be added if semantically warranted).
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. overflow-x-auto chip rows -> OUTWARD ring (box-shadow ring ignored for scrollable overflow).
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls NEED aria-label. aria-pressed ONLY for toggle/segmented/filter controls whose pressed-state is conveyed ONLY by background (valid on a real <button> even when a count badge varies, as long as the label WORD is constant per button).

PAGE: src/pages/RecentlyViewedPage.tsx (186 lines, reached via in-app nav, useAuth + SwipeBackContainer + SEOHead noIndex). "Recently Viewed" travel-items history (hotels/flights/activities/cars/transfers). Reads user_recently_viewed (key ["user-recently-viewed", user?.id], .eq user_id .order viewed_at desc .limit 120) into `views`. tab useState ("all"|item_type). counts/filtered useMemo. remove(id) = optimistic qc.setQueryData filter-out -> supabase delete().eq("id", id) -> toast on error + invalidate. Layout: sticky header (shadcn back Button + History badge + "Recently Viewed" title); a gradient hero stat motion.div (views.length "viewed", NO onClick); an overflow-x-auto filter-chip row (RAW <button> per tab, label + count badge); loading skeletons; empty-state card; then a list of item rows (each a presentational motion.div [entrance anim, NO onClick]: type-icon/image tile + type badge + name line-clamp-1 + relative-time + a trailing icon-only Remove X button).

SKIP (confirm): shadcn back Button L104 (aria-label="Back", ships tokens); hero stat motion.div L117 (entrance anim, NO onClick -> presentational); loading skeletons L138; empty-state card L141; each item-row motion.div L158 (entrance anim, NO onClick -> presentational; only the Remove button inside is a control); all History/Sparkles/Plane/Building2/Car/Activity/ArrowRight/Clock/X icons + img + span/p text.

TWO edits to resolve:

(A) Filter chip, L130-134 — RAW <button type="button">, onClick={() => setTab(t.id)}, in tabs.map, sits in an overflow-x-auto scrollbar-hide row (flex gap-2). className = cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). Visible children: <span>{t.label}</span> (label word constant per button: "All"/"Hotels"/"Flights"/"Activity"/"Cars") + a count <span> (varies). Selected state conveyed ONLY by bg (gradient vs secondary).
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (transition-all already present -> just append, DON'T flip/churn); add aria-pressed={tab === t.id}. Confirm: scale-[0.97] (segmented-pill-tab tier), transition-all already present (append not flip), OUTWARD ring (overflow-x-auto row -> box-shadow ring not clipped), aria-pressed YES (label word constant, count badge varies but that's fine; selected-by-bg on a real <button>). No aria-label (has visible text). Agree?

(B) Remove icon button, L175 — RAW <button type="button" aria-label="Remove" onClick={() => remove(v.id)}>, icon-only (an X icon), sits in an item row motion.div `flex items-center gap-3 p-3 rounded-2xl bg-card border border-border` (NOT overflow-hidden). className = "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors".
Q-B: FLIP `transition-colors`->`transition-all` + append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; KEEP existing aria-label="Remove"; NO aria-pressed. Confirm: scale-95 (icon-only tier), FLIP to transition-all (existing transition-colors eases hover:text/bg but not the new transform -> transition-all superset eases both; transition-transform would regress the hover fade to a snap), KEEP aria-label (valid accessible name for icon-only), NO aria-pressed (one-shot destructive optimistic delete + toast, not a toggle), OUTWARD ring (button in a p-3 non-overflow-hidden row -> no clip). Matches the DownloadedPacks/DevicesPage Remove precedent. Agree?

============================================================
DELIVERABLE: Give the EXACT final className string + attrs for (A) and (B). Resolve scale tier, transition token (append vs flip), aria-pressed yes/no, aria-label keep, ring outward-vs-inset for each. Confirm the SKIP list. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/RecentlyViewedPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Review: RecentlyViewedPage — SLICE 38

### Short Plan

Both edits (A) and (B) are **already applied in the working tree source**. My job is to validate every decision. I'll confirm each edit's tokens, the SKIP list, and flag any issues.

---

### (A) Filter chip — CONFIRMED CORRECT ✅

**Final state (already in-tree):**

```jsx
<button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5",
    tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"
  )}>
```

| Decision | Verdict |
|----------|---------|
| `active:scale-[0.97]` | ✅ segmented-pill-tab tier (CollabsPage/PollHistoryPage/CouponsPage precedent) |
| `transition-all` already present | ✅ append-only, DON'T-CHURN (no flip needed) |
| `aria-pressed={tab === t.id}` | ✅ label WORD constant per button ("All"/"Hotels"/"Flights"/"Activity"/"Cars"); count varies — same pattern as GiftHistoryPage/AMAPage/CollabsPage/EmojiPacksPage flex-1 tabs |
| OUTWARD ring | ✅ parent is `overflow-x-auto scrollbar-hide` — box-shadow ring NOT clipped by scrollable overflow (TrendingTopicsPage/CollabsPage precedent) |
| No `aria-label` | ✅ has visible text |
| No `ring-inset` | ✅ correct |

**No corrections.**

---

### (B) Remove icon button — CONFIRMED CORRECT ✅

**Final state (already in-tree):**

```jsx
<button type="button" aria-label="Remove" onClick={() => remove(v.id)}
  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

| Decision | Verdict |
|----------|---------|
| FLIP `transition-colors`→`transition-all` | ✅ required — existing `hover:text-foreground` + `hover:bg-secondary` need color fade AND new transform; `transition-transform` would regress hover fades to a snap |
| `active:scale-95` | ✅ icon-only tier (sole child is `X` icon, `h-3.5 w-3.5`) |
| KEEP `aria-label="Remove"` | ✅ valid existing accessible name for icon-only control, don't-churn |
| No `aria-pressed` | ✅ one-shot destructive optimistic-delete + toast, not a toggle |
| OUTWARD ring | ✅ button sits in `p-3` (12px clearance) inside a non-`overflow-hidden` row → no clip |
| No `ring-inset` | ✅ correct |

**Matches the DownloadedPacksPage / DevicesPage Remove precedent exactly. No corrections.**

---

### SKIP list — CONFIRMED ✅

| Control | Reason | Verdict |
|---------|--------|---------|
| shadcn back `Button` L104 | `aria-label="Back"`, ships own tokens | ✅ SKIP |
| Hero stat `motion.div` L117 | entrance anim only, NO `onClick` → presentational | ✅ SKIP |
| Loading skeletons L138 | non-interactive `div`s | ✅ SKIP |
| Empty-state card L141 | non-interactive `div` + `<p>` (no CTA button on this page) | ✅ SKIP |
| Item-row `motion.div` L158 | entrance anim, NO `onClick` → presentational (only Remove inside is a control) | ✅ SKIP |
| All icons (`History`/`Sparkles`/`Plane`/`Building2`/`Car`/`Activity`/`ArrowRight`/`Clock`/`X`) + `img` + `span`/`p` text | display children, decorative | ✅ SKIP |

**Exhaustive. No controls missed.**

---

### Flags

**Keyboard — clean:** Both (A) and (B) are real `<button>` elements (natively focusable). The added rings are functional, not dead CSS. No keyboard gaps on any edited control.

**Responsive — clean at 375/768/1280:**
- Filter chip row `overflow-x-auto scrollbar-hide` → chips scroll horizontally at narrow widths, no crush.
- Item row `flex items-center gap-3 p-3` at `max-w-2xl mx-auto px-4` → type-icon tile `w-12 h-12` (48px) + `gap-3` (12px) fixed left, trailing Remove `h-8 w-8` (32px) fixed right, `flex-1 min-w-0` middle column (type badge + name `line-clamp-1` + time) → ~239px for middle → no crush.

**Owner flag (repo compact pattern, not per-page):** sub-44px tap targets — Remove `h-8 w-8` ~32px, back `h-10 w-10` ~40px (item rows are tall full-width containers = fine).

---

### Verdict

**Both edits are already correctly applied. ZERO corrections needed. No diff to produce — the working tree is clean.**

To verify: `npm run update` (type-check + worker type-check + production build must pass). The page is auth-gated (`useAuth` + `enabled: !!user?.id`) so preview requires a signed-in user with `user_recently_viewed` rows.
