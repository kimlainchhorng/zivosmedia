# MiMo advisor — Re-verification of two bug fixes in the car-rental Rates inline cell editor. A prior review flagged: (P0) 'const current = v[field] ?? 0' coerced null mileage_limit_per_day (= unlimited) to 0 before the 'Unlimited' formatter, so unlimited mileage rendered as '0' and a no-op Enter overwrote null with 0 (data corruption); (P1) a race where starting to edit cell B while cell A's save is in-flight let A's success setEditingCell(null) close B's editor. APPLIED FIXES: (1) startEdit now does 'if (saving) return;' at entry (blocks opening a new cell mid-save, closing the race) and uses 'const current = v[field]' with mileage pre-fill 'current == null ? "" : String(current)' (null → blank input, so committing empty round-trips back to null/unlimited, not 0). (2) RateCell display now 'const current = v[field]' + 'formatter((current ?? null))' + non-formatter branch 'current == null || current === 0 ? placeholderEmpty'. CONFIRM both resolved: unlimited mileage now displays 'Unlimited' and cannot be silently turned into 0; the editor-nuke race is closed; money math (dollars↔cents) and the existing close-on-failure 'if (ok) setEditingCell(null)' are intact. Report ONLY real remaining bugs P0/P1/P2 with one-line fixes. If solid, say so.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalRatesSection.tsx

Both fixes verified correct and well-implemented:

- **Unlimited mileage**: `null → ""` on open, `"" → null` on commit, display via `c === null ? "Unlimited"` — round-trip is clean, no data corruption.
- **Race guard**: `if (saving) return` at `startEdit` entry + `if (!editingCell || saving) return` at `commitEdit` entry — editor-nuke path closed.
- **Money math**: cents↔dollars conversions intact, `extra_mile_cents` keeps `.toFixed(2)` sub-dollar precision, failure path keeps editor open.

**No remaining real bugs.** The code is solid.
