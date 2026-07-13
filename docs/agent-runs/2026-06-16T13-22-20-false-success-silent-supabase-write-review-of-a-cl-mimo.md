# MiMo run — 2026-06-16T13:22:20.462Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: False-success / silent-supabase-write review of a client-only Vite React+TS SPA (NO SSR). Focus ONLY on the FIXED copyApprovalLink in the snippet. A supabase update resolves with data,error even when the DB rejects (RLS/offline) and does NOT throw unless error is inspected. The fix destructures error from the update and throws if set, so a rejected token-save routes into the outer catch (toast e.message) instead of falling through to toast.success Approval link copied with a dead /estimate/:token customer link. (1) Does the throw fully close the false-success dead-link path while preserving the happy path (existing token then skip write then copy)? (2) Any NEW defect (transient-error regression, double-submit, stuck state)? (3) status sent is bundled with share_token in the same update; on the skip branch status is not re-set — real inconsistency or acceptable? Only report REAL defects; if clean, say clean. Do not invent SSR/hydration issues.
- files: /tmp/zivosmedia-copyapprovallink-35.tsx

---

## Review: `copyApprovalLink` fixed version

### (1) Plan

No code change needed. The fix is correct as-is. My review answers the three questions directly.

---

### (2) Analysis — all three questions

**Q1: Does the throw fully close the false-success dead-link path?**

**Yes.** Trace all three paths:

| Path | Token exists? | DB behavior | Outcome |
|---|---|---|---|
| Happy — already shared | truthy | no write attempted | URL built → `copyText` → `toast.success` ✓ |
| Happy — first share, write succeeds | null → UUID | `error: null` | throw skipped → URL built → `toast.success` ✓ |
| **Bug path — write rejected** | null → UUID | `error: truthy` | **`throw error`** → outer catch → `toast.error(e.message)` ✗ no dead link |

The throw sits exactly between the write and the URL-build, which is the single gap the original bug exploited. The `setStatus("sent")` (local state) and the `copyText` / `setShareLink` fallback all live *after* the throw, so they never execute on failure. The existing happy paths are untouched.

**Q2: Any new defect?**

**No new defect introduced by this fix.** Specifically:

- **Transient-error "regression":** a transient failure now surfaces `toast.error` instead of the previous false `toast.success` + dead link. That is *strictly more correct* — the user can retry. On retry, `select` re-reads `share_token: null` (the rejected write persisted nothing), generates a fresh UUID, and retries the update. No stuck state, no stale token.
- **Double-submit (pre-existing, not introduced):** two rapid clicks can both read `token: null`, generate different UUIDs, and both `update()` — whichever writes last wins, the first caller's URL becomes dead. This is real but **pre-existing** (the original bare write had the same race). A `saving` ref + `disabled={saving}` on the button is the standard fix, but it's a separate concern from this false-success patch.
- **0-row update match (pre-existing):** if `ensureSavedId()` returns an id for a row that was deleted between save and share, `.update().eq("id", id)` matches 0 rows → Supabase returns `{ data: null, error: null }` (not an error) → the UUID was never persisted → dead link proceeds. Again pre-existing, and `ensureSavedId()` is contractually supposed to guarantee the row exists. Not introduced by the fix.
- **No stuck state:** the function has no `saving` flag, so after the error toast the button is immediately re-clickable. `setStatus("sent")` is correctly *not* reached on the error path.
- **No `select` error swallowed:** the `select` destructures only `data`, not `error`. If the select itself fails, `data` is null → `token` is null → falls into the `!token` branch → tries the update → that will also fail if the network is down → caught. If the network recovered between select and update, the select's error was benign. Acceptable.

**Q3: `status: "sent"` not re-set on skip branch — real inconsistency?**

**Acceptable, not a defect.** Reasoning:

- `status: "sent"` is a one-time transition ("this estimate has been shared with a customer"). On the skip branch, the estimate was already shared — the status was already `"sent"` from the first share's write.
- The local `setStatus("sent")` *does* execute on the skip branch (it lives after the `if (!token)` block), keeping the UI in sync regardless.
- If someone externally changed the status back to `"draft"` between shares, not re-setting it on re-copy is arguably correct — the operator may have intentionally reset it, and blindly overwriting would lose that. The link itself still works (the token is already persisted).

---

### (3) Verdict

**The fix is clean.** It fully closes the false-success dead-link path without introducing any new defect. The double-submit concern and the 0-row-match edge case are both pre-existing and out of scope for this patch.

**If you want to harden further (separate PR, not blocking):**
- Add a `const saving = useRef(false)` + `disabled={saving.current}` guard on the button to close the double-submit race.
- Optionally destructure `{ error: selectError }` from the `select` and throw on it, for a cleaner failure when the DB is unreachable (currently falls through to the update, which fails with a less specific message).

No diff proposed — the code as shown is correct and ready to ship.
