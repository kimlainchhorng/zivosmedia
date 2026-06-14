# DeepSeek run — 2026-06-14T03:41:22.258Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/StorePromoCodesPage.tsx (181 lines, "Active store promo codes you can use", REAL Supabase — NOT mock). Backed by two useQuery: ["store-promo-codes"] from marketing_promo_codes (select/order created_at desc/limit 60, then .filter is_active!==false && not-ended) + ["store-promo-stores", storeIds.join(",")] from store_profiles (.in("id", storeIds), enabled storeIds.length>0). storeMap useMemo. justCopied useState (string|null). copyCode(code) = navigator.clipboard.writeText -> setJustCopied + toast.success -> setTimeout reset 1.5s (catch toast.error). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Tag badge + "Store Promos" title); a gradient hero stat motion.div ({promos.length} active promos, NO onClick); loading skeletons; empty-state card; then a list of promo cards (each a presentational motion.div [entrance anim, NO onClick] containing: a store logo img/Store-icon tile + a RAW store-name link button + value/min-order/ends/remaining text + a RAW full-width Copy-code button). NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 RAW <button type="button"> — wait, recount: shadcn back <Button> L96 + 2 RAW <button> (store-name link L155, Copy-code L166). So 2 RAW + 1 shadcn. 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L96) => SKIP (ships tokens, labeled).
- (A) Store-name link (L155, RAW): onClick={() => s?.slug ? navigate(`/store/${s.slug}`) : null} (navigates to the store page when slug exists; no-op when no slug), VISIBLE TEXT {s?.name ?? "Store"}, className "text-sm font-bold text-foreground line-clamp-1 hover:underline" — HAS hover:underline, NO transition, NO scale, NO ring. It's an inline text link (the store name) inside the card's flex-1 min-w-0 column.
- (B) Copy-code button (L166, RAW): onClick={() => copyCode(p.code)}, VISIBLE TEXT (the code, or "Copied" w/ CheckCircle2 when isCopied), cn() base "mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]" + conditional isCopied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-ig-gradient text-white shadow-sm hover:opacity-90" — ALREADY HAS transition-all + active:scale-[0.98] (full-width wide tier), NO ring. The isCopied state is a TRANSIENT 1.5s copy-confirmation (setTimeout reset), and the LABEL TEXT itself changes (code -> "Copied"), not a persistent selection toggle.

TOKEN TIERS (this repo): wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity OR underline (color/decoration fade); transition-transform for PURE press-scale with NO hover. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color — NOT for one-shot actions or transient feedback whose label text changes. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / copyCode / setJustCopied / navigate / useQuery / useMemo / supabase / the .filter / the SHOWS-equivalent / any logic. Do NOT add onClick to a no-op control (FLAG it).

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) Store-name link (L155; RAW; HAS hover:underline; working conditional onClick): APPEND " transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to className. LINK tier => [0.97]. transition-all (it has hover:underline — the underline + the new press-scale; transition-all is the established "has underline => transition-all" choice). NO aria-label (visible store-name text). NO aria-pressed (navigational). OUTWARD ring (the link sits in a flex-1 min-w-0 column inside a p-3.5 rounded-2xl card, NOT overflow-hidden). className before: "text-sm font-bold text-foreground line-clamp-1 hover:underline" -> after: "text-sm font-bold text-foreground line-clamp-1 hover:underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". QUESTION: is FULL link treatment (transition-all + active:scale-[0.97] + ring) right for an inline line-clamp-1 TEXT title link, or do you prefer RING-ONLY (a press-scale on a text title can look odd; underline isn't transitionable so transition-all eases only the scale)? I lean FULL link treatment for parity, but advise.

(B) Copy-code button (L166; RAW; ALREADY transition-all + active:scale-[0.98]; working onClick): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn() BASE. KEEP transition-all (eases the isCopied bg swap + hover:opacity), KEEP active:scale-[0.98] (full-width wide tier, correct). NO aria-label (visible code/"Copied" text). NO aria-pressed (transient 1.5s feedback + label text changes, not a persistent toggle). OUTWARD ring (w-full button inside p-3.5 card, NOT overflow-hidden). base before: "mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]" -> after: "mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". OK? Confirm NO aria-pressed (one-shot copy w/ transient feedback + changing label, not a toggle).

QUESTIONS:
(1) Store-name link (A): FULL link treatment (transition-all + active:scale-[0.97] + ring) vs RING-ONLY for an inline text title link? OUTWARD ring? No aria. AGREE or advise.
(2) Copy-code (B): RING-ONLY (don't-churn — pre-existing transition-all + active:scale-[0.98]), NO aria-pressed (transient feedback + label change). AGREE? Confirm [0.98] full-width tier is correct (don't renumber).
(3) Inventory exhaustive (2 RAW + 1 shadcn back)? hero stat motion.div L109 + promo-row motion.div L141 correctly presentational (NO onClick)? loading skeletons L121 + empty-state L123 non-interactive?
(4) Responsive 375/768/1280: header (back + Tag + title); hero stat card; promo card (logo 40px + flex-1 min-w-0 [store-name link line-clamp-1 + value 2xl + min-order + ends/remaining flex-wrap] + full-width Copy button h-10). Any crush @375? sub-44px tap targets to FLAG (back h-10 w-10 40px; store-name link inline text ~20px height; Copy button h-10 40px)?
(5) Owner flags (logic/out of scope, FLAG not fix): the store-name link's onClick is a no-op when s?.slug is null (stores without a slug => dead link); anything else? Is the Copy button missing an aria-live region for the "Copied" announcement (out of scope — display text change is visible; FLAG as optional a11y nicety)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/StorePromoCodesPage.tsx

---

## Plan

Two controls to edit on `src/pages/StorePromoCodesPage.tsx`:

1. **Store-name link (L155)** — RAW `<button>` with `hover:underline`, no transition/scale/ring → **FULL link treatment** (`transition-all active:scale-[0.97] + ring`)
2. **Copy-code button (L166)** — already has `transition-all active:scale-[0.98]` → **RING-ONLY** (don't-churn)

## Proposed diff

```diff
--- a/src/pages/StorePromoCodesPage.tsx
+++ b/src/pages/StorePromoCodesPage.tsx
@@ -152,7 +152,7 @@ export default function StorePromoCodesPage() {
                     )}
                     <div className="flex-1 min-w-0">
-                      <button type="button" onClick={() => s?.slug ? navigate(`/store/${s.slug}`) : null} className="text-sm font-bold text-foreground line-clamp-1 hover:underline">{s?.name ?? "Store"}</button>
+                      <button type="button" onClick={() => s?.slug ? navigate(`/store/${s.slug}`) : null} className="text-sm font-bold text-foreground line-clamp-1 hover:underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{s?.name ?? "Store"}</button>
                       <div className="flex items-center gap-2 mt-1 flex-wrap">
                         <span className="text-2xl font-extrabold text-ig-gradient">{valueStr}</span>
                         {p.min_order_cents > 0 && <span className="text-[11px] text-muted-foreground">on ${(p.min_order_cents / 100).toFixed(0)}+ orders</span>}
@@ -163,7 +163,7 @@ export default function StorePromoCodesPage() {
                   <button
                     type="button"
                     onClick={() => copyCode(p.code)}
-                    className={cn("mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]", isCopied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-ig-gradient text-white shadow-sm hover:opacity-90")}
+                    className={cn("mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isCopied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-ig-gradient text-white shadow-sm hover:opacity-90")}
                   >
                     {isCopied ? <><CheckCircle2 className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> {p.code}</>}
                   </button>
```

## Answers to your questions

**(1) Store-name link (A): FULL link treatment** — AGREE. `transition-all` is correct because `hover:underline` is a color/decoration transition that needs easing alongside the press-scale. `active:scale-[0.97]` is the correct link/chip tier. OUTWARD ring is correct (not inside overflow-hidden). No `aria-label` needed (visible text). ✅

**(2) Copy-code (B): RING-ONLY** — AGREE. Pre-existing `transition-all active:scale-[0.98]` is valid and complete. `[0.98]` is correct for full-width tier. NO `aria-pressed` — the label text changes from code to "Copied", so state is conveyed by text, not just bg. ✅

**(3) Inventory exhaustive** — ✅ Correct: 2 RAW `<button>` (L155, L166) + 1 shadcn `<Button>` (L96). Hero stat `motion.div` (L109) and promo-row `motion.div` (L141) are presentational (no `onClick`). Loading skeletons (L121) and empty-state (L123) are non-interactive. ✅

**(4) Responsive @375** — Clean: `max-w-2xl mx-auto px-4` → ~343px inner. Promo card: logo 40px + gap 12px + `flex-1 min-w-0` (store-name `line-clamp-1` + value `text-2xl` ~22px + meta `flex-wrap`) + full-width Copy button `h-10`. No crush. Sub-44px flags (repo-wide compact pattern, not per-page): back `h-10 w-10` (40px), store-name link inline text (~20px height), Copy button `h-10` (40px). ✅

**(5) Owner flags** — Store-name link's `onClick` is a no-op when `s?.slug` is null (dead link for stores without slugs). Copy button lacks `aria-live` region for "Copied" announcement (optional a11y nicety, out of scope). ✅

## Verification

Run `npm run update` before marking done.
