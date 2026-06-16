# zivosmedia pass 6 — `flightExports.ts` CSV escaper omits CR/LF, so a multi-line `ticketing_error` breaks RFC-4180 row structure (reconciliation export corruption)

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** CSV field-escaping correctness (RFC 4180) — the local `objectsToCSV`
helper quotes a field only when it contains a comma or a double-quote, but NOT
when it contains CR/LF. A field value with an embedded newline and no comma/quote
is therefore emitted **unquoted**, injecting a literal line break that a CSV
parser reads as a premature row terminator — splitting one record into two and
misaligning every column after it. Distinct from this repo's pass-2
(untrusted-redirect/host-validation), pass-3 (effect-cleanup/Promise.all
atomicity), pass-4, and pass-5 (chunk-reload shared-key mismatch) — this is a
pure data-integrity bug in a CSV exporter.
**Status:** Done. Gate green: `npm run update` (type-check + type-check:worker +
build) exit 0 after the change; baseline type-check was clean before. One file
changed (`src/lib/flightExports.ts`, +6/-1).
**Advisors:** DeepSeek (MCP, deepseek-reasoner) independently confirmed against
the inlined code + the two house-standard escapers: (a) the un-quoted newline is
a real RFC-4180 row-corruption bug; (b) mirroring the closest sibling escaper's
predicate (`/[",\r\n]/`) is correct and minimal with no remaining *correctness*
gap (the separate formula-injection concern is out of scope here); (c) the new
predicate is strictly better than the old one — it also catches a lone `\r`
(old-Mac style) that even the other house escaper misses, with no regression for
numeric/object values (they skip the string branch).

## Baseline
`npm run type-check` = clean (no TS errors) before any change; `npm run update` =
exit 0 after. zivosmedia has heavy concurrent peer-agent activity this pass (~93
peer-modified tracked files, incl. AGENT_TASKS.md, the car-rental / autorepair /
salon / cafe admin component clusters + hooks, and `src/lib/{authRedirect,
crossDomainSSO,lazyRetry,nativeDeepLinks,software/softwareCheckout,urlSafety}`).
Deliberately avoided every peer-touched file; `src/lib/flightExports.ts` is
non-peer and was clean before this change.

## Scan — verified clean / deliberately NOT churned
Read a wide non-peer lib surface this pass; uniformly polished, left alone:
- `payouts/payoutRails.ts` — pure rail-availability lookup tables +
  `normalizeCountry`. Correct.
- `security/fileUploadSecurity.ts` — path-sequence block, extension denylist,
  MIME + magic-byte sniffing, size/zero-byte checks. Correct (defense-in-depth).
- `security/searchProtection.ts` — client-side sliding-window soft limiter.
  Correct.
- `social/storeShareCard.ts` — canvas (not HTML) share-card builder; best-effort
  share→clipboard→download fallback chain with AbortError handling. Correct.
- `social/{formatCount,hashtags,mentionText}.ts`, `store/storeHours.ts`,
  `verification.ts`, `affiliateTracking.ts`, `zivoDomainSummary.ts`,
  `conciergePlanner.ts` (all deep-links `encodeURIComponent`-escaped),
  `phone.ts`, `cafe-currency.ts`, `p2pTransfer.ts` — correct.
- `bookingReturnHandler.ts` — explicit stub. Correct.
- The two **house-standard** CSV modules both quote CR/LF and were the reference
  for the fix: `admin/webhookEventsCsv.ts` (`/[",\r\n]/`) and
  `performanceCsvExport.ts` (`includes("\n")` + formula-injection guard).

## Finding — `objectsToCSV` quotes on `,`/`"` but not on CR/LF
`src/lib/flightExports.ts` defines a local `objectsToCSV` used by three exporters,
including `exportFailedTransactionsCSV` ("Export failed transactions for
reconciliation"), whose `error` column is populated from `ticketing_error` — a
free-text error string from the upstream airline/Duffel API that can contain
commas **and** newlines. The cell rule was:
```ts
if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
  return `"${value.replace(/"/g, '""')}"`;
}
return String(value);
```
A value like `"Payment declined\nRetry later"` has no comma/quote, so it fell
through to `String(value)` **unquoted**, emitting a raw `\n` mid-row. RFC 4180
requires fields containing CR, LF, comma, or double-quote to be wrapped in
double-quotes. Node repro of before-vs-after (6/6 as expected):
```
"Payment declined\nRetry later" => before: RAW NEWLINE (breaks CSV) | after: quoted
"line1\r\nline2"                => before: RAW NEWLINE (breaks CSV) | after: quoted
"lone\rcr"                      => before: RAW (breaks CSV)         | after: quoted
"card_declined"                 => unchanged (both)
"amount, currency mismatch"     => quoted (both)
'He said "no"'                  => quoted + inner-doubled (both)
```

## Fix (minimal, additive — net +6/-1)
Broaden the quoting predicate to the RFC-4180 set, mirroring the closest sibling
escaper (`admin/webhookEventsCsv.ts`, which also has a free-text `error_message`
column):
```ts
if (typeof value === 'string' && /[",\r\n]/.test(value)) {
  return `"${value.replace(/"/g, '""')}"`;
}
```
Added a 5-line comment recording the RFC-4180 rule and why CR/LF matters for the
`error` column, so the predicate isn't "tidied" back to just `,`/`"`. The
inner-quote doubling, the non-string `String(value)` path, and the `null/undefined
→ ''` path are all unchanged.

## Live-consumer caveat (transparent)
- The three exporters (`exportBookingsCSV`, `exportRevenueReportCSV`,
  `exportFailedTransactionsCSV`) currently have **no importer in `src/`** — so the
  fixed helper is presently dead code. It was still worth fixing: it is a real,
  minimal, additive, fresh-class correction in a complete, structured exporter
  module clearly intended for the flight-admin reconciliation flow, and it
  removes a latent row-corruption bug the moment the "export failed transactions"
  action is wired to a button. (Same judgment as the zivosoftware pass-5
  `expensesCalculations.ts` dead-consumer fix.)
- **Scope note (considered, deferred):** the other house escaper
  (`performanceCsvExport.ts`) also adds a CSV formula-injection guard
  (CWE-1236, leading `'` on `^[=+\-@\t\r]`). The closest sibling
  (`webhookEventsCsv.ts`, same external `error` column shape) does **not**, and
  `flightExports` carries airline/Duffel-API text rather than
  merchant-controlled free-text, so I kept this fix to the unambiguous RFC-4180
  *correctness* bug only. A formula-injection guard could be a separate
  defense-in-depth pass.

## Files changed
- `src/lib/flightExports.ts` — `objectsToCSV` now quotes fields containing CR/LF
  (not only `,`/`"`) so a multi-line `ticketing_error` can't break CSV row
  structure (+6/-1).

## Verification
- `npm run update` = exit 0 (type-check + type-check:worker + build) after the
  change; baseline `npm run type-check` clean before.
- Node before/after matrix = 6/6 as expected (newline / CRLF / lone-CR now
  quoted; comma / quote / plain unchanged).
- `git status --short` shows `src/lib/flightExports.ts` as the only file I
  changed; the ~93-file peer cluster is concurrent peer-agent work — not touched.

## Notes
- No commit/push/deploy (owner deploys). Local change only.
