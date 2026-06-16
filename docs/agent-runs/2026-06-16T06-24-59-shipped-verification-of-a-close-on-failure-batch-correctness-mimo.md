# MiMo advisor — Shipped-verification of a close-on-failure + batch-correctness fix to the BlackoutsCard inside CarRentalMaintenanceSection.tsx (car-rental vehicle blackout windows — date ranges that make a vehicle unavailable for booking). You previously flagged TWO P1 holes here; verify they are now fixed: (P1-a) the Block-dates dialog now blocks backdrop/Escape dismiss while saving via onOpenChange '(o)=>{ if(!o && saving) return; setOpen(o); }' and its Cancel button is disabled={saving}; (P1-b) save() now closes the dialog ONLY when EVERY selected vehicle was blocked — it collects failures into a 'failed' array, and on any failure keeps the dialog open, narrows selectedVehicleIds to just the failed vehicles (so a retry re-attempts only those), and shows an inline destructive banner with a count ('Blocked X of N … remaining couldn't be saved'). Also verify: (1) a 'submitted' flag is reset in openCreate and set true in save(), and the inline banner renders '{submitted && (failMsg || error)}' above DialogFooter; (2) the per-row delete button is now mobile-visible ('transition-opacity sm:opacity-0 sm:group-hover:opacity-100', previously 'opacity-0 group-hover:opacity-100' which is invisible on touch); (3) the hook useCarRentalBlackouts.remove() now returns Promise<boolean> (false after rollback) and create() already returns CarRentalBlackout|null with a 409-overlap branch. Report each PASS/FAIL with code evidence. Flag any remaining silent-failure / partial-batch / data-loss hole. Operational severity: a blackout that silently fails leaves a vehicle bookable when the operator believes it's blocked (double-booking risk).

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalMaintenanceSection.tsx

## Verification Report — `BlackoutsCard` close-on-failure + batch-correctness fix

---

### P1-a — Dialog dismiss guard while saving

**PASS.** Both guard points present:

```tsx
// L274 — backdrop/Escape guard
<Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; setOpen(o); }}>

// L337 — Cancel disabled
<Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
```

---

### P1-b — save() closes only on full success; narrows on partial failure

**PASS.** The loop, failure collection, conditional close, selection narrowing, and banner are all correct:

```tsx
// L286–309
const ids = Array.from(selectedVehicleIds);
const failed: string[] = [];
for (const vid of ids) {
  const created = await onCreate({ ... });
  if (!created) failed.push(vid);
}
if (failed.length === 0) { setOpen(false); return; }
setSelectedVehicleIds(new Set(failed));
setFailMsg(/* count-aware message */);
```

---

### (1) `submitted` flag lifecycle

**PASS.**

| Location | Code |
|---|---|
| `openCreate` reset | `setSubmitted(false)` + `setFailMsg(null)` |
| `save()` set | `setSubmitted(true)` + `setFailMsg(null)` (clears stale msg) |
| Banner render | `{submitted && (failMsg \|\| error) && (…)}` — between form and `DialogFooter` |

---

### (2) Mobile-visible per-row delete button (blackouts)

**PASS.**

```tsx
// L253 — blackout delete button
className="h-7 w-7 text-destructive transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
```

Base state (no breakpoint prefix) = fully visible on mobile; `sm:opacity-0` hides on ≥640px until hover. Correct fix vs the old `opacity-0 group-hover:opacity-100` pattern which was invisible on touch.

---

### (3) Hook return types (`create` → `CarRentalBlackout|null`, `remove` → `Promise<boolean>`)

**CONDITIONAL PASS — component-side usage is correct; hook file not provided for direct verification.**

Evidence from the component:
- `onCreate` result checked as `if (!created)` → expects falsy on failure (null). ✅
- `onDelete` called as `void onDelete(b.id)` — discards the boolean. The hook must surface failures via its `error` state for the top-of-card banner to catch them. This is weaker UX than the batch banner but functionally correct if the hook sets `error` on rollback.

---

### Remaining audit — silent-failure / partial-batch / data-loss holes

**P1 — No try/catch around the batch loop.**
If `onCreate` *throws* (network abort, unexpected Supabase error) instead of returning `null`, the `for` loop breaks mid-batch. Subsequent vehicles are never attempted, `save()` rejects unhandled, and `saving` (a hook-level flag) may never reset — leaving the dialog locked. The hook contract says `create()` returns `null` on failure, so this is safe **only if that contract holds for every error path**. A defensive wrapper is cheap insurance:

```tsx
// P1 fix — wrap each iteration
let created: CarRentalBlackout | null = null;
try { created = await onCreate({ ... }); } catch { /* swallow */ }
if (!created) failed.push(vid);
```

**P2 — Per-row blackout delete silently discards failure.**
`void onDelete(b.id)` ignores the `Promise<boolean>`. If the delete is rolled back (e.g., RLS denial), the row correctly stays in the list (data is fine), but the user sees zero feedback unless the hook independently sets its `error` state. Consider:

```tsx
// P2 fix — show inline toast or set local error
onClick={async () => { if (!(await onDelete(b.id))) {/* toast */} }}
```

**No other silent-failure or data-loss holes found.** The narrowing-to-failed-only UX, the overlap-aware 409 branch in `create()`, and the `failMsg` count banner together close the original double-booking-risk gap. The `saving` guard on both dialogs prevents backdrop-dismiss races. The code is otherwise solid.
