# MiMo advisor — Security + correctness review of exportPaymentsCsv: focus on CSV formula-injection (CWE-1236) and RFC-4180 quoting. Note: 3 sibling CSV exporters in this repo quote embedded carriage-return (\r) but this file's RFC quote trigger omits \r (only , " and \n). Is that a real row-injection gap for free-text cells (customer_name, reference, method, storeName)? Is adding || s.includes('\r') the correct minimal fix? Any other real reachable bugs in escape/buildCsv/exportPaymentsCsv?

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/lib/admin/paymentsCsvExport.ts

## Findings

### P1 — `\r` omitted from RFC-4180 quoting trigger (row-injection)

The quoting gate at line 26:

```ts
if (s.includes(",") || s.includes('"') || s.includes("\n"))
```

is missing `|| s.includes('\r')`. An embedded `\r` in any free-text column (`customer_name`, `reference`, `method`, `storeName`) passes through unquoted, injecting a row break that splits the record when parsed by Excel/Sheets/csv-reader. Every sibling exporter in this repo already includes the `\r` check.

**Fix — minimal one-token change:**

```ts
if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r"))
```

### Everything else is solid

| Area | Verdict |
|---|---|
| **Formula injection (CWE-1236)** | `FORMULA_TRIGGERS` covers `= + - @ \t \r`; `NUMERIC_LITERAL` guard correctly exempts negative numbers like `-5.00`. Apostrophe neutralisation is the accepted mitigation. ✔ |
| **`escape` logic order** | Formula-prefix check runs before RFC quoting — correct; the leading `'` is preserved inside the quotes. ✔ |
| **`buildCsv` joining** | Row-level `map(escape).join(",")` then `join("\n")` is correct. ✔ |
| **`invMap` lookup / null coalescing** | `inv?.customer_name ?? ""`, `inv?.number ?? ""`, `py.method ?? ""`, `py.reference ?? ""` — all null-safe, all flow through `escape`. ✔ |
| **`downloadCsv`** | Blob MIME is `text/csv;charset=utf-8`, deferred import is fine. ✔ |
| **`fmtMoney` return type** | Returns string (contains `,`); gets RFC-quoted by `escape` — correct. ✔ |

**One fix, P1: add `|| s.includes('\r')` to the quoting condition.**
