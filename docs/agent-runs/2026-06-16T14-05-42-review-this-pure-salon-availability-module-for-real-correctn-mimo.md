# MiMo advisor — Review this pure salon availability module for real correctness bugs — slot generation, overlap/conflict detection, timezone or off-by-one errors, boundary conditions (slot landing exactly on closing time, zero-length or negative durations, DST). Report P0/P1/P2 only with concrete repro inputs.

Files: src/lib/salon/availability.ts

## Review: `computeOpenSlots`

### P1 — Infinite loop on `slotMinutes ≤ 0`
**Repro:** `computeOpenSlots({ ..., slotMinutes: 0, durationMinutes: 30 })` — the loop `t += 0` never advances; hangs the thread.
**Fix:** Add `if (slotMinutes <= 0) return [];` at the top, next to the `durationMinutes` guard.

---

### P1 — `earliestStart` defaults to epoch, not "now" for today's date
**Repro:** Call with `date = "2025-07-15"` (today), omit `earliestStart`. Past morning slots are returned despite the JSDoc promising *"Defaults to 'now' if date is today."*
**Fix:**
```ts
const minStart = earliestStart
  ? earliestStart.getTime()
  : (date === new Date().toISOString().slice(0, 10)
      ? Date.now()
      : 0);
```

---

### P1 — Timezone ambiguity: schedule parsed in local time, returned as UTC ISO
**Repro:** Salon in `America/New_York`, schedule says `09:00–17:00`. Slots returned as `"…T14:00:00.000Z"` instead of `"…T09:00:00-05:00"`. If the consumer formats/compares naively, every slot is 5 hours off.
**Fix:** Either accept a `timeZone` IANA string and use `Temporal` / manual offset math, or return epoch-ms / offset-aware ISO strings so the caller isn't silently handed UTC.

---

### P1 — `new Date(…T00:00:00)` has no timezone anchor; wrong day in SSR / Edge
**Repro:** User is in `Asia/Kolkata` (UTC+5:30). Edge worker runs in UTC. `new Date("2025-07-15T00:00:00")` resolves to midnight **UTC**, which is `05:30` the next day IST. `getDay()` returns the wrong day, so the wrong `ScheduleRow` is matched (or none).
**Fix:** Pass a `timeZone` string and use `toLocaleString` / `Intl.DateTimeFormat` to derive the local midnight, or accept an explicit `day_of_week` from the caller.

---

### P1 — `day_of_week` convention assumed but undocumented
`Date.getDay()` is Sun=0…Sat=6. If the backend stores ISO 8601 (Mon=1…Sun=7), every slot for Sunday or weekday boundaries is mis-mapped.
**Fix:** Document the required convention in the `ScheduleRow` interface, or accept the ISO day directly.

---

### P2 — DST spring-forward: `setHours` on window boundary can silently shift
**Repro:** `date = "2025-03-09"` (US spring-forward), `start_time = "02:00"`. `setHours(2,0)` lands in the gap; JS resolves it to `03:00`. The window is silently shortened by an hour with no error.
**Fix:** Detect the offset shift (`windowStart.getHours() !== sh`) and either warn or adjust.

---

### Summary

| Severity | Count |
|----------|-------|
| P0       | 0     |
| P1       | 5     |
| P2       | 1     |

The overlap check and boundary condition (`<= windowEnd`) are **correct**. The core loop logic is sound — the issues are all in input validation and timezone contracts. Fix the five P1s before shipping.
