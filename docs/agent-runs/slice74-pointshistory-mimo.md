# MiMo run — 2026-06-14T07:12:34.264Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/PointsHistoryPage.tsx (264 lines, "Points" — loyalty points ledger with running balance; READ-ONLY view backed by REAL Supabase: useQuery ["points-ledger", user.id] reading points_ledger where user_id=me ordered created_at desc limit 200 (RLS: users see own rows); AUTH-aware via useAuth + enabled gating; useState tab ("all"|"earn"|"redeem"|"bonus"); useMemo totals (earned/bonus/redeemed/expired reduce) + filtered (tab filter); SwipeBackContainer wrapper; SEOHead noIndex). Layout: SwipeBackContainer root; sticky header (shadcn ghost-icon Back + ig-gradient "Points" title); gradient balance banner; 3-stat lifetime grid (Earned/Bonus/Used — presentational divs); horizontal filter-tab rail (4 raw pill buttons, single-select); loading skeletons / empty card / "nothing in this tab" / ledger list (non-clickable motion.div rows: type chip + description + signed amount + running balance).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): interactive controls = (1) L122 header Back shadcn <Button> (variant ghost size icon, ALREADY aria-label="Back", onClick navigate(-1)) — SHADCN SKIP (ships tokens); (2) L177 filter-tab raw <button> (mapped over tabs ×4 [all/earn/redeem/bonus], single-select filter, selection bg-conveyed "bg-ig-gradient text-white shadow-sm" [active] vs "bg-secondary text-foreground hover:bg-muted" [inactive], one-shot setTab(t.id), base via cn 1st arg "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all", ALREADY transition-all, NO scale/focus/aria). Ledger rows L221 motion.div are NOT clickable (no onClick) — presentational. 3-stat grid divs / type chips / icons / gradient banner decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border → FLIP transition-colors→transition-all. APPEND-not-flip when transition-all already present. aria-pressed for persistent single-select with constant label + bg-conveyed state (NO role=tablist → aria-pressed is the house pattern over aria-selected). OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L177 filter-tab <button> — **ADD aria-pressed={tab === t.id}** (persistent single-select segmented filter, bg-conveyed state, no role=tablist) + APPEND into cn 1st-arg static base "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (segmented/pill tier [0.97]; **NO flip** — transition-all already present; OUTWARD ring-ring — ig-gradient is the pill's OWN active fill, ring renders against the neutral overflow-x-auto rail; single edit hits all 4 tabs). Handlers byte-identical.
LEAVE: shadcn Back Button L122 (already aria-label + ships tokens); ledger rows motion.div L221 (NOT clickable, presentational); 3-stat grid / type chips / icons / gradient banner decorative; SwipeBackContainer own component.

QUESTIONS:
(1) (A) filter-tab: aria-pressed={tab === t.id} correct (single-select, no tablist roles)? NO flip correct (transition-all already present)? [0.97] segmented tier + OUTWARD ring-ring on own ig-gradient fill?
(2) Inventory exhaustive (1 raw button edited; shadcn Back SKIP; ledger rows presentational)? 3-stat grid / chips / icons / banner presentational?
(3) Owner flags (logic/out of scope, FLAG not fix): (a) ledger query real Supabase via (supabase as any) cast (untouched); (b) currentBalance = rows[0]?.balance_after assumes desc-ordered first row is newest (correct given order created_at desc); anything else?
(4) Responsive 375/768/1280: sticky header (Back + title); gradient balance banner; 3-stat grid (grid-cols-3 gap-2); filter-tab rail (overflow-x-auto, 4 pills); ledger rows (chip + 40px icon + desc + signed amount + balance). Any crush @375? sub-44px tap targets to FLAG (filter pills py-1.5 ~30px; shadcn Back h-10 40px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/PointsHistoryPage.tsx

---

## Validation — PointsHistoryPage.tsx

### 1. Edit (A) — filter-tab `<button>`: ✅ ALL CORRECT

| Check | Verdict |
|-------|---------|
| `aria-pressed={tab === t.id}` | ✅ correct — persistent single-select, bg-conveyed, no `role=tablist` → `aria-pressed` is the house pattern |
| NO flip | ✅ correct — `transition-all` already in the static base (`cn` 1st arg), gaining a CSS scale needs no property swap |
| `[0.97]` segmented/pill tier | ✅ correct — `px-3.5 py-1.5 rounded-full text-xs` pill row |
| OUTWARD `ring-ring` | ✅ correct — active pill owns its `bg-ig-gradient` fill; ring renders against the neutral `overflow-x-auto` parent rail |
| Single edit hits all 4 tabs | ✅ mapped, no per-item override |

The tokens are already present in the provided file at the `cn` 1st arg. No further edit needed.

### 2. Inventory — ✅ EXHAUSTIVE

| Control | Decision | Rationale |
|---------|----------|-----------|
| shadcn Back `<Button>` L122 | **SKIP** | `aria-label="Back"` already, ships own focus/scale tokens |
| 4× filter-tab `<button>` L177 | **EDIT (A)** | Only raw interactive control — done |
| Ledger rows `motion.div` L221 | **LEAVE** | No `onClick` — purely presentational display rows |
| 3-stat grid divs | presentational | No click handler |
| Type chips / icons / banner | decorative | Visual only |

### 3. Owner flags

**(a)** `(supabase as any)` cast on the `points_ledger` query — standard repo-wide pattern, untouched. ✅

**(b)** `currentBalance = rows[0]?.balance_after` — correct given `.order("created_at", { ascending: false }).limit(200)` makes index 0 the newest row. ✅

**(c)** **Additional flag:** The tab set covers `all/earn/redeem/bonus` but the ledger can also have `adjust` and `expire` transaction types. Those only appear under "All" — no dedicated filter tab. This is a **product decision** (not a bug), but worth flagging if the owner wants an "Expired" tab given the `totals.expired` stat is computed but has no filter.

**(d)** `staleTime: 30_000` — reasonable for a ledger; no concern.

### 4. Responsive 375/768/1280 — ✅ CLEAN

At 375:
- **Sticky header:** Back `h-10 w-10` (40px) + Coins icon `h-7 w-7` + "Points" title — fits cleanly in `px-4` row.
- **Balance banner:** `rounded-2xl p-5` single-column, `text-4xl` balance — fits (max-w-2xl at 375 = full width).
- **3-stat grid:** `grid-cols-3 gap-2` → each tile ≈109px. Content is a `text-[10px]` label + `text-lg` number — no crush.
- **Filter rail:** `overflow-x-auto` with 4 `shrink-0 px-3.5 py-1.5` pills ≈280px total — fits @375 without scroll, scrolls gracefully if narrower.
- **Ledger rows:** `flex items-center gap-3 p-3` with 40px icon tile + `flex-1 min-w-0 line-clamp-1` text + `shrink-0` amount — no overflow.

**Sub-44px tap targets (FLAG — repo-wide, NOT introduced here):**
- Filter pills `py-1.5` ≈ **30px** 🔴
- shadcn Back `h-10` = **40px** 🟡

### Verdict

**File is production-ready as provided.** The single edit (A) is already applied correctly in the working tree. Zero logic lines touched, className-only + 1 aria attribute. Run `npm run update` to verify the gate, then hand the owner the commit.
