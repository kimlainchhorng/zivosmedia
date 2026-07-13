# MiMo run — 2026-06-16T09:23:40.152Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review a silent-write-failure fix in 3 React + react-query + Supabase social pages (client-only Vite SPA, no SSR). BUG: toggle mutations called supabase.from(t).delete().eq().eq() WITHOUT reading the returned {error}, and the useMutation had no onError — so a failed leave/un-RSVP/join still fired onSuccess and showed a success toast (false success). FIX applied: (1) every delete path now does 'const {error}=await ...delete()...; if(error) throw error;' symmetric with the existing insert paths; (2) added onError:(e)=>toast.error(e?.message ?? fallback) to joinMutation/rsvpMutation/createCommunity/createEvent; (3) an inline onClick post-delete now checks {error} and toast.error+return before the success toast — matching the file's own already-correct handlePost. Is this correct and complete for react-query? Any real issue? Note: .delete() matching 0 rows returns no error so double-clicks won't spam false errors — confirm. Be concise; ignore SSR/hydration.

---

## Review: Silent-write-failure fix (react-query + Supabase delete paths)

### 1. Short plan

I need the 3 file paths to verify the exact wiring, but the **pattern described is correct** for react-query v4/v5. Here's the substantive review of each fix piece:

---

### 2. Pattern assessment (before → after, abstract)

**Before (broken):**
```ts
// .delete() — error silently ignored
await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', targetId);
onSuccess: () => toast.success("Unfollowed")   // fires even on failure
```

**After (fixed — 3 patterns):**

**Pattern A — mutationFn wrapper (most correct):**
```ts
const unfollowMutation = useMutation({
  mutationFn: async (targetId: string) => {
    const { error } = await supabase.from('follows').delete()
      .eq('follower_id', uid).eq('following_id', targetId);
    if (error) throw error;              // ← react-query catches → onError
  },
  onSuccess: () => { toast.success("Unfollowed"); queryClient.invalidateQueries(...) },
  onError: (e) => toast.error(e?.message ?? "Failed to unfollow"),
});
```

**Pattern B — inline onClick (non-mutation path):**
```ts
const { error } = await supabase.from('event_rsvps').delete()
  .eq('user_id', uid).eq('event_id', id);
if (error) { toast.error(error.message ?? "Failed"); return; }
toast.success("Left event");
```

Both are correct. The key invariant: **a Supabase `.delete()` returning `{ error }` means PostgREST returned a non-2xx status, not that zero rows matched.** Confirmed: `.delete()` matching 0 rows returns `{ data: [], error: null }` — so idempotent double-clicks are safe, no false error spam.

---

### 3. Three real issues to verify (none blockers if already handled)

| # | Issue | Severity | What to check |
|---|-------|----------|---------------|
| **A** | **Double toast on error** | Medium | If the `mutationFn` is wrapped in a component-level `try/catch` that ALSO shows `toast.error`, the user sees two error toasts (the catch one + `onError`). Verify no surrounding `try/catch` re-toasts. |
| **B** | **Missing optimistic rollback** | High if applies | If any of these mutations use `onMutate` to optimistically update the query cache (e.g. instantly removing the user from a member list), the new `onError` **must** also call `context.previous` to roll back the cache. Currently `onError` only toasts — if there's no `onMutate` that's fine, but if there is one, you'll get a UI that shows the old state after the error toast. |
| **C** | **`e?.message` is safe but narrow** | Low | Supabase `PostgrestError` has `.message`. Network errors (fetch failure) are plain `Error` objects which also have `.message`. The `??` fallback covers the `undefined` case. **One gap:** if a mutation function wraps the Supabase call in a way that throws a non-Error value (e.g. `throw "string"`), `e?.message` is `undefined` and the fallback fires — acceptable. Just confirm no `throw "string"` patterns exist. |

---

### 4. What the owner must verify / deploy

1. **Run the gate:** `npm run update` — must pass (type-check + worker + build).
2. **Spot-check for double toasts:** trigger a forced failure (e.g. revoke RLS permission on a test row, or temporarily corrupt the table name in dev) → verify exactly ONE error toast, not two.
3. **If optimistic updates exist** in any of the 3 hooks, add cache rollback in `onError`:
   ```ts
   onError: (e, vars, context) => {
     if (context?.previous) queryClient.setQueryData(cacheKey, context.previous);
     toast.error(e?.message ?? "Failed");
   },
   ```
4. **`.delete()` zero-row = no error** is confirmed correct — no special handling needed for double-taps.
5. **No file paths provided** — I need them to verify the exact wiring (whether `onMutate`/`onSettled` trios are complete, whether surrounding `try/catch` duplicates the toast). Share the 3 paths and I'll do a line-level review.
