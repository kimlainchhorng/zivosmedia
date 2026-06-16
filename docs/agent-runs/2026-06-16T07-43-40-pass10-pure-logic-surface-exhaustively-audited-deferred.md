# zivosmedia pass 10 — deferred: pure-logic surface (money / payment-QR / geo / flight / tracking / calendar / phone) exhaustively audited; every lead fails the bar

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Status:** Deferred (no change applied). Baseline re-verified **green**:
`npm run build` = **BUILD EXIT 0** (vite build; dist/sw.js precache 18 entries, 2585.66 KiB).
**Advisor:** none reachable (DeepSeek key dead/401; MiMo runner unreliable on the
bloated AGENT_TASKS.md). Resolved by hand-verification — direct end-to-end reads
plus two Explore subagents whose claims I independently re-derived against the files
(one returned a **false positive**, rejected; one found nothing definitive).

## Why defer
The marathon bar: a **fresh-class** (≠ prior zivosmedia classes), **unambiguous**,
**reachable**, **real-impact** bug in a **clean** (non-peer) file that is **actually
imported/used**, **minimally + safely** fixable, and **gate-verifiable** — and which
I will not "fix" if doing so risks a regression. After a wide audit of the
pure-logic surface, no remaining lead clears it. zivosmedia is at a genuine
hardening plateau: 10 passes, extensive co-located `.test.ts` contracts, and active
peer-agent hardening have already closed the reachable defects.

## Surface audited this pass (all CLEAN per `git status --short`, all imported, all correct)

| Module | Importers | Verdict |
|---|---|---|
| `src/lib/khqr.ts` | 6 (real money: dynamic KHQR payment QR) | **Probed empirically.** CRC16-CCITT (poly 0x1021/init 0xFFFF) correct; TLV upsert + canonical reorder + merchant-tag preservation correct. Concern checked: `upsertNestedTlv` re-encodes only the *parsed* prefix of tag 62, so a non-TLV-clean merchant tag-62 could drop its tail — but a node probe shows the default merchant QR's tag 62 **round-trips cleanly** (`reenc === original`, dropped-tail = `""`). A custom merchant QR is operator-configured via `VITE_KHQR_STATIC_MERCHANT_QR` (env, not user input) → "operator-misconfig that degrades safely" class, already-rejected. |
| `src/lib/geohash.ts` | 2 | `encodeGeohash` (BASE32 alphabet, lng/lat bit-interleave, 5-bit chars) + `haversineMeters` (R=6371000) are textbook-correct. |
| `src/lib/flightLegGrouping.ts` | 2 | Verified the subtle one: line 42 `segs.slice(1).reduce((t,s,i)=>t+calcLayoverMinutes(segs[i],s),0)` — the sliced-array index `i` correctly pairs `segs[i]`↔`segs[i+1]` for each consecutive layover. Duration parse, split-at-turnaround, fingerprint grouping, cheapest-representative, `fromPrice=Math.min` all correct. |
| `src/lib/subidGenerator.ts` | 3 (affiliate revenue attribution) | `sanitize`, UTM URL/sessionStorage persistence, `appendSubIDToURL` (URL API + encoded manual fallback) all correct. `MAX_SUBID_LENGTH=100` is a **dead constant** (defined, never read) — not a bug; final subid is always the short `SS_…` session id. |
| `src/lib/buildICS.ts` | 3 pages + has `buildICS.test.ts` contract | RFC 5545 TEXT escaping (`\`→`\\`, CRLF/CR/LF→`\n`, `,`→`\,`, `;`→`\;`, backslash first) correct; UTC `formatICSDate` correct. See "closest lead" below. |
| `src/lib/phone.ts` | 3 | `normalizePhoneDigits` (NFKD + fullwidth ０-９ fold + `\D` strip) and `normalizePhoneE164` correct. `buildPhoneE164` naive dial+local concat — see rejected lead #2. |

Also re-confirmed correct from earlier this pass / prior sampling: `p2pTransfer.ts`
(pub/sub bus, no money math), `storeLink.ts`, `partnerDeepLinks.ts`
(URLSearchParams auto-encodes), `flightExports.ts` (**dead** — no importers,
excluded), and the tested money surface `admin/{pnlCalculations, expensesCalculations,
taxCalc}`, `currency.ts`, `cafe-currency.ts`, `tierFormat.ts`.

## Leads found and why each was rejected (none clears the bar)
1. **`buildICS.ts:42` runs `escapeText` (TEXT escaping) on the `URL` property** — per
   RFC 5545 §3.8.4.6 the `URL` value type is **URI**, which must not be TEXT-escaped;
   so a `,`/`;` in the URL would be written as `\,`/`\;` and could surface a literal
   backslash in the user's calendar link. *Rejected: not reachable.* All three call
   sites pass either no `url` (`TravelConfirmationPage`) or an `origin + "/path/" + id`
   URL with no comma/semicolon (`ReservationPage` → `/eats/restaurant/{id}`,
   `FlightConfirmation` → `window.location.href`). Hotel/restaurant **names** that do
   contain commas flow through `location`, where TEXT-escaping is **correct**
   (LOCATION is a TEXT property, §3.8.1.6). Latent spec-pedantry, not a live bug; a
   reviewer would correctly say "confirmation URLs don't contain commas." Also pinned
   by `buildICS.test.ts` — touching it risks churn for zero reachable benefit.
2. **`buildPhoneE164(dialCode, localNumber)`** naively concatenates `+{dial}{local}`,
   not stripping a national trunk `0` (e.g. dial `+855` + local `012…` → `+8550 12…`).
   *Rejected: ambiguous UI contract* — the calling form likely strips the trunk-0
   before passing `localNumber`; "fixing" it here could double-strip a legitimate
   leading digit. No test pins it; fails "unambiguous + no-regression."
3. **`StorePayrollSection.tsx:173`** unguarded `employees.reduce(…, employees[0])`
   (flagged by the first Explore agent as an empty-array crash). *Rejected: false
   positive* — `[].reduce(cb, seed)` returns `seed` **without** calling `cb`; the
   `highestPaid` result is never read (dead variable); the empty case is handled in
   the UI ("No active employees."). Independently re-derived and dismissed.
4. **`subidGenerator.ts` `MAX_SUBID_LENGTH`** defined-but-unused. *Rejected:* dead
   constant, not a defect; the emitted subid is always a short session id.

## Decision
Defer. The clean pure-logic surface is hardened by 10 prior passes and its co-located
contract tests. Every remaining lead is not-reachable, an ambiguous design choice
where a "fix" risks regression, a false positive, or a harmless dead binding.
Inventing a change to clear the rotation would violate the "real, unambiguous,
reachable bug / minimal + safe / no churn" discipline. Honest deferral with a
re-verified-green gate (BUILD EXIT 0) is the correct outcome.

## What would unblock a future zivosmedia pass
- A new pure module / store lands clean with novel logic (TLV/CRC, geo, fare math,
  date/tz bucketing, CSV/ICS encoding) carrying a fresh-class defect; **or**
- a `buildICS` caller starts passing a `url` that can contain `,`/`;` (e.g. a Google
  Maps `?q=lat,lng` link) — then the URL-vs-TEXT escaping split becomes a real,
  reachable broken-link fix rather than spec-pedantry; **or**
- the owner clarifies the `buildPhoneE164` trunk-0 contract (then a targeted strip
  becomes an intended fix, not a speculative regression).

## Notes
- No commit/push/deploy (owner deploys). No file changed this pass.
- Honest-deferral precedent: zivosmedia/ZIVO-CHAT/zivostravel pass 9; Zivo-Admin
  passes 8 & 9.
- Pass-10 rotation begins here: **zivosmedia ⏸ (this doc, deferred)** → next is
  ZIVO-CHAT pass 10 (gate `npm run build`).
