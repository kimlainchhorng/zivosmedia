# MiMo advisor — Security review of this CSV formula-injection defense (CWE-1236). The escape() neutralizes cells matching /^[=+\-@\t\r]/ by prepending an apostrophe, UNLESS the cell matches /^-?\d+(\.\d+)?$/ (numeric literal). Then RFC-4180 quotes if it contains comma/quote/newline. Questions: (1) Any formula-trigger BYPASS? e.g. leading-space then '=' (' =cmd'), or Unicode/BOM prefix, or a leading tab/CR that some apps still execute, or '\n=cmd' inside a quoted multiline cell where row 2 starts with '='? (2) Does the NUMERIC_LITERAL exception let anything dangerous through (e.g. '-5e9', '+1', hex)? (3) Is apostrophe-before-quoting the correct order? (4) Any RFC-4180 gap (leading/trailing whitespace, lone CR)? Give P0/P1/P2 with concrete repro cell values. Do NOT propose test files.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/lib/admin/expensesCsvExport.ts

## Security Review — CSV Formula-Injection Defense (CWE-1236)

### P1 — Leading-whitespace bypass

**Cell:** `" =SUM(A1:A10)"` (leading ASCII space)

`FORMULA_TRIGGERS` is anchored at `^` but the character class has no `\s*` prefix. A leading space prevents the match. Google Sheets CSV import (and some Excel Text Import Wizard configs) strips whitespace before formula detection, so ` =cmd` executes.

**Fix:** `/^\s*[=+\-@\t\r]/`

---

### P1 — Lone `\r` not in quoting condition

**Cell:** `"hello\rworld"` (bare CR, no LF)

`escape()` only checks `s.includes("\n")` for the quoting gate. A lone `\r` passes through raw, violating RFC-4180 and causing row-splitting in Excel's parser (which splits on both `\r` and `\n`).

**Fix:** `if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r"))`

---

### P2 — `\n` absent from trigger class

**Cell:** `"\n=cmd"`

`\t` and `\r` are in `[=+\-@\t\r]` but `\n` is not. This value is only saved by the `\n`-quoting path (producing a multiline cell where line 2 starts with `=`). Most parsers won't evaluate this as a formula because the cell-value lead is `\n`, but the defense is inconsistent and fragile.

**Fix:** Add `\n` to the trigger class → `/^[=+\-@\t\r\n]/` (or equivalently, strip leading whitespace before the trigger check).

---

### P2 — Unicode transparent-prefix (defense-in-depth)

**Cell:** `"\uFEFF=cmd"` (BOM), `"\u200B=cmd"` (ZWSP)

These bypass the regex. Excel/LibreOffice/Sheets generally don't evaluate these as formulas today, but it's a known hardening gap in OWASP guidance. Low real-world risk.

**Fix (defense-in-depth):** After `String(v)`, strip common invisible Unicode prefixes (U+FEFF, U+200B–U+200F, U+2060, U+FEFF) before the trigger check.

---

### No Issue — NUMERIC_LITERAL exception

The regex `/^-?\d+(\.\d+)?$/` is tight:
- `-5e9`, `+1`, `0xFF` → **do not match** → fall through to trigger check → get apostrophe'd. Safe.
- `-5.00` → matches → no apostrophe → correct (legit negative).
- `-1.2.3` → does not match → apostrophe'd. Safe.

**No dangerous value leaks through this exception.**

---

### No Issue — Apostrophe-before-quoting order

`'=cmd,inject` → quoted as `"'=cmd,inject"`. The apostrophe lands inside the quoted field as a cell-level text-forcing prefix. Correct. Reversing the order would place the apostrophe outside the quotes, breaking the defense.

---

### No Issue — RFC-4180 compliance (aside from lone `\r` above)

- Quoted fields correctly double internal `"` → `""`.
- `\n` inside quotes is preserved per RFC-4180 §2.6.
- No gap with leading/trailing whitespace (those are valid unquoted per the RFC).
- Rows are joined with `\n`; the `downloadCsv` function doesn't add a trailing newline, which is fine.
