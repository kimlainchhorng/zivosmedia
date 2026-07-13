# DeepSeek run — 2026-06-14T06:42:36.147Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/AdultDiscoveryPage.tsx (301 lines, "18+ discovery surface for OF creators behind a persistent age gate"; REAL Supabase via `(supabase as any)` 3-query resolve [profiles is_of_creator + ppv_posts counts + cheapest non-free subscription_tiers], gated `enabled isConfirmed`; `useAdultGate` hook (isConfirmed/isLoading/confirm); `useState` search/pendingConfirm/confirming; `useQuery ["adult-discovery", search]`. TWO render branches: (1) AGE GATE full screen [Back text-btn + Flame hero + confirm-checkbox card btn + "Enter 18+ Discovery" CTA] when `!isConfirmed`; (2) DISCOVERY LIST [sticky header: Back icon-btn + title + search input; 2-col creator card grid of Links] post-confirm. Tapping a creator routes to PublicProfilePage which has its OWN per-profile confirm step).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): interactive controls = 4 raw <button> (age-gate Back L111, age-confirm checkbox-card toggle L129, Enter-Discovery CTA L152, list Back icon L189) + 1 raw search <input> L205 + mapped creator <Link> L244. NO shadcn Button/Input (raw only). NO motion.button. Age-gate motion.div L106 (entrance anim, NO onClick). Inner checkbox visual L139 = non-interactive div. Badges (18+/PPV/tier/Crown/Lock/Flame) + creator avatar img = decorative. ZivoMobileNav own component.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border → FLIP transition-colors→transition-all (or add transition-all if none). transition-transform when scale is SOLE animated prop (no hover). DON'T-CHURN: control ALREADY has press + transition → ring (+aria) ONLY. aria-pressed for persistent toggle/checkbox with constant label + bg-conveyed state. aria-label for icon-only. OUTWARD ring-ring default on neutral surfaces.

EDITS APPLIED (validate exact):
(A) age-gate Back <button> L111 (text link "Back", navigate(-1), HAD hover:text-foreground, NO transition/scale/focus) — APPEND "rounded-md transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (link tier [0.97]; transition-all — hover:text + scale both animate, no prior transition → add transition-all; rounded-md for ring corners; OUTWARD ring-ring).
(B) age-confirm checkbox-card <button> L129 (full-width tappable card acting as an 18+ consent checkbox, one-shot toggle setPendingConfirm, bg-conveyed selection [border-rose-500 bg-rose-500/8 when on else border-border hover:border-rose-500/40], cn 1st arg HAD transition-colors, NO scale/focus, NO aria; contains an inner checkbox visual div) — **ADD aria-pressed={pendingConfirm}** + **FLIP transition-colors→transition-all** + APPEND active:scale-[0.98] + ring into the cn 1st arg (full-width card tier [0.98]; FLIP mandatory — new CSS scale on a transition-colors+hover:border control; OUTWARD ring-ring on neutral bg-card; aria-pressed for the persistent bg-conveyed consent toggle — role="checkbox"+aria-checked would be more precise but is a STRUCTURAL change beyond a display-only pass).
(C) Enter-Discovery CTA <button> L152 (full-width, disabled={!pendingConfirm || confirming}, cn 1st arg ALREADY transition-all + active:scale-[0.98]) — **DON'T-CHURN ring-ONLY append** focus-visible ring into the cn 1st arg (kept scale + transition-all, no flip; NO aria — visible text; disabled untouched; OUTWARD ring-ring).
(D) list Back icon <button> L189 (icon-only, navigate(-1), ALREADY aria-label="Back", HAD hover:bg-muted/50, NO transition/scale/focus) — APPEND "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only tier 95; transition-all — hover:bg + scale both animate, no prior transition → add transition-all; OUTWARD ring-ring; NO new aria — already labeled).
(E) creator card <Link> L244 (mapped, to=profileHref [/u/share_code OR /@username OR #], full-width card tile wrapping aspect img + badges + name/bio, HAD hover:border-rose-500/40 + transition-colors + overflow-hidden rounded-2xl, NO scale/focus; inner img has group-hover:scale-[1.03]) — **FLIP transition-colors→transition-all** + APPEND active:scale-[0.98] + ring (card tier [0.98]; FLIP mandatory — new CSS scale on transition-colors+hover:border; OUTWARD ring-ring — grid grid-cols-2 gap-3 leaves room, the ring is a box-shadow NOT clipped by the card's overflow-hidden, neutral page parent; to= untouched; inner img group-hover scale untouched).
LEAVE: (search <input> L205 — has its OWN existing focus:border-rose-500/60; converting focus:→focus-visible:ring-ring would recolor + change focus-vs-focus-visible semantics = churn — LEFT, flagged); inner checkbox div L139 (non-interactive); age-gate motion.div L106 (entrance anim, no onClick); badges/avatar/icons decorative; ZivoMobileNav (own component).

QUESTIONS:
(1) (A) age-gate Back: link tier [0.97] + transition-all (hover:text + scale) + rounded-md + ring correct?
(2) (B) age-confirm checkbox-card: aria-pressed={pendingConfirm} correct for this consent checkbox (vs role="checkbox"+aria-checked which is structural/out-of-scope)? FLIP transition-colors→transition-all + [0.98] + ring correct (full-width card gaining a new scale)? OUTWARD ring-ring?
(3) (C) Enter CTA: DON'T-CHURN ring-ONLY correct (already transition-all + active:scale-[0.98])? NO aria (visible text)? disabled untouched correct?
(4) (D) list Back icon: transition-all (hover:bg + scale) + active:scale-95 + ring correct? NO new aria (already labeled)?
(5) (E) creator card Link: FLIP + [0.98] card tier + ring correct? OUTWARD ring-ring OK on an overflow-hidden card in a grid-cols-2 gap-3 (ring is box-shadow, not clipped)? Or ring-inset? Card tier [0.98] vs link tier [0.97] for this image tile?
(6) Inventory exhaustive (4 buttons + 1 Link edited, search input LEFT)? inner checkbox div, motion.div, badges, avatar img, ZivoMobileNav all presentational/own-component?
(7) Owner flags (logic/out of scope, FLAG not fix): (a) `(supabase as any)` casts ×3 (existing); (b) search input uses focus:border (not focus-visible:ring-ring house token) — diverges, left as churn; (c) profileHref falls back to `#` when no share_code AND no username (a dead `#` link → owner should hide/disable the card or route by user_id instead); (d) age gate persists via useAdultGate.confirm() (remembered — clearable in settings, per copy); (e) creator query refetches per search term (queryKey includes search — correct); anything else?
(8) Responsive 375/768/1280: age-gate (hero + checkbox card + CTA); discovery sticky header (Back + title + search input); 2-col creator grid (aspect-[4/5] cards + badges + name/bio). Any crush @375? sub-44px tap targets to FLAG (age-gate Back text ~20px; list Back p-2 ~36px; search input h-10 40px; CTA h-13 ~52px OK; confirm card p-4 big OK; creator cards big OK)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/AdultDiscoveryPage.tsx

---

## Plan

Apply the 5 edits (A–E) as specified — all className-only, 0 logic lines touched. The analysis is correct on every point.

## Proposed diff

```diff
--- a/src/pages/AdultDiscoveryPage.tsx
+++ b/src/pages/AdultDiscoveryPage.tsx
@@ -108,7 +108,7 @@ export default function AdultDiscoveryPage() {
           <button
             type="button"
             onClick={() => navigate(-1)}
-            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
+            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-md transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-3.5 w-3.5" /> Back
           </button>
@@ -129,7 +129,7 @@ export default function AdultDiscoveryPage() {
           <button
             type="button"
             onClick={() => setPendingConfirm((v) => !v)}
-            className={cn(
-              "w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-colors text-left",
+            aria-pressed={pendingConfirm}
+            className={cn(
+              "w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               pendingConfirm
                 ? "border-rose-500 bg-rose-500/8"
                 : "border-border bg-card hover:border-rose-500/40",
@@ -152,7 +152,7 @@ export default function AdultDiscoveryPage() {
             className={cn(
               "w-full h-13 rounded-2xl font-extrabold text-[14px] py-3.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               pendingConfirm && !confirming
                 ? "bg-rose-500 text-white hover:bg-rose-600"
                 : "bg-muted/50 text-muted-foreground cursor-not-allowed",
             )}
@@ -189,7 +189,7 @@ export default function AdultDiscoveryPage() {
           <button
             type="button"
             onClick={() => navigate(-1)}
             aria-label="Back"
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-5 w-5" />
           </button>
@@ -244,7 +244,7 @@ export default function AdultDiscoveryPage() {
                 return (
                   <Link
                     key={c.user_id}
                     to={profileHref}
-                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-rose-500/40 transition-colors"
+                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
```

## Verification per item

1. **(A) age-gate Back** — ✅ Correct. Link tier `[0.97]`, `transition-all` (hover:text + scale), `rounded-md`, OUTWARD `ring-ring`.

2. **(B) age-confirm checkbox-card** — ✅ Correct. `aria-pressed={pendingConfirm}` is the right choice (role="checkbox" is structural/out-of-scope). FLIP `transition-colors→transition-all`, `[0.98]` card tier, OUTWARD `ring-ring`.

3. **(C) Enter CTA** — ✅ Correct. DON'T-CHURN ring-ONLY (already `transition-all` + `active:scale-[0.98]`). NO aria (visible text). `disabled` untouched.

4. **(D) list Back icon** — ✅ Correct. `transition-all` (hover:bg + scale), `active:scale-95`, OUTWARD `ring-ring`. NO new aria (already labeled).

5. **(E) creator card Link** — ✅ Correct. FLIP `transition-colors→transition-all`, `[0.98]` card tier (image tile = card, not link). OUTWARD `ring-ring` is correct — ring is a box-shadow, NOT clipped by `overflow-hidden`. `ring-inset` would be wrong (would clip inside the card).

6. **Inventory** — ✅ Exhaustive. 4 buttons + 1 Link edited. Search input LEFT (churn). Inner checkbox div, motion.div, badges, avatar img, ZivoMobileNav all presentational/own-component.

7. **Owner flags** — ✅ All correct. Add: (f) `profileHref` fallback to `#` when no share_code AND no username — owner should either hide the card or route by `user_id`. (g) The `(supabase as any)` casts are pre-existing repo pattern.

8. **Responsive** — ✅ Clean at 375. Age-gate: hero + checkbox card + CTA all fit in `max-w-sm`. Discovery: sticky header (Back `p-2` + title + search `h-10`) fits. 2-col grid `gap-3` with `aspect-[4/5]` cards works. Sub-44px: age-gate Back text link (~20px), list Back `p-2` (~36px), search `h-10` (40px) — all pre-existing compact patterns, not introduced here. CTA `h-13` (~52px ✓), confirm card `p-4` (big ✓), creator cards (big ✓).

## Owner must verify

- `npm run update` passes (type-check + worker + build).
- Preview at 375/768/1280 on the age-gate and discovery-list branches.
- The `#` fallback link for creators without share_code or username (owner decision to fix or leave).
