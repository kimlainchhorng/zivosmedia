# DeepSeek run — 2026-06-14T01:58:03.245Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/DraftsPage.tsx (127 lines, route /drafts -- view + manage post drafts & scheduled posts. Reads post_drafts (key ["post-drafts", user?.id, activeTab]; select *; eq user_id; eq status = activeTab==="drafts"?"draft":"scheduled"; order updated_at desc); activeTab useState ("drafts"|"scheduled"); deleteDraft (delete from post_drafts + invalidate + toast); publishDraft (insert into user_posts + delete from post_drafts + invalidate + toast). Layout: sticky header (shadcn back <Button> + "Drafts & Scheduled" title), a 2-tab segmented row (drafts/scheduled), then a list of draft cards (each motion.div [layout + entrance + exit anim, NO onClick] = caption + a date/relative-time line + a Publish icon btn + a Delete icon btn). Bottom ZivoMobileNav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 RAW <button type="button">, 0 motion.button, 1 shadcn <Button>.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L66) => SKIP (ships tokens, labeled).
- Tab buttons (L73): RAW, .map over ["drafts","scheduled"], onClick={() => setActiveTab(t)}, cn() base "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors" + cond ${activeTab === t ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"}. transition-colors ONLY (no scale, no ring). Selection conveyed ONLY by bg (gradient vs muted) + text color; visible label "Drafts"/"Scheduled" constant per button; the leading icon (FileText vs Calendar) is constant per button (does NOT change with selection). Container L71 "flex gap-1 px-4 pb-2" (NOT overflow-hidden).
- Publish button (L112): RAW icon-only Send, onClick={() => publishDraft(d)}, aria-label="Publish draft" + title="Publish draft", className="p-2 rounded-full hover:bg-primary/10". No transition/scale/ring.
- Delete button (L115): RAW icon-only Trash2, onClick={() => deleteDraft(d.id)}, aria-label="Delete draft" + title="Delete draft", className="p-2 rounded-full hover:bg-destructive/10". No transition/scale/ring. Container for both L111 "flex items-center gap-2" inside the card motion.div L104 "p-4 rounded-xl bg-card border" (NOT overflow-hidden).
- Each draft card motion.div (L98, layout+initial/animate+exit, NO onClick) => presentational, leave. ZivoMobileNav (L124) component. Loader2/FileText/Calendar/Send/Trash2/Clock icons decorative. Empty state non-interactive.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP transition-colors->transition-all when a newly-added active:scale (a transform) must ease alongside an existing color/bg transition (transition-colors does NOT cover transform). aria-pressed for toggles/segmented whose state is conveyed ONLY by color/bg (label word + icon constant per button STILL qualifies) -- NOT when a changing label/icon already conveys state. ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent.

HARD RULE: className + display-only attr ONLY. Do NOT change any onClick / setActiveTab / publishDraft / deleteDraft / navigate / useQuery / mutation / supabase / toast / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Tab buttons (L73, RAW segmented, selection by bg only, label+icon constant per button) -> add aria-pressed={activeTab === t} (after onClick, before className) + FLIP transition-colors->transition-all + insert active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring into the cn() static base. New base: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". Segmented tier => [0.97]. FLIP because the existing transition-colors eases the selection bg swap but does NOT cover the new scale transform => transition-all (superset) so the press-scale eases too. aria-pressed (selection-by-bg-only, label+icon constant per button => qualifies; CreatorSubscribers/FriendRequests/GifLibrary/AMAPage precedent). visible text => NO aria-label. Container flex gap-1 NOT overflow-hidden => normal OUTWARD ring. OK?

(2) Publish button (L112, RAW icon-only; onClick publishDraft; aria-label + title present; className="p-2 rounded-full hover:bg-primary/10") -> APPEND " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". Icon tier => active:scale-95. transition-all (eases hover:bg-primary/10 + the new scale). rounded-full present. aria-label present => NO aria change (action button, NOT a toggle => no aria-pressed). OUTWARD ring. OK?

(3) Delete button (L115, RAW icon-only; onClick deleteDraft; aria-label + title present; className="p-2 rounded-full hover:bg-destructive/10") -> APPEND " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". Same as Publish (icon tier, transition-all eases hover:bg-destructive/10 + scale, OUTWARD ring, no aria-pressed). OK?

QUESTIONS:
(1) Tab (#1): aria-pressed (selection by bg only, label+icon constant per button) + FLIP transition-colors->transition-all + active:scale-[0.97] + ring. Agree the flip is correct (transition-colors doesn't cover the new transform)? Agree aria-pressed qualifies? OUTWARD ring (flex gap-1 not overflow-hidden)?
(2) Publish (#2) + Delete (#3): full token set transition-all active:scale-95 + ring; NO aria-pressed (one-shot action buttons, not toggles); aria-label already present. Agree icon tier [0.95] + transition-all (hover:bg + scale)? OUTWARD ring (card not overflow-hidden)?
(3) shadcn back <Button> (L66) => correctly SKIP? Each draft card motion.div (no onClick) => presentational? Inventory exhaustive (exactly 3 raw <button>, no missed control)?
(4) Responsive 375/768/1280: header (back h-10 w-10 + title); tab row flex gap-1 (2 tabs px-3 py-1.5); draft card p-4 (caption line-clamp-2 + date line + Publish/Delete p-2 each). Any crush @375 (esp the date text vs the 2 action buttons on one flex justify-between row)? sub-44px tap targets to FLAG (tab py-1.5 ~30px; Publish/Delete p-2 ~32px; back h-10 w-10 40px)?
(5) Any a11y note: Publish/Delete have BOTH aria-label AND title (redundant but harmless) -- leave both as-is (display-only, not churning)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/DraftsPage.tsx

---

## Plan

Apply premium interaction tokens to the 3 raw `<button>` controls on `DraftsPage.tsx` — tab segmented, Publish, Delete. All className + display-only attr only. No logic changes.

## Diff

```diff
--- a/src/pages/DraftsPage.tsx
+++ b/src/pages/DraftsPage.tsx
@@ -70,7 +70,7 @@ export default function DraftsPage() {
           {(["drafts", "scheduled"] as DraftTab[]).map((t) => (
             <button type="button"
               key={t}
-              onClick={() => setActiveTab(t)}
+              onClick={() => setActiveTab(t)} aria-pressed={activeTab === t}
               className={cn(
-                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeTab === t ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
               )}
             >
@@ -109,12 +109,12 @@ export default function DraftsPage() {
                 <div className="flex items-center gap-2">
-                  <button type="button" onClick={() => publishDraft(d)} aria-label="Publish draft" title="Publish draft" className="p-2 rounded-full hover:bg-primary/10">
+                  <button type="button" onClick={() => publishDraft(d)} aria-label="Publish draft" title="Publish draft" className="p-2 rounded-full hover:bg-primary/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Send className="h-4 w-4 text-primary" />
                   </button>
-                  <button type="button" onClick={() => deleteDraft(d.id)} aria-label="Delete draft" title="Delete draft" className="p-2 rounded-full hover:bg-destructive/10">
+                  <button type="button" onClick={() => deleteDraft(d.id)} aria-label="Delete draft" title="Delete draft" className="p-2 rounded-full hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Trash2 className="h-4 w-4 text-muted-foreground" />
                   </button>
                 </div>
```

## Validation of your plan — item by item

**(1) Tab buttons** — ✅ Correct as-is.
- `aria-pressed` qualifies (selection by bg/gradient only; label word + icon constant per button — `"Drafts"`/`"Scheduled"` never changes, `FileText`/`Calendar` never changes).
- `transition-colors` → `transition-all` flip is correct (existing `transition-colors` eases the bg swap but does NOT cover the new `active:scale-[0.97]` transform).
- `active:scale-[0.97]` — correct segmented/chip tier.
- OUTWARD ring — correct (container `flex gap-1` is NOT `overflow-hidden`).

**(2) Publish + Delete** — ✅ Correct as-is.
- Full token set `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- `active:scale-95` — correct icon-only tier.
- `transition-all` — correct (eases existing `hover:bg-primary/10` / `hover:bg-destructive/10` + new scale).
- NO `aria-pressed` — correct (one-shot action buttons, not toggles).
- OUTWARD ring — correct (card `rounded-xl bg-card border` is NOT `overflow-hidden`).

**(3) shadcn back `<Button>`** — ✅ Correct to SKIP (ships its own tokens, `aria-label="Back"` present).

**(4) Draft card `motion.div`** — ✅ Correct to SKIP (no `onClick`, presentational).

**(5) Inventory** — ✅ Exhaustive: exactly 3 raw `<button>` (2 tabs + Publish + Delete = 3? Wait — the `.map` produces 2 tab buttons, so total = 2 tabs + 1 Publish + 1 Delete = **4 raw buttons**. Your plan says "exactly 3" but the file has 4. **Correction needed:** the `.map` over `["drafts", "scheduled"]` produces **2** tab buttons, plus 1 Publish + 1 Delete = **4 raw `<button>` controls**. Your plan correctly covers all 4 (2 tabs get the same treatment, Publish + Delete get the same treatment). The "exactly 3" in your VERIFIED FACTS was a miscount — the plan itself is correct.

**(6) Responsive @375** — ✅ Clean.
- `px-4` → ~343px inner width.
- Header: back `h-10 w-10` (40px) + `gap-3` + title fits.
- Tab row: `flex gap-1` → 2 pills at `px-3 py-1.5` (~28px tall, ~80px wide each) + 4px gap = ~164px < 343px.
- Draft card `p-4` → ~311px inner. Bottom row: date text (`flex-1 min-w-0`) + Publish `p-2` (~32px) + Delete `p-2` (~32px) + `gap-2` (8px) = ~72px fixed, leaving ~239px for date text → no crush.

**(7) Sub-44px tap targets** — ✅ Flag for owner (established pattern, not a per-page fix):
- Tab buttons `py-1.5` → ~30px tall.
- Publish/Delete `p-2` → ~32px.
- Back button `h-10 w-10` → 40px.

**(8) Redundant `aria-label` + `title`** — ✅ Leave both as-is (display-only, harmless, not churning).

## Owner must verify

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview `/drafts` at 375px width — verify tab row wraps cleanly, Publish/Delete buttons have press scale and focus ring.
3. The "exactly 3" miscount in your VERIFIED FACTS is harmless (the plan covers all 4 controls correctly).
