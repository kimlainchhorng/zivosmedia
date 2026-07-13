# DeepSeek run — 2026-06-15T19:58:03.765Z

- model: deepseek-chat
- task: PublicProfilePage.tsx: on a shared post's original-author header there's a <button>Follow</button> (line ~1411) whose onClick only does navigate('/user/'+post.sharedOrigin.userId) (line ~1407) — it opens that user's profile, it does NOT follow. The page HAS a real followMutation (lines ~561-583) but it's not used here, and this button has NO is-following state (always shows 'Follow'). PROPOSED FIX: relabel the button to 'View profile' so the control matches its behavior (honest, zero-risk). Alternative: wire it to followMutation, but that needs is-following awareness for an arbitrary user the page doesn't currently track. Q1: is relabel to 'View profile' the right clean fix, or should I wire the follow? Q2: any risk in the relabel? Be concise, verdict + one-line reason.

---

## Verdict

**Relabel to "View profile"** — the clean, honest, zero-risk fix. Wiring follow would require adding `isFollowing` state + follow/unfollow toggle for an arbitrary user the page doesn't currently track, which is a feature addition, not a bug fix.

## Plan

1. Change the button text from `"Follow"` to `"View profile"` in `src/pages/PublicProfilePage.tsx` at line ~1411.
2. That's it — no logic changes, no new state, no risk.

## Diff

```diff
--- a/src/pages/PublicProfilePage.tsx
+++ b/src/pages/PublicProfilePage.tsx
@@ -1408,7 +1408,7 @@ function PublicProfilePage() {
               onClick={() => navigate('/user/' + post.sharedOrigin.userId)}
               className="..."
             >
-              Follow
+              View profile
             </button>
```

## Owner verification

- **Nothing to deploy** — this is a text-only change in a single file. Run `npm run update` to confirm type-check + build pass, then commit.
