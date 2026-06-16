# MiMo advisor — Shipped-verification of a close-on-failure fix in the car-rental Rates section (inline per-cell rate editor — daily/weekly/monthly rates, mileage limit, extra-mile, security deposit; financial config). It's backed by useCarRentalVehicles.update which returns Promise<boolean> and rolls back its optimistic change on failure (setVehicles(prev) / await load), surfacing the message in the card-level error banner. The defect fixed: commitEdit() previously called 'await update(...)' then UNCONDITIONALLY setEditingCell(null), so a failed rate write discarded the operator's typed value and closed the inline editor (the rolled-back cell showed the old value with only the top banner explaining). New code: 'if (!editingCell || saving) return;' at entry (guards Enter double-submit) and 'const ok = await update(...); if (ok) setEditingCell(null);' so on failure the editor stays open with the typed value and the operator can retry (Enter) or cancel (Esc/X). CONFIRM: no path where a failed rate write silently closes the editor or loses the typed value, no double-submit hole on Enter, money math (dollars↔cents, mileage null) intact. Report ONLY real bugs P0/P1/P2 with one-line fixes. If solid, say so.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalRatesSection.tsx

## Findings

**P0 — Null mileage displays as "0" instead of "Unlimited"**
`RateCell` line: `const current = v[field] ?? 0` coerces `null` mileage to `0` *before* the formatter runs, so the `c === null` check in the formatter is unreachable. Any null `mileage_limit_per_day` renders as `"0"` and a no-op Enter press would overwrite it with `0` (data corruption).
**Fix:** Change to `const current = v[field]` and handle null/undefined in the fallback display branch (`current == null || current === 0 ? (placeholderEmpty ?? "—") : ...`).

**P1 — Race: switching cells mid-flight clears the wrong editor**
`commitEdit` calls `setEditingCell(null)` on success using the *latest* state, not the state captured when the save began. If the operator starts editing Vehicle B while Vehicle A's save is in-flight, A's success callback nukes B's editor and draft.
**Fix:** Capture `const snapshot = editingCell` before `await` and guard the clear: `if (ok && editingCell?.id === snapshot.id && editingCell?.field === snapshot.field) setEditingCell(null)`.

---

Everything else is solid: double-submit guard (`!editingCell || saving`) is correct, Esc/cancel path preserves draft, `draftValue === ""` correctly round-trips to `null` for mileage, cents↔dollars math is correct for all monetary fields, and the close-on-failure fix (`if (ok) setEditingCell(null)`) is properly wired.
