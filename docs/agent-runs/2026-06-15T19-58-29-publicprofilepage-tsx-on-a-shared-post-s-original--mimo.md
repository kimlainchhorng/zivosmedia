# MiMo run — 2026-06-15T19:58:29.689Z

- model: mimo-v2.5-pro
- api_format: openai
- task: PublicProfilePage.tsx: on a shared post's original-author header a <button>Follow</button> (line ~1411) onClick only navigate('/user/'+post.sharedOrigin.userId) (line ~1407) — opens that user's profile, does NOT follow. The page HAS followMutation (~561-583) but it's unused here and this button has NO is-following state (always 'Follow'). PROPOSED: relabel to 'View profile' so the control matches behavior (honest, zero-risk). Alternative: wire followMutation (needs is-following awareness the page lacks = feature, not bug fix). Q1: relabel right, or wire follow? Q2: any risk in relabel? Concise verdict + one-line reason.

---

## Verdict

**Q1: Relabel.** The button's `onClick` navigates to the profile — it never calls `followMutation`. Changing the label to match the actual behavior is the correct zero-risk fix. Wiring follow would be a feature addition (needs is-following state, optimistic UI, etc.) — separate task.

**Q2: No risk.** It's a single string change on a visible label. No logic, no state, no API call changes.

---

## Plan

1. In `src/pages/PublicProfilePage.tsx`, find the `<button>` on the shared-post original-author header (~line 1411) that says `"Follow"` but only navigates.
2. Change the button text from `"Follow"` to `"View profile"`.
3. Run `npm run update` to verify.

---

## Diff

**File:** `src/pages/PublicProfilePage.tsx`

```diff
--- a/src/pages/PublicProfilePage.tsx
+++ b/src/pages/PublicProfilePage.tsx
@@ -1408,7 +1408,7 @@
           <button
             onClick={() => navigate('/user/' + post.sharedOrigin.userId)}
-            className="..."
+            className="..."
           >
-            Follow
+            View profile
           </button>
```

**Before:**
```tsx
<button
  onClick={() => navigate('/user/' + post.sharedOrigin.userId)}
  className="text-xs font-semibold text-primary hover:underline"
>
  Follow
</button>
```

**After:**
```tsx
<button
  onClick={() => navigate('/user/' + post.sharedOrigin.userId)}
  className="text-xs font-semibold text-primary hover:underline"
>
  View profile
</button>
```

That's the entire change — one string, `"Follow"` → `"View profile"`. Zero logic touched.

---

## Owner verification

- **Run `npm run update`** — must pass (types + build).
- **Visual check:** open a post that has a `sharedOrigin` (a reshared post). The author header should now read "View profile" instead of "Follow". Clicking it should navigate to that user's profile (same as before).
- **Follow-up (flagged, not this change):** if "Follow" functionality is desired on shared-post headers, that's a feature — wire `followMutation`, add is-following awareness, and handle the optimistic toggle. Separate task.
