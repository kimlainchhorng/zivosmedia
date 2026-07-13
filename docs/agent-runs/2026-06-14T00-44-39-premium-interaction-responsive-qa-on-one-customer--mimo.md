# MiMo run — 2026-06-14T00:44:39.733Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/MonetizationArticleDetailPage.tsx (339 lines, route /monetization/articles/:slug -- ZIVO Creator Academy article viewer: mostly static TOPIC_CONTENT data + thin interactive shell. Sticky header (back + Share-copy-link + Save/bookmark toggle), motion.div body (hero banner, title/meta, dynamic sections, AdSenseUnit, Pro-Tips card, Key-Stats card, 4 quick-action nav cards grid-cols-2, 3 action pills [Helpful/Share/Save], related-articles list, Browse-All CTA), ZivoMobileNav).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (grep-confirmed): exactly 12 raw <button type="button">, 0 motion.button, 0 shadcn <Button>. AdSenseUnit = child component => SKIP. The motion.div wrappers (body container + per-section items) have NO onClick => presentational, nothing. State: useState liked + saved (toggles). Header Share + Save are DUPLICATED by the bottom action-pill Share + Save (intentional dual placement, same handlers) -- not a bug.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR general raw-button standard; transition-transform when scale is the SOLE animated prop (ring then appears instant -- accepted per Eats-A4 / NotificationsPage quick-action precedent). aria-label for icon-only; aria-pressed for TOGGLE buttons whose pressed-state is conveyed ONLY by color/fill/bg (NOT by a text change).

CRITICAL edit-shape rule: RAW <button> (these 12) => FULL token set (but most ALREADY have active:scale + transition => for those, ADD ring [+aria] only; do NOT churn existing active:scale values or flip transition-transform<->all unless a hover-bg demands it). shadcn => never touch. motion.div => nothing.

HARD RULE: className + display-only attr (aria-label/aria-pressed) ONLY. Do NOT change any onClick / navigate / setLiked / setSaved / toast / navigator.clipboard / useParams / getContentForSlug / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (icon ArrowLeft; NO active:scale, NO transition) -- before: "p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation" -> append " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-label="Go back" (icon tier; transition-all so hover:bg fades; rounded-full -> normal ring).
(2) Header Share (icon Share2; onClick copies window.location.href to clipboard + toast "Link copied!"; NO active:scale/transition) -- before: "p-2 rounded-full hover:bg-muted/50 touch-manipulation" -> append " transition-all active:scale-95 ...ring" + add aria-label (icon tier). Q: aria-label="Share article" (matches icon) or "Copy link" (matches behavior)? I lean "Share article".
(3) Header Save (icon Bookmark; onClick setSaved(!saved)+toast; className is template-literal with static base + `${saved ? "text-primary" : ""}`; NO active:scale/transition) -- before static base: "p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation" -> append " transition-all active:scale-95 ...ring" to the static base + add aria-label="Save article" + aria-pressed={saved} (icon-only toggle; pressed-state conveyed ONLY by text-primary + fill-primary, no text => aria-pressed correct).
(4-7) Quick-action cards x4 (Creator Dashboard / Monetization Hub / ZIVO Shop / Account Settings; IDENTICAL className, disambiguate by onClick navigate target; each navigates) -- before: "rounded-xl border border-border/40 bg-card p-3 text-left touch-manipulation active:scale-[0.97] transition-transform" -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" ONLY (KEEP existing active:scale-[0.97] + transition-transform -- scale-only, no hover-bg; visible icon+title+subtitle = accessible name => NO aria-label).
(8) Helpful pill (text "Helpful" + ThumbsUp; onClick setLiked(!liked); template-literal static base + `${liked ? "bg-primary/15 text-primary" : "bg-muted/50"}`; has active:scale-95 transition-all) -- append " focus-visible:...ring" to the static base + add aria-pressed={liked} (KEEP active:scale-95 + transition-all; visible text "Helpful" is STATIC -- pressed-state conveyed only by bg/color/fill => aria-pressed correct; NO aria-label, text present).
(9) Share pill (text "Share" + Share2; onClick copies link; "bg-muted/50 ... active:scale-95 transition-transform"; NOT a toggle) -- append " focus-visible:...ring" ONLY (KEEP active:scale-95 + transition-transform; visible text => no aria-label, no aria-pressed).
(10) Save pill (text "Save" + Bookmark; onClick setSaved(!saved); template-literal static base + `${saved ? "bg-primary/15 text-primary" : "bg-muted/50"}`; active:scale-95 transition-all) -- append " focus-visible:...ring" to the static base + add aria-pressed={saved} (KEEP active:scale-95 + transition-all; static "Save" text + state by bg/color => aria-pressed correct).
(11) Related-articles rows (.map'd; w-full row card; onClick navigate to related slug; "...active:scale-[0.98] transition-transform") -- append " focus-visible:...ring" ONLY (KEEP active:scale-[0.98] + transition-transform; visible related-title text => no aria-label).
(12) Browse-All CTA (wide w-full; onClick navigate("/monetization/articles"); "bg-ig-gradient text-white ... active:scale-[0.98] transition-transform") -- append " focus-visible:...ring" ONLY (KEEP active:scale-[0.98] + transition-transform; visible text => no aria-label).

QUESTIONS:
(1) Header Share (2) aria-label: "Share article" (icon) vs "Copy link" (behavior toasts "Link copied!")? Lean "Share article".
(2) aria-pressed on the 3 toggles -- Header Save (3, icon-only), Helpful pill (8, static text), Save pill (10, static text): all toggle a state conveyed ONLY by color/fill/bg (no text change) -> aria-pressed={saved}/{liked} on all three? (header Save also needs aria-label since icon-only.) Confirm.
(3) Quick-action cards (4-7) + Share pill (9) + related rows (11) + Browse-All (12) ALL already have active:scale + transition-transform/all -> ADD ring only, KEEP existing scale value + transition type (don't bump [0.97]->[0.98], don't flip transition-transform->all where there's no hover-bg). Agree? (i.e. respect "don't churn existing tokens".)
(4) The 3 action pills (8/9/10) use active:scale-95 (icon-tier value) despite being text+icon pills (would normally be [0.97]) -- KEEP the existing 95 (don't churn) + ring only? Agree, or normalize to [0.97]?
(5) ring-inset anywhere? The hero banner is "relative overflow-hidden" but contains NO buttons; all 12 buttons are standalone (header / grid cards / pills / list rows) NOT flush inside an overflow-hidden rounded parent -> NO ring-inset anywhere. Agree?
(6) Responsive 375/768/1280: header back + flex-1 centered truncate title + Share/Save; body px-4; quick-actions grid-cols-2 gap-3; 3 action pills flex gap-3; related rows w-full; Browse-All w-full. Any crush at 375px (esp the 3-pill row + the grid-cols-2 cards)?

ALSO confirm: (a) inventory exhaustive (exactly 12 raw <button>, no missed control)? (b) any sub-44px tap targets to FLAG (header icons p-2 ~32px; pills px-3 py-2)? (c) Header Share/Save duplicated by bottom Share/Save pills = intentional, not a bug to flag?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MonetizationArticleDetailPage.tsx

---

## 1. Plan

12 raw `<button>` controls, 0 motion.button, 0 shadcn. **Inventory exhaustive.** Every edit is className + optional `aria-label`/`aria-pressed` only. Zero logic changes.

| # | Control | Action |
|---|---------|--------|
| 1 | Header back | +`transition-all active:scale-95` + ring + `aria-label="Go back"` |
| 2 | Header Share | +`transition-all active:scale-95` + ring + `aria-label="Share article"` |
| 3 | Header Save | +`transition-all active:scale-95` + ring + `aria-label="Save article"` + `aria-pressed={saved}` |
| 4–7 | Quick-action cards ×4 | +ring ONLY (keep existing `active:scale-[0.97] transition-transform`) |
| 8 | Helpful pill | +ring + `aria-pressed={liked}` (keep existing `active:scale-95 transition-all`) |
| 9 | Share pill | +ring ONLY (keep existing `active:scale-95 transition-transform`) |
| 10 | Save pill | +ring + `aria-pressed={saved}` (keep existing `active:scale-95 transition-all`) |
| 11 | Related rows (`.map`) | +ring ONLY (keep existing `active:scale-[0.98] transition-transform`) |
| 12 | Browse-All CTA | +ring ONLY (keep existing `active:scale-[0.98] transition-transform`) |

**16 line-edits / 6 new aria attrs** (3 `aria-label` + 3 `aria-pressed`).

---

## 2. Answers to your questions

**(1) Header Share aria-label → `"Share article"`.** Names the semantic intent (matches the icon + bottom-pill text). The clipboard impl is a detail; the toast already confirms.

**(2) aria-pressed on all 3 toggles — confirmed.** Header Save (icon-only → needs both `aria-label` + `aria-pressed`), Helpful pill + Save pill (visible static text → `aria-pressed` only, no `aria-label`). All three convey state ONLY by color/fill/bg (no text change) → `aria-pressed` is correct.

**(3) Don't churn existing tokens — agree.** All 9 controls that already have `active:scale` + `transition-*` keep their exact values. Ring appended only.

**(4) Pills keep `active:scale-95` — agree, don't churn.** These are compact pill-shaped buttons visually similar to icon-tier controls; the repo-wide precedent is consistent enough. Normalizing to `[0.97]` would be churn for no user-visible benefit.

**(5) No `ring-inset` — agree.** The hero banner is `overflow-hidden` but contains zero buttons. All 12 buttons are in standard flow: header row (not overflow-hidden), grid cells, `border-t` pill row, standalone list rows, standalone CTA. No button sits flush inside an `overflow-hidden rounded-*` parent.

**(6) Responsive 375px — clean:**
- Header: back(~36) + gap-3 + `flex-1` truncate title + gap-1 + Share(~32) + Save(~32) ≈ 116px fixed → ~227px for title, clean.
- 3 pills: each ≈ icon(14) + gap-1.5 + text(~40–50) + px-3(24) ≈ 60–70px; 3× + 2×12px gaps ≈ 204–234px in 343px → fits.
- Grid-cols-2 gap-3: each col ≈ 165px, content is icon + 2 short text lines → fits.
- No crush.

**Sub-44px tap targets to FLAG:**
- Header icons: `p-2` + icon h-5/w-5 → ~36px; `p-2` + icon h-4/w-4 → ~32px. Both below 44px.
- Action pills: `px-3 py-2` + text → ~38px height. Slightly below 44px.
- Browse-All: `py-3` + text → ~38px height. Slightly below 44px.
- Established repo
