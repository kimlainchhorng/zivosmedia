# DeepSeek run — 2026-06-13T23:26:44.985Z

- model: deepseek-chat
- task: Premium + responsive redesign audit (className-only). File: src/pages/user/PublicUserProfilePage.tsx (356 lines, view any user's public profile, route /user/:userId). HARD RULE: do NOT change supabase queries/mutations/react-query/routing/component logic — ONLY JSX/Tailwind className changes. Premium interaction tokens: cards/wide active:scale-[0.98], links/chips active:scale-[0.97], icon-only active:scale-[0.95]; add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring; upgrade transition-colors/transition/none to transition-all. shadcn Button/Input/Avatar ALREADY ship tokens — SKIP; only RAW button/a/Link/input need tokens; non-clickable div gets none. My planned edits: (A) THREE icon-only raw header buttons all sharing className 'h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center' (loading Back L177, main Back L212, More-options L223) -> add transition-all active:scale-[0.95] + focus ring (replace_all). (B) TWO raw dropdown menu-item buttons: Share 'w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50' L234 and Unfriend (same + text-rose-500) L250 -> add transition-all active:scale-[0.97] + focus ring. (C) TWO store-link raw <a> (App Store L300, Play Store L305) sharing 'flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-foreground text-background text-sm font-bold active:scale-[0.98]' -> ADD transition-all + focus ring, KEEP existing active:scale-[0.98] (wide CTA). (D) 'Sign in instead' raw button L309 'flex-1 ... bg-muted ... active:scale-[0.98]' -> add transition-all + focus ring, keep [0.98]. SKIP: the 6 shadcn Button (Go back, Message, Add Friend, Cancel request, Accept request, Friends-disabled); the dismiss-overlay div className 'fixed inset-0' onClick L232 (invisible backdrop, not a visible/focusable control — intentionally no tokens). QUESTIONS: (1) Confirm these 8 raw controls are the COMPLETE set (flag any missed). (2) Menu-item buttons unmount the whole dropdown on click (setShowMenu(false)) — is active:scale-[0.97] still right, or should menu rows get focus-ring+transition only? (3) Is skipping the fixed-inset-0 dismiss overlay correct? (4) Flag any fetched-but-unused fields (I see FriendshipRow.friend_id selected but never read in JS). (5) Responsive at 375/768/1280: header row, max-w-md centered column, install banner flex-col sm:flex-row, action buttons flex gap-2 flex-1 — any issues? Keep it tight.
- files: src/pages/user/PublicUserProfilePage.tsx

---

# PublicUserProfilePage — Premium Interaction Pass

## Plan

Apply the standard premium interaction tokens (active:scale + focus-visible:ring + transition-all) to **8 raw controls** across 4 groups, keeping all existing tokens. Skip shadcn components and non-interactive elements. No query/logic changes.

## Proposed Changes

**File:** `src/pages/user/PublicUserProfilePage.tsx`

### Edit A — Three icon-only header buttons (replace_all)

**Before (3 occurrences):**
```tsx
className="h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center"
```

**After:**
```tsx
className="h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Affects:
- Loading state Back button (L177)
- Main Back button (L212)
- More-options button (L223)

### Edit B — Two dropdown menu-item buttons (replace_all)

**Before (2 occurrences):**
```tsx
className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50"
```

**After:**
```tsx
className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Affects:
- Share profile button (L234)
- Unfriend button (L250)

### Edit C — Two store-link `<a>` elements (replace_all)

**Before (2 occurrences):**
```tsx
className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-foreground text-background text-sm font-bold active:scale-[0.98]"
```

**After:**
```tsx
className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-foreground text-background text-sm font-bold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Affects:
- Download for iPhone (L300)
- Get it on Google Play (L305)

### Edit D — "Sign in instead" button

**Before (L309):**
```tsx
className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-[0.98]"
```

**After:**
```tsx
className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Answers to Your Questions

1. **Complete set?** ✅ Yes — 8 raw controls is exhaustive. Verified: the 6 shadcn `<Button>`s (Go back, Message, Add Friend, Cancel request, Accept request, Friends-disabled) all ship tokens from `button.tsx` base. The `<Avatar>`, `<Skeleton>`, `<p>`, `<div>` elements are non-interactive. The `fixed inset-0` dismiss overlay is correctly skipped (invisible, non-focusable).

2. **Menu items + active:scale?** ✅ `active:scale-[0.97]` is correct. The scale fires on `mousedown`/`pointerdown` before the `onClick` unmounts the dropdown — the user feels the press feedback. This matches the established pattern on other dropdown menus (e.g., `JobPostingDetailPage`'s share menu).

3. **Skip dismiss overlay?** ✅ Correct. `fixed inset-0` with no visible content and `onClick` only — it's a transparent backdrop. Adding focus-visible would be dead CSS (non-focusable by default) and adding `active:scale` would be invisible.

4. **Fetched-but-unused fields?** ✅ `FriendshipRow.friend_id` is selected but never read in JSX. It's used implicitly in the `.or()` filter logic — the row's `user_id` field determines direction (`pending_outgoing` vs `pending_incoming`). `friend_id` is a structural artifact of the query. Not worth surfacing.

5. **Responsive?** ✅ Clean at all widths:
   - **375px:** Header row fits (Back icon + truncated username + More icon). Install banner `flex-col` stacks vertically. Action buttons `flex gap-2` with `flex-1` share space evenly. `max-w-md` (448px) centered column leaves ~13px padding each side.
   - **768px:** Same layout, more breathing room. Install banner `sm:flex-row` kicks in.
   - **1280px:** Centered card with generous whitespace. No issues.

## Verification

Run `npm run update` before marking done. The diff is 4 replace_all operations — zero logic changes, zero query changes.
