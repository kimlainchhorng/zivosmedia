# DeepSeek run — 2026-06-14T03:47:26.953Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/ReactionPacksPage.tsx (193 lines, "Browse reaction emoji packs", REAL Supabase reaction_packs table — NOT mock). Backed by one useQuery ["reaction-packs"] from reaction_packs (.select/.eq("is_active",true)/.order("download_count" desc)). installedIds = useState<Set<string>> hydrated from localStorage ("zivo:reaction-packs:installed:v1"). install(p) = if p.is_premium -> toast.info (premium checkout not ready, RETURN); else add to Set, setInstalledIds, persist localStorage, toast.success. Layout: SwipeBackContainer + SEOHead; sticky header (shadcn back <Button> + Heart badge + "Reaction Packs" title); gradient hero stat motion.div ({installedIds.size} packs / {packs.length} catalog, NO onClick); loading skeleton grid; empty-state card; then a grid-cols-2 of pack cards (each presentational motion.div [entrance anim, NO onClick, overflow-hidden] containing: aspect-square preview img/emoji + gradient scrim + premium badge span + download-count span + footer with name/price text + a RAW Get/Added install button). NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> + 1 shadcn back <Button>. 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L91) => SKIP (ships tokens, labeled).
- (A) Get/Added install button (L171, RAW): disabled={installed && !p.is_premium}, onClick={() => install(p)}, VISIBLE TEXT changes ("Get" w/ Download icon when not installed; "Added" when installed non-premium), cn() base "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all" + conditional (installed&&!premium ? "bg-secondary text-foreground" : "bg-ig-gradient text-white shadow-sm hover:opacity-90") — ALREADY HAS active:scale-95 + transition-all, NO ring. It is a small pill (h-7 px-2.5) in the card footer flex row (p-2.5), NOT flush/absolute.

TOKEN TIERS (this repo): wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity (color/opacity fade); transition-transform for PURE press-scale with NO hover. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color ONLY — NOT for one-shot actions or transient feedback whose label text changes. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / install / setInstalledIds / localStorage / navigate / useQuery / useState / supabase / disabled / any logic. Do NOT add onClick to a no-op control (FLAG it).

MY PLAN -- validate or correct:

(A) Get/Added install button (L171; RAW; ALREADY active:scale-95 + transition-all; working onClick; disabled when installed-nonpremium): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn() BASE. KEEP active:scale-95 (don't renumber). KEEP transition-all (eases the bg state-swap + hover:opacity). NO aria-label (visible Get/Added text). NO aria-pressed (label TEXT changes Get->Added AND it becomes disabled — state conveyed by text, not bg-only; not a re-toggleable control). OUTWARD ring (button has p-2.5 clearance inside the card footer; the card's overflow-hidden clips the IMAGE corners, not this padded button's small ring). base before: "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all" -> after: "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Get button (A): RING-ONLY (don't-churn — pre-existing active:scale-95 + transition-all)? KEEP active:scale-95 even though it's a text pill (tiers say pills=[0.97])? — I lean DON'T-CHURN (keep 95, it's small & valid, renumbering = noise). AGREE or advise renumber to [0.97]?
(2) Confirm NO aria-pressed (label text Get->Added + becomes disabled, not a bg-only persistent toggle).
(3) OUTWARD vs ring-inset given the card motion.div is overflow-hidden but the button sits in a p-2.5 footer with clearance (not flush/absolute)? I lean OUTWARD.
(4) Inventory exhaustive (1 RAW + 1 shadcn back)? hero stat motion.div L104 + pack-card motion.div L139 correctly presentational (NO onClick)? loading skeleton L116 + empty-state L124 + premium badge span L155 + download-count span L160 non-interactive?
(5) Responsive 375/768/1280: header; hero stat; grid-cols-2 pack cards (aspect-square preview + footer name/price + Get pill). Any crush @375 (2-col grid ~165px cards)? sub-44px tap targets to FLAG (back h-10 40px; Get pill h-7 28px)?
(6) Owner flags (logic/out of scope, FLAG not fix): premium install is a no-op toast (checkout not built); the whole card preview area is not tappable (no pack-detail navigation — only the Get button acts); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/ReactionPacksPage.tsx

---

## Plan

One change, one file, one control. The Get/Added install button already has valid `active:scale-95` + `transition-all` — **ring-only append**, no renumbering, no transition flip, no aria-pressed.

---

## Proposed change

**File:** `src/pages/ReactionPacksPage.tsx`

**Before (L171, the `cn()` base string):**
```
"shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all"
```

**After:**
```
"shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Diff:**
```diff
--- a/src/pages/ReactionPacksPage.tsx
+++ b/src/pages/ReactionPacksPage.tsx
@@ -168,7 +168,7 @@ export default function ReactionPacksPage() {
                       onClick={() => install(p)}
                       className={cn(
                         "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all",
+                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         installed && !p.is_premium
                           ? "bg-secondary text-foreground"
                           : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
```

---

## Answers to your questions

1. **RING-ONLY, DON'T-CHURN `active:scale-95`** — correct. The pill is `h-7` (28px), the smallest tier in the repo. Renumbering to `[0.97]` would be noise with zero visual benefit. Keep `95`.

2. **NO `aria-pressed`** — correct. The label text changes from "Get" → "Added" AND the button becomes `disabled`. State is conveyed by text + disabled attribute, not bg-only.

3. **OUTWARD ring** — correct. The button sits in `p-2.5` footer clearance. The parent `overflow-hidden` clips the image corners, not this padded button's small box-shadow ring.

4. **Inventory exhaustive** — correct. 1 RAW button (L171) + 1 shadcn back Button (L91). Hero stat `motion.div` (L104) has no `onClick`. Pack card `motion.div` (L139) has no `onClick`. Loading skeleton (L116), empty-state (L124), premium badge (L155), download-count (L160) — all non-interactive.

5. **Responsive @375** — clean. `max-w-2xl mx-auto px-4` → ~343px inner. `grid-cols-2 gap-3` → each card ~165px. Card footer: `flex-1 min-w-0` name/price + `h-7 px-2.5` pill (~60px) → fits. **Sub-44px flags:** back button `h-10 w-10` (40px), Get pill `h-7` (28px) — repo-wide compact pattern.

6. **Owner flags (logic, out of scope):**
   - Premium install is a no-op toast (checkout not built) — intentional v1.
   - No pack-detail navigation on the card preview area — only the Get button acts. If owner wants card-tap → detail, that's a future feature.
   - The `supabase` cast (`as unknown as {...}`) is a type-workaround for the live schema — works, but could be cleaned up when types are generated.

---

## Owner must verify

1. Run `npm run update` — must pass (type-check + worker type-check + build).
2. Preview at `/reaction-packs` on the dev server — verify the Get button has a visible focus ring on Tab navigation.
3. Confirm the `active:scale-95` + `transition-all` feel correct on click (no regression from the ring-only change).
