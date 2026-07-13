# MiMo run — 2026-06-14T01:58:52.485Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

**All items correct as-is. No corrections needed.** Here's the validated plan and diff.

---

## Plan (3 controls, 3 line-edits, 1 new attr)

| # | Control | Change | Tier | Ring | aria |
|---|---------|--------|------|------|------|
| 1 | Tab buttons (L73) | FLIP `transition-colors`→`transition-all` + add `active:scale-[0.97]` + ring + `aria-pressed` | segmented `[0.97]` | OUTWARD (`flex gap-1`, no `overflow-hidden`) | `aria-pressed={activeTab === t}` |
| 2 | Publish btn (L112) | APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | icon `[0.95]` | OUTWARD (card not `overflow-hidden`) | none (action, not toggle; `aria-label` already present) |
| 3 | Delete btn (L115) | same as #2 | icon `[0.95]` | OUTWARD | none |

**Answers to your questions:**

1. **Tabs — YES on all counts.** FLIP correct (`transition-colors` doesn't cover the new `active:scale` transform → `transition-all` superset eases both; ClubsPage/GifLibraryPage chips precedent). `aria-pressed` qualifies (selection by bg only, label word + icon constant per button). OUTWARD ring (container `flex gap-1 px-4 pb-2` is not `overflow-hidden`).

2. **Publish + Delete — YES.** `transition-all` (not `transition-transform`) because `hover:bg-primary/10` / `hover:bg-destructive/10` are color transitions that must ease alongside the scale. Icon tier `[0.95]`. NO `aria-pressed` (one-shot actions). `aria-label` already present. OUTWARD ring (card `p-4 rounded-xl bg-card border` is not `overflow-hidden`).

3. **SKIP — YES.** Shadcn back `<Button>` ships tokens + is labeled. Draft-card `motion.div` is presentational (no `onClick`). `ZivoMobileNav` is a component. Icons decorative. Empty state non-interactive. Inventory exhaustive (exactly 3 raw `<button>`, 0 `motion.button`, 1 shadcn `<Button>`).

4. **Responsive — clean at 375.** The `justify-between` row: button group ~72px (2×32px + 8px gap) leaves ~271px for date text — longest reasonable string "Updated about 3 hours ago" ≈ 160px, no crush. The date `<p>` lacks `truncate` but date-fns strings are inherently short. **Sub-44px tap targets FLAG** (repo-compact): tab `py-1.5` ~30px, Publish/Delete `p-2` ~32px, back `h-10 w-10` ~40px.

5. **`aria-label` + `title` coexistence — leave both.** Redundant but harmless; `title` provides a native tooltip on hover. Not churning display-only attrs.

---

## Diff

**File:** `src/pages/DraftsPage.tsx`

```diff
--- a/src/pages/DraftsPage.tsx
+++ b/src/pages/DraftsPage.tsx
@@ -70,10 +70,11 @@
         <div className="flex gap-1 px-4 pb-2">
           {(["drafts", "scheduled"] as DraftTab[]).map((t) => (
             <button type="button"
               key={t}
               onClick={() => setActiveTab(t)}
+              aria-pressed={activeTab === t}
               className={cn(
-                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeTab === t ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
               )}
             >
@@ -109,10 +110,10 @@
                 <p className="text-xs text-muted-foreground">
                   {d.publish_at ? `Scheduled: ${new Date(d.publish_at).toLocaleDateString()}` : `Updated ${formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}`}
                 </p>
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

**Summary:** 3 ins / 2 del / +1 net (the standalone `aria-pressed` attr line). All className + display-only-attr. Zero logic touched.

---

## Owner verification

1. Apply the diff above to `src/pages/DraftsPage.tsx`.
2. Run `npm run update` — must pass (0 type errors + production build).
3. Preview `/drafts` at 375/768/1280 — tabs should press-scale + ring, Publish/Delete should press-scale + ring on focus.
4. **Flag (not fix):** sub-44px tap targets on tabs (~30px) and action buttons (~32px) — repo-compact pattern, not this page's scope.
