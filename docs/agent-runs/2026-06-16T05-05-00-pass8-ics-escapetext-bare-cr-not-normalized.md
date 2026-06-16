# zivosmedia pass 8 — the .ics `escapeText` escapes LF but not CR, so a "\r\n" in a title/note/merchant name leaves a bare carriage-return control char that corrupts the downloaded calendar event

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** iCalendar / RFC 5545 TEXT value-encoding completeness — a per-value escape
helper handles backslash, comma, semicolon, and LF, but **not CR**, so a line break that
arrives as `\r\n` (or a lone `\r`) leaks a raw 0x0D into a property value, which is
non-conformant (CRLF is the content-line delimiter) and corrupts the `.ics` line
structure. Fresh class for this repo: prior zivosmedia passes were CSV-field
escaping (flight exports newline escape, pass 6), date/timezone parsing (vehicle CSV
acquired-date UTC off-by-one, pass 7), redirect host-validation / open-redirect,
autorepair print XSS, postMessage origin, and chunk-reload key format. None touched the
iCalendar generator or TEXT-value escaping. So this is a distinct, previously unflagged
class.
**Status:** Done. Gate green: `npm run build` (`vite build`) exit 0 after the change.
One file changed (`src/lib/buildICS.ts`, +10/-1).
**Advisor:** DeepSeek (MCP, deepseek-reasoner), independently re-verified by hand.
Confirmed: (1) original output for `"a\r\nb"` is `"a\r\\nb"` — the bare CR survives,
non-conformant per §3.3.11/§3.1; (2) the fix is strictly non-regressive — for any input
with no `\r`, `/\r\n|\r|\n/g` matches exactly the same positions as `/\n/g`, so output is
byte-identical; (3) for `"a\r\nb"` the new output is `"a\\nb"` (conformant); (4) no input
is made worse — listing the `\r\n` alternative first collapses a CRLF pair to a single
`\n` rather than `\n\n`.

## Baseline
`npm run build` = exit 0 before any change. Heavy concurrent peer-agent activity this
pass: `git status --short` shows a ~60-file modified cluster — the whole
`components/admin/store/car-rental/*` + `autorepair/*` section/dialog set, their
`hooks/car-rental/*`, `lib/authRedirect.ts(.test)`, `lib/crossDomainSSO.ts`,
`lib/urlSafety.ts`, `lib/flightExports.ts`, `lib/lazyRetry.ts`, `lib/nativeDeepLinks.ts`,
`lib/software/softwareCheckout.ts`, `lib/car-dealership/parseVehicleCsv.ts`, several
`pages/*`, plus `AGENT_TASKS.md` and new untracked `src/lib/escapeHtml.ts` — all
concurrent peer work, deliberately avoided. `src/lib/buildICS.ts` was clean (non-peer),
confirmed via `git status --short src/lib/buildICS.ts` (empty) before editing.

## Finding — CR is not escaped, so a raw 0x0D survives into the property value
`buildICS.ts` builds one VEVENT and runs every TEXT property (SUMMARY / DESCRIPTION /
LOCATION / URL) through:
```ts
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
```
Lines are then joined with `"\r\n"` (`lines.join("\r\n")`). RFC 5545 §3.3.11 requires a
TEXT value to encode a line break as the two-character escape `\n`, and §3.1 makes CRLF
the **content-line delimiter** — so a literal CR (0x0D) must never appear unescaped
inside a value. This helper escapes LF but **not** CR. Trace `"a\r\nb"`:
- `\\` → no change; `\n`→`\\n` turns the LF into the escape but leaves the CR;
- result: `"a\r\\nb"` = `a` + **raw CR** + `\n`(literal) + `b`.

Emitted as `SUMMARY:a<CR>\nb`, the bare CR sits mid-value; strict parsers (and the spec)
treat it as a stray line boundary, so the event's summary/description/location is
truncated or garbled when the user imports the file into Apple/Google/Outlook calendar.

**Reachability (all three call sites pass free-form / merchant data through escapeText):**
- `pages/ReservationPage.tsx:336` — `description` interpolates `note.trim()` (the user's
  free-form reservation note) and `title`/`location` use `restaurant?.name` (merchant data).
- `pages/FlightConfirmation.tsx:505` — `title`/`description`/`location` from booking fields.
- `pages/TravelConfirmationPage.tsx:269` — `location: hotelItem.title` (merchant data).
A note pasted from a doc, or a merchant name/title entered with a Windows line break,
carries `\r\n` and triggers the corruption.

## Fix (minimal — normalize all line breaks to the `\n` escape)
`buildICS.ts`:
```ts
function escapeText(s: string): string {
  // Normalize every line break — CRLF, lone CR, lone LF — to the "\n" escape. A bare
  // CR (0x0D) left in a property value is non-conformant (RFC 5545 §3.3.11/§3.1): CRLF
  // is the content-line delimiter, so a raw CR from "\r\n" content (e.g. a pasted
  // reservation note or merchant name) would corrupt the .ics line structure. The
  // "\r\n" alternative is listed first so a CRLF pair collapses to a single "\n".
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
```
Only the LF replacement changed (`/\n/g` → `/\r\n|\r|\n/g`). Backslash-doubling still runs
first so the backslash we add for the `\n` escape is not re-doubled. (+10/-1, of which
+8 is the explanatory comment.)

## Verification
- `npm run build` (`vite build`) = exit 0 after the change ("files generated … dist/sw.js").
- `git diff --stat` shows exactly `src/lib/buildICS.ts` (+10/-1); the ~60-file peer
  cluster is concurrent peer-agent work — not touched here.
- Non-regression (DeepSeek-confirmed + hand-checked):
  - no `\r` in input → `/\r\n|\r|\n/g` can only match `\n`, identical positions to `/\n/g`
    → byte-identical output (so existing SUMMARY/DESCRIPTION/LOCATION output is unchanged).
  - `"a\r\nb"` → old `"a\r\\nb"` (bare CR, broken) → new `"a\\nb"` (conformant).
  - lone `"a\rb"` → old `"a\rb"` (bare CR) → new `"a\\nb"` (conformant).
  - regex alternation order (`\r\n` first) means a CRLF pair yields one `\n`, not two.

## Deliberately NOT changed (scope discipline)
- **`URL:${escapeText(input.url)}` (`buildICS.ts:42`)** — a *separate* latent issue: the
  URL property is a URI value (RFC 5545 §3.8.4.6), not TEXT, so backslash-escaping its
  `,`/`;` is technically wrong and could corrupt a link with those chars. But the
  call-site URLs here (`window.location.href`, `${origin}/eats/restaurant/<id>`) contain
  no comma/semicolon, so there is no live corruption; left out of this minimal,
  zero-regression CR fix to keep one finding per pass. Noted for a future pass.
- **Line folding (RFC 5545 §3.1, fold >75 octets)** — this generator emits unfolded
  lines; long descriptions are technically non-conformant but are universally tolerated
  by Apple/Google/Outlook, so no user-visible breakage. Out of scope here.
- **Date handling (`toDate`/`formatICSDate`)** — audited and correct: a no-offset local
  ISO string is parsed as local time (ES2015+) and rendered to UTC `…Z`, which is the
  intended semantics; untouched.
- All ~60 peer-modified files.

## Notes
- No commit/push/deploy (owner deploys). Local change only.
- Pass-8 rotation start: zivosmedia ✓ (this doc). Next is ZIVO-CHAT.
