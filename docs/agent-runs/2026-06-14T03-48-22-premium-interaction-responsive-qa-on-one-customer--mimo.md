# MiMo run — 2026-06-14T03:48:22.242Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Validation & Proposed Diff

Your plan is **correct on all six points**. One edit, one file.

### Answers

**(1)** **AGREE — RING-ONLY, keep `active:scale-95`.** DON'T-CHURN rule explicitly says "do NOT renumber a valid existing scale." The `h-7` pill is tiny; `scale-95` is fine. Renumbering to `[0.97]` is pure churn.

**(2)** **AGREE — NO `aria-pressed`.** Label text changes "Get"→"Added" AND the button `disabled`s — state conveyed by text + disabled attribute, not bg-only persistent toggle.

**(3)** **AGREE — OUTWARD `ring-ring`.** The button sits in `p-2.5` (10px) footer clearance inside the card. A `ring-2` extends 2px — well within that margin. The card's `overflow-hidden` clips the image corners at top, not this padded footer's internal ring. The parent surface is `bg-card` (neutral) → `ring-ring` (black) is correct. Even in the `bg-ig-gradient` button state, the ring renders on the *parent* `bg-card` surface outside the button box.

**(4)** **AGREE — exhaustive.** 1 RAW `<button>` (A), 1 shadcn `<Button>` (back). Hero stat `motion.div` L104 + pack-card `motion.div` L139 = presentational (NO `onClick`). Skeletons, empty-state, premium badge `<span>`, download-count `<span>` = non-interactive.

**(5)** **Responsive clean.** `grid-cols-2 gap-3` at ~165px cards: footer `p-2.5` → 145px inner, `flex-1 min-w-0` name + `shrink-0` pill + `gap-2` → ~92px for name column, `line-clamp-1` safe. **FLAG: Get pill `h-7` ~28px** (sub-44px; repo-wide compact pattern, not per-page fix).

**(6)** **Owner flags (FLAG, don't fix):**
- Premium install → no-op toast ("checkout flow rolls out in beta"). Expected v1.
- Card preview area not tappable (no pack-detail navigation; only Get button acts). Future enhancement.
- Get pill `h-7` ~28px sub-44px tap target (repo-wide).

---

### Proposed Diff

**File:** `src/pages/ReactionPacksPage.tsx` — **1 line changed, 0 new attributes, 0 logic lines**

```diff
                     <button
                       type="button"
                       disabled={installed && !p.is_premium}
                       onClick={() => install(p)}
                       className={cn(
-                        "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all",
+                        "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         installed && !p.is_premium
                           ? "bg-secondary text-foreground"
                           : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
                       )}
```

That's the entire change. `focus-visible:outline-none` (suppresses default UA outline in favor of the ring), `ring-2`, `ring-ring` (black on neutral `bg-card` parent). Appended — existing `active:scale-95`, `transition-all`, `hover:opacity-90`, all conditional classes, every `onClick`/`disabled`/`install`/`setInstalledIds`/localStorage/`useQuery`/`useState`/`supabase` byte-identical.

### Owner verification

1. `npm run update` → must exit 0 (type-check + worker type-check + build).
2. Preview at `/reaction-packs` (or in-app nav): tab to the Get button on a pack card → confirm the black focus ring appears; press Enter → confirm install works; confirm "Added" state + disabled works for free packs.
3. Owner flags above are informational — no action needed.
