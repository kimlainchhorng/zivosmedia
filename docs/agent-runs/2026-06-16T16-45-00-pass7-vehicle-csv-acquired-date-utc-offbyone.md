# zivosmedia pass 7 — vehicle-import CSV `acquired_at` parses non-ISO dates a day early in UTC+7 (Cambodia)

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** Local-vs-UTC calendar-date correctness in a CSV value parser. Fresh
class for this repo: prior zivosmedia passes were autorepair print/QR XSS,
postMessage credential-origin hardening, backslash open-redirect, checkout-redirect
host-validation, customer-location-broadcast residue, chunk-reload shared-key
format, and (pass 6) flightexports CSV newline escaping — a CSV *output* escaping
fix. This is a CSV *input* date-parse timezone bug, a distinct class.
**Status:** Done. Gate green: `npm run build` (`vite build`, this repo runs no tsc
in build) exit 0 after the change. One file changed
(`src/lib/car-dealership/parseVehicleCsv.ts`, +15/-3).
**Advisor:** DeepSeek (MCP, deepseek-reasoner), code inlined. Confirmed (a) the
original is a real UTC+7 off-by-one for non-ISO inputs ("5/15/2023" → "2023-05-14");
(b) caught a regression in my first draft — naive local-component formatting would
change the result for ISO **datetime** strings carrying an explicit zone
(`2023-05-15T23:00:00Z`), whose correct calendar date is the UTC one. Final fix
routes by whether the string carries a zone, which I additionally tightened over
DeepSeek's draft (anchored the zone test to the string end so day-name formats
can't false-match, and treat *zone-less* ISO datetimes as local too — a subcase
DeepSeek's `/^\d{4}-\d{2}-\d{2}T/` branch would have mis-routed to UTC).

## Baseline
`npm run build` = exit 0 before any change. Very heavy peer-agent activity this
pass: `git status --short` shows 58 modified tracked files (essentially all of
car-rental + autorepair sections/hooks, plus `src/lib/{authRedirect,crossDomainSSO,
flightExports,lazyRetry,nativeDeepLinks,urlSafety,software/softwareCheckout}.ts`,
`src/App.tsx`, many pages) and ~30 new agent-run docs + untracked
`src/lib/escapeHtml.ts`. `src/lib/car-dealership/parseVehicleCsv.ts` was clean
(non-peer); deliberately avoided every peer-touched file.

## Finding — `parseDate` drops a day for non-ISO inputs east of UTC
`validateRow` parses the `acquired_at` cell of an imported dealer-inventory row
through `parseDate`, and the result is persisted as the vehicle's acquisition
calendar date. Original:
```ts
const parseDate = (s: string): string | null => {
  if (!s.trim()) return null;
  const d = new Date(s.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};
```
JS `Date` parsing splits on format: an **ISO date-only** string
(`"2023-05-15"`) parses as **UTC midnight**, but a **non-ISO** string
(`"5/15/2023"`, `"May 15 2023"` — what Excel and humans typically produce) parses
as **local midnight**. For a user in `Asia/Phnom_Penh` (UTC+7, no DST):
`new Date("5/15/2023")` = `2023-05-15T00:00:00+07:00` = `2023-05-14T17:00:00Z`, so
`toISOString().slice(0,10)` → **`"2023-05-14"`** — one day early. (ISO date-only
inputs happen to round-trip correctly because they were already UTC.)

Reachability: `CarDealershipVehicleImportDialog.tsx` imports `{ parseCsv,
autoMapColumns, validateRow }` from this module for the real inventory-import flow,
so the wrong date is persisted on import.

## Fix (minimal — route by whether the string carries a zone)
```ts
const parseDate = (s: string): string | null => {
  const t = s.trim();
  if (!t) return null;
  // ISO date-only: return verbatim (UTC-midnight round-trip would shift west of UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  // Zoned timestamp (…Z or …+07:00) is an absolute instant — keep its UTC date.
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(t)) return d.toISOString().slice(0, 10);
  // Else parses in LOCAL time; format from local components so the day matches input.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
```
Mirrors the in-repo precedent `formatLocalDay()` in
`src/lib/analytics/dateBuckets.ts` (local-component `YYYY-MM-DD` formatting).

## Verification (case matrix, UTC+7)
- `""` / `"abc"` → `null` (unchanged).
- ISO date-only `"2023-05-15"` → `"2023-05-15"` verbatim — correct in every tz, no
  Date round-trip.
- Non-ISO `"5/15/2023"`, `"May 15 2023"` → local components → `"2023-05-15"`
  (**fixed**; was `"2023-05-14"`).
- `"15/05/2023"` (D/M/Y) → `new Date` Invalid → `null` (unchanged; D/M/Y vs M/D/Y
  disambiguation is intentionally out of scope).
- Zoned ISO datetime `"2023-05-15T23:00:00Z"` → UTC date `"2023-05-15"` (unchanged
  vs original — the regression DeepSeek flagged, avoided).
- Zone-less ISO datetime `"2023-05-15T06:00:00"` (parses local) → local components
  `"2023-05-15"` (correct; original/`toISOString` would have shifted it to
  `"2023-05-14"` in UTC+7).
- `npm run build` exit 0; `git status --short src/lib/car-dealership/` shows only
  `parseVehicleCsv.ts` (+15/-3).

## Deliberately NOT changed (scope discipline)
- **`new Date()` reliance for non-ISO parsing.** Kept — a full date-format
  detector (M/D/Y vs D/M/Y) is a much larger change and ambiguous by nature; the
  fix only corrects the tz handling of whatever `new Date()` already accepts.
- **`parseInt0` keeping a stray `-`, `parseDollarsToCents` `parseFloat` leniency.**
  Low-impact input-leniency quirks, separate from the date bug.
- **`src/lib/phone.ts` `buildPhoneE164` keeps the national trunk `0`** (Cambodian
  "012…" → "+855012…", invalid E.164). Real and higher-impact (auth/OTP path), but
  a correct fix is genuinely country-specific (Italy *retains* the leading 0; a
  naive strip regresses it) and really wants libphonenumber — too large/risky for a
  minimal pass. Recorded here as the leading candidate for a future, dedicated pass.
- All 58 peer-modified files + untracked peer additions.

## Notes
- No commit/push/deploy (owner deploys). Local change only.
- Audited and left correct this pass (non-peer, no real defect): `social/formatCount.ts`
  (band-boundary rounding acceptable), `currency.ts` (documented EU/US parse
  ambiguity), `tierFormat.ts`, `analytics/dateBuckets.ts` (local-tz consistent),
  `lodging/reservationTime.ts`, `cafe-currency.ts` (negatives group fine),
  `car-rental/money.ts`, `chat/dateLabels.ts` (DST-robust via `Math.round`),
  `phoneHash.ts`, `admin/taxCalc.ts` (cent-aligned `Math.round(preTax*rate)/100`).
- Pass-7 rotation start; next is ZIVO-CHAT.
