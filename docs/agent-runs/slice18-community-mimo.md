# MiMo run — 2026-06-14T00:11:06.660Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CommunityDetailPage.tsx (309 lines, route /communities/:id -- view a community: sticky header (back + create-post toggle), community header card (avatar/stats/description + Join/Leave button), animated post-compose form (textarea + Cancel/Post), posts feed (motion.div cards w/ author, content, like count, owner delete), ZivoMobileNav).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS: this file has 9 raw <button type="button"> (NONE shadcn <Button>, NONE framer motion.button -- grep confirms 0 motion.button), all currently with NO focus-visible ring. The post cards + compose form are framer motion.div (presentational, no onClick => get NOTHING). One <textarea> already has focus:ring-2 focus:ring-primary/20 (leave it).

TOKEN TIERS (this repo): wide/primary active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR for general raw-button standard; aria-label for icon-only. NO ring-inset needed (no control is flush inside an overflow-hidden rounded parent; sticky header is backdrop-blur not overflow-hidden).

CRITICAL edit-shape rule:
- RAW <button> (these 9) => CSS active:scale WORKS => FULL token set (transition-all + active:scale-[tier] + ring; aria-label if icon-only).
- shadcn <Button>/<Avatar> already compliant => never touch (none of the 9 are shadcn; Avatar is shadcn, skip).
- motion.div (no onClick) => NOTHING.

HARD RULE: className + display-only attribute (aria-label) changes ONLY. Do NOT change any onClick / navigate / joinMutation / handlePost / setShowPostForm / setPostText / supabase / queryClient / confirm() / confirmContentSafe / useQuery/useMutation keys / disabled logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) 404 "Browse communities" -- before: className="text-primary text-sm" -- after: "text-primary text-sm rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (text-link tier; visible text = name, no aria-label).
(2) Header back (icon ArrowLeft) -- before: "p-2 -ml-2 rounded-full hover:bg-muted/50" -- after: append "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + aria-label="Go back" (icon tier; transition-all so hover:bg fades too; already rounded-full -> normal ring).
(3) Header "+" create-post toggle (icon Plus) -- before: "p-2 rounded-full bg-ig-gradient text-white" -- after: append "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + aria-label="Create post".
(4) Join/Leave Community (wide, className via cn() base string) -- before base: "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors" -- after base: "w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (wide tier; transition-colors->transition-all so the membership bg-muted<->bg-ig-gradient state swap AND scale animate; the conditional 2nd cn arg untouched; visible text, no aria-label).
(5) Post-form close X (icon, currently NO className) -- after: add className="rounded-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + aria-label="Close".
(6) Compose Cancel (pill) -- before: "px-4 py-2 rounded-xl bg-muted text-sm font-medium" -- after: append "transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (chip tier).
(7) Compose Post (pill, has disabled:opacity-50) -- before: "px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50" -- after: append "transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (chip tier; visible "Post" text).
(8) Empty-state "Join to post" (text link) -- before: "text-primary text-sm font-medium" -- after: append "rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(9) Post owner delete (icon MoreVertical, onClick=confirm+delete) -- before: "p-1 rounded-full hover:bg-muted/50" -- after: append "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + aria-label="Delete post" (the icon LOOKS like a menu but the onClick deletes-on-click; label by ACTION = "Delete post" -- agree? or "Post options"?).

QUESTIONS:
(1) Tiers right? Especially (6)/(7) compose pills: active:scale-[0.97] (chip) vs [0.98] (these are real action buttons in a justify-end row)?
(2) (9) delete icon: is aria-label="Delete post" correct (icon is MoreVertical/menu-glyph but behavior is immediate delete-confirm), or "Post options"? I lean "Delete post" (truthful to behavior).
(3) (2)/(3)/(9) icon buttons: transition-all (so hover:bg fades) vs transition-transform (scale only)? (2) and (9) have hover:bg-muted/50 so I used transition-all; (3) has no hover (static gradient) -- should (3) be transition-transform instead of transition-all?
(4) The <textarea> uses focus:ring (not focus-visible) with focus:ring-primary/20 -- leave as-is (it HAS a focus indicator), or upgrade to focus-visible:ring-ring? I lean LEAVE (intentional subtle style, changing it is restyling beyond a token gap).
(5) Responsive at 375/768/1280: px-4 single-column body; header flex row (back + truncate title flex-1 + + button); community card flex; compose flex justify-end gap-2; post cards full-width. Any crush/overflow at 375px?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CommunityDetailPage.tsx

---

## Plan

9 raw `<button>` controls, 0 shadcn `<Button>`, 0 `motion.button`. All get the full raw-button token set. 4 icon-only buttons need `aria-label`. The `<textarea>` and `motion.div` wrappers are left alone.

**9 edits / 4 aria-label additions = 13 attribute changes. All className + display-only-attr.**

---

## Answers to your questions

**(1) Tiers — correct as proposed.** (6) Cancel and (7) Post are pill-sized (`px-4 py-2 rounded-xl`) → `[0.97]` chip tier is right. The `[0.98]` wide tier is for larger/full-width CTAs like (4) Join/Leave. Physical size determines tier, not semantic importance.

**(2) `aria-label="Delete post"` — correct.** The MoreVertical icon's `onClick` goes straight to `confirm("Delete this post?")` → delete. No menu opens. Label by behavior, not by icon glyph. "Post options" would lie to a screen reader.

**(3) transition-all everywhere — yes, for consistency.** (2) and (9) have `hover:bg-muted/50` → `transition-all` is functionally required. (3) has no hover variant (`bg-ig-gradient text-white` is static), so `transition-transform` would technically suffice, but `transition-all` across all 9 is zero-cost and keeps the diff uniform. Use `transition-all` for (3).

**(4) textarea `focus:ring` — LEAVE as-is.** It has a focus indicator (`focus:ring-2 focus:ring-primary/20`). Changing it to `focus-visible:ring-ring` would be a restyle, not an a11y gap fix. Out of scope.

**(5) Responsive at 375px — all clean.** `px-4` single column throughout. Header: back (36px) + `gap-3` + `flex-1 truncate` title + `gap-3` + create (36px) = 96px fixed, ~247px for title in 343px content. Community card: 56px avatar + gap-3 + flex-1 text. Compose row: two pills (~144px combined) right-aligned via `justify-end`. Post cards: 32px avatar + gap-2.5 + flex-1 content + 24px delete = fits. No crush, no overflow.

---

## Proposed diff

**File:** `src/pages/CommunityDetailPage.tsx`

### (1) 404 "Browse communities" — small text-link tier

```diff
- <button type="button" onClick={() => navigate("/communities")} className="text-primary text-sm">Browse communities</button>
+ <button type="button" onClick={() => navigate("/communities")} className="text-primary text-sm rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Browse communities</button>
```

### (2) Header back — icon tier + aria-label

```diff
- <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+ <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### (3) Header create-post "+" — icon tier + aria-label

```diff
- <button type="button" onClick={() => setShowPostForm(!showPostForm)} className="p-2 rounded-full bg-ig-gradient text-white">
+ <button type="button" onClick={() => setShowPostForm(!showPostForm)} aria-label="Create post" className="p-2 rounded-full bg-ig-gradient text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### (4) Join/Leave — wide tier, `transition-colors` → `transition-all`

```diff
  className={cn(
-   "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
+   "w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    membership ? "bg-muted text-foreground" : "bg-ig-gradient text-white"
  )}
```

Second cn arg untouched. ✓

### (5) Compose close X — icon tier, className added from scratch + aria-label

```diff
- <button type="button" onClick={() => setShowPostForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
+ <button type="button" onClick={() => setShowPostForm(false)} aria-label="Close" className="rounded-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="w-4 h-4 text-muted-foreground" /></button>
```

`rounded-md` for clean ring boundary (no existing rounding on this button).

### (6) Compose Cancel — chip tier

```diff
- <button type="button" onClick={() => setShowPostForm(false)} className="px-4 py-2 rounded-xl bg-muted text-sm font-medium">Cancel</button>
+ <button type="button" onClick={() => setShowPostForm(false)} className="px-4 py-2 rounded-xl bg-muted text-sm font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
```

### (7) Compose Post — chip tier

```diff
- className="px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
+ className="px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

`disabled:opacity-50` preserved. ✓

### (8) Empty-state "Join to post" — small text-link tier

```diff
- <button type="button" onClick={() => joinMutation.mutate()} className="text-primary text-sm font-medium">Join to post</button>
+ <button type="button" onClick={() => joinMutation.mutate()} className="text-primary text-sm font-medium rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Join to post</button>
```

### (9) Post delete MoreVertical — icon tier + aria-label

```diff
- <button type="button"
-   className="p-1 rounded-full hover:bg-muted/50"
+ <button type="button"
+   aria-label="Delete post"
+   className="p-1 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Summary

| # | Control | Tier | Tokens added | aria-label |
|---|---------|------|-------------|------------|
| 1 | 404 "Browse communities" | text-link `[0.97]` | `rounded-sm transition-all active:scale-[0.97]` + ring | — |
| 2 | Header back (ArrowLeft) | icon `95` | `transition-all active:scale-95` + ring | `"Go back"` |
| 3 | Header create "+" (Plus) | icon `95` | `transition-all active:scale-95` + ring | `"Create post"` |
| 4 | Join/Leave | wide `[0.98]` | `transition-colors`→`transition-all` + `active:scale-[0.98]` + ring | — |
| 5 | Compose close X | icon `95` | className from scratch: `rounded-md transition-all active:scale-95` + ring | `"Close"` |
| 6 | Compose Cancel | chip `[0.97]` | `transition-all active:scale-[0.97]` + ring | — |
| 7 | Compose Post | chip `[0.97]` | `transition-all active:scale-[0.97]` + ring | — |
| 8 | "Join to post" | text-link `[0.97]` | `rounded-sm transition-all active:scale-[0.97]` + ring | — |
| 9 | Post delete (MoreVertical) | icon `95` | `transition-all active:scale-95` + ring | `"Delete post"` |

**Total: 9 edits, 4 aria-labels. All className + display-only-attr. HARD RULE — all `onClick`/`navigate`/`joinMutation`/`handlePost`/`setShowPostForm`/`setPostText`/`supabase`/`queryClient`/`confirm()`/`confirmContentSafe`/`useQuery`/`useMutation` keys/disabled logic left byte-identical.**

## Owner verification

1. Run `npm run update` — must pass (types + worker types + production build, exit 0).
2. Preview at `/communities/:id` at 375/768/1280 — verify ring visibility on Tab, press scale on click/tap, no layout shift.
3. The 404 state, post-compose form, empty-state "Join to post", and delete button only render in specific conditions (invalid ID, member + toggle, no posts + non-member, own post) — test each reachable branch.
