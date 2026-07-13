# MiMo run — 2026-06-14T06:44:01.769Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Validation — AdultDiscoveryPage.tsx

All 5 edits verified correct against the file as shown. Concise answers:

---

**(1)** ✅ Correct. `hover:text-foreground` (color) + new scale → `transition-all` mandatory. `rounded-md` for ring corners. `[0.97]` link tier. OUTWARD `ring-ring` on neutral full-screen gate.

**(2)** ✅ All correct.
- `aria-pressed={pendingConfirm}` — correct for a persistent bg-conveyed consent toggle with constant label text. `role="checkbox"+aria-checked` is the "more precise" alternative but adding it is structural (changes the element's implicit role) → out of scope.
- FLIP `transition-colors`→`transition-all` mandatory (new CSS scale on a control that had `transition-colors` + `hover:border-rose-500/40`).
- `[0.98]` full-width card tier (not `[0.97]` — this is a wide tappable surface, not a text link).
- OUTWARD `ring-ring` — `bg-card` is neutral; the `border-rose-500`/`bg-rose-500/8` tint is a light ~8% wash that doesn't compete with `ring-ring`.

**(3)** ✅ Correct. Already had `transition-all active:scale-[0.98]` → ring-ONLY append. Visible text "Enter 18+ Discovery" → no aria. `disabled` attribute untouched (native disabled semantics correct for a CTA gated on consent).

**(4)** ✅ Correct. `hover:bg-muted/50` (bg) + new scale → `transition-all` mandatory (not `transition-transform`). `active:scale-95` icon-only tier. Already `aria-label="Back"` → no new aria.

**(5)** ✅ All correct.
- FLIP `transition-colors`→`transition-all` mandatory (`hover:border-rose-500/40` + new scale).
- `[0.98]` card tier — this is an image tile card, not a text link → card tier correct.
- OUTWARD `ring-ring` — `ring` is CSS `box-shadow`, NOT clipped by the element's `overflow-hidden` (which clips *descendant* elements, not the element's own box-shadow). No `ring-inset` needed.
- `to={profileHref}` untouched. Inner `group-hover:scale-[1.03]` on the img untouched.

**(6)** ✅ Exhaustive.
| Edited | Type | Skip reason (for non-edited) |
|--------|------|-----|
| A L111 | raw `<button>` | — |
| B L129 | raw `<button>` | — |
| C L152 | raw `<button>` | — |
| D L189 | raw `<button>` | — |
| E L244 | raw `<Link>` | — |
| search `<input>` L205 | raw `<input>` | Has own `focus:border-rose-500/60` — converting recolors + changes focus-vs-focus-visible semantics = churn |
| checkbox visual div L139 | `<div>` | Non-interactive (visual only, click goes to parent button) |
| `motion.div` L106 | framer-motion | Entrance animation, no `onClick` |
| 18+/PPV/tier/Crown/Lock badges | `<span>` | Decorative status indicators |
| creator avatar `<img>` | `<img>` | Decorative (empty `alt=""`) |
| `ZivoMobileNav` | component | Own component with its own tokens |

**(7)** Owner flags — all pre-existing, not introduced by this pass:

**(a)** `(supabase as any)` ×3 — existing repo-wide pattern. ✅

**(b)** Search input uses `focus:border-rose-500/60` (not `focus-visible:ring-ring`) — diverges from house token. Converting would recolor (rose → ring-ring) AND change trigger (any focus → keyboard-only focus-visible) = semantic churn. ✅ Left correctly.

**(c)** ⚠️ **`profileHref` falls back to `#`** when `!c.share_code && !c.username` — renders a dead-link card that navigates nowhere. Owner should either (i) filter these rows from the query, (ii) add `pointer-events-none opacity-50` to cards with `href="#"`, or (iii) route by `user_id` as final fallback (`/profile/${c.user_id}`). Not introduced here — pre-existing.

**(d)** Age gate persistence via `useAdultGate.confirm()` — the page copy says "remembered" + "clear from settings". ✅ Correct UX.

**(e)** `queryKey: ["adult-discovery", search]` — refetches on search change. `enabled: isConfirmed` — query only fires post-gate. `staleTime: 60_000` — reasonable. ✅

**No additional flags.**

**(8)** Responsive at 375/768/1280:

| Breakpoint | Verdict |
|------------|---------|
| **375** | Age gate: `px-6` → 327px usable; `max-w-sm` (384px) bounded by viewport. Back text + Flame hero + checkbox card (`p-4 w-full`) + CTA (`h-13 w-full`) + footer text all fit. Discovery: sticky header (Back 36px + title + Flame 16px + search `h-10 w-full`) fits. Grid `grid-cols-2 gap-3` → ~165px columns; `aspect-[4/5]` cards with absolute-positioned badges + `text-[13px]` truncated name + `line-clamp-2` bio + "View profile" CTA → no crush. ✅ |
| **768** | `max-w-sm` gate centered. Grid stays 2-col (wider tiles ~360px each in a `px-4` container — cards look good but owner could consider `grid-cols-3` at this breakpoint for density). ✅ |
| **1280** | Same. ✅ |

**Sub-44px tap targets (FLAG — repo-wide compact patterns, NOT introduced):**

| Control | Size | Note |
|---------|------|------|
| Age-gate Back text `[12px]` | ~20px | Repo-wide inline text-link pattern |
| List Back `p-2` | ~36px | Repo-wide icon-button pattern |
| Search `h-10` | 40px | Standard input, borderline |
| CTA `h-13` | 52px | ✅ |
| Checkbox card `p-4` | ~56px+ | ✅ |
| Creator cards | Large tiles | ✅ |

---

## Summary

**All 5 edits validated correct. Zero corrections needed.** The diff is clean: 5 `−`/`+` className edits + 2 new aria attrs (`aria-pressed` on B, `aria-label` already on D — net 1 new), FLIPs=2 (B, E), ring=5, ring-ring=5 OUTWARD, 0 logic lines touched.

**The one owner follow-up** is the `profileHref = "#"` dead-link fallback (flag 7c) — cosmetic, pre-existing, not introduced by this pass.

**To ship:** `npm run update` must pass (the file is already in the working tree per the task description — just verify the gate).
