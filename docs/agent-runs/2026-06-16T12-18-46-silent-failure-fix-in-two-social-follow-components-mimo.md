# MiMo run — 2026-06-16T12:18:46.888Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Silent-failure fix in two social 'Follow' components. CONTEXT: the repo's correct reference is TrendingCreators.handleFollow which does supabase.from('user_followers').insert({...}).throwOnError() inside try/catch with optimistic rollback + toast.error. A Supabase insert/delete RESOLVES even when the DB rejects (RLS/duplicate/offline), so awaiting WITHOUT throwOnError() or an {error} check fakes success. MY CHANGES: (1) FollowSuggestions.followUser — wrapped the user_followers insert in try/catch + added .throwOnError(); on failure it toasts error and early-returns WITHOUT dismissing the card (so retry is possible) and WITHOUT the false 'Following!' toast. (2) FeaturedCreatorsRow.handleFollow already had a pending-guard + optimistic update + catch-with-rollback, but its insert/delete were error-blind; I added .throwOnError() to BOTH so the existing catch actually fires on DB rejection. Confirm: (a) the silent-failure was real; (b) my .throwOnError() additions correctly route DB rejections into the existing/new catch (rollback + toast.error); (c) no NEW bug (double-toast, lost optimistic state, type error); (d) anything else genuinely broken in these two handlers. Client-only Vite SPA, no SSR. Flag ONLY real defects.
- files: src/components/social/FollowSuggestions.tsx, src/components/social/FeaturedCreatorsRow.tsx

---

## Review verdict

### (a) ✅ Silent-failure was real

Both handlers called `.insert()` / `.delete()` without `.throwOnError()` or an `{ error }` destructure. Supabase resolves the promise even when the DB rejects (RLS deny, unique-violation, network), so the old code treated every failure as success — false "Following!" toast, card dismissal, optimistic state kept.

### (b) ✅ `.throwOnError()` additions are correct

**`FollowSuggestions.followUser`** — single-path insert, now throws into the new `catch` → `toast.error` + `return` (early-exit keeps the card visible for retry, skips the false success toast and the push notification). Clean.

**`FeaturedCreatorsRow.handleFollow`** — both the `insert` and `delete` branches now throw into the *existing* `catch` that already did symmetric rollback + `toast.error`. The `finally` still clears `pending`. Clean — this is the TrendingCreators reference shape.

### (c) ✅ No new bugs

| Check | FollowSuggestions | FeaturedCreatorsRow |
|-------|------------------|-------------------|
| Double-toast | No — one toast per path (`catch` OR post-`try`) | No — `catch` fires toast; success path is silent (no success toast, intentional) |
| Lost optimistic state | N/A — no optimistic UI (card dismissed only on success) | No — `catch` rolls back `followingIds` symmetrically |
| Type error | `(supabase as any).from(…).insert(…).throwOnError()` — `.throwOnError()` is a runtime `PostgrestFilterBuilder` method; `as any` bypasses the generated types but the chain is valid at runtime | Same |
| Pending guard | N/A (see note below) | ✅ `if (pending.has(creatorId)) return` |

### (d) One pre-existing ergonomic gap (not introduced by this fix)

`FollowSuggestions.followUser` has **no double-submit guard** — no `pending`/`saving` state. A rapid double-click fires two inserts; the second hits the unique constraint and throws, showing a misleading "Couldn't follow — please try again" toast after the first already succeeded and dismissed the card. `FeaturedCreatorsRow` already handles this correctly with its `pending` Set.

**Suggested follow-up (separate PR, not blocking):**

```tsx
// FollowSuggestions.tsx — add alongside existing state
const [pending, setPending] = useState<string[]>([]);

// In followUser, guard at top:
if (pending.includes(targetId)) return;
setPending((p) => [...p, targetId]);

// In finally (or after catch + after success):
setPending((p) => p.filter((id) => id !== targetId));

// On the Follow button:
disabled={pending.includes(s.id)}
```

This is a polish item, not a correctness defect — the worst outcome of the double-click today is a spurious error toast after the card has already disappeared, which is cosmetic rather than data-corrupting.

---

**Everything else in both handlers is clean.** No real defects remain. The changes are ready to verify with `npm run update`.
