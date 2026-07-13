# MiMo advisor — Review this pure CSV parser/mapper/validator for REAL correctness bugs only (P0/P1/P2). Focus: parseRows tokenizer (quote/escape/CRLF/EOF edge cases), autoMapColumns alias+snake fallback, parseDollarsToCents float rounding, parseDate timezone branches, parseFeatures dedupe, validateRow enum/duplicate/price logic. Ignore style. Report only concrete bugs with input->wrong-output.

Files: src/lib/car-dealership/parseVehicleCsv.ts

[no final text — stop_reason=max_tokens; reasoning excerpt:]
Let me carefully review each function for real correctness bugs.

## parseRows

Let me trace through edge cases:

**Quoted field with trailing quote at EOF:**
Input: `"hello"`
- i=0: `"` → inQuotes=true
- i=1-5: `hello` → field="hello"
- i=6: `"` → text[7] is undefined, so `text[i+1] === '"'` is false → inQuotes=false
- End of loop: field="hello", row.length=0 but field.length>0 → push field, push row. ✅

**Escaped quote at EOF inside quotes:**
Input: `"he""llo"`
- i=0: `"` → inQuotes=true
- i=1-2: `he` → field="he"
- i=3: `"` → text[4] is `"` → field += '"', i becomes 4
- i=5-7: `llo` → field="he\"llo"
- i=8: `"` → text[9] is undefined → inQuotes=false
- End: field="he\"llo", push field, push row. ✅

**CRLF handling:**
Input: `a\r\nb`
- i=0: `a` → field="a"
- i=1: `\r` → swallow
- i=2: `\n` → push "a", push row. Reset.
- i=3: `b` → field="b"
- End: push "b", push row. 
Result: [["a"], ["b"]] ✅

**Empty file:**
Input: ``
- Loop doesn't execute
- field="" and row=[] → field.length===0 and row.length===0 → skip push
- Return [] ✅

**Trailing newline:**
Input: `a,b\nc,d\n`
- Parse: [["a","b"],["c","d"],["",""]] — wait, let me trace again.
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `b` → field="b"
- i=3: `\n` → push "b", rows.push(["a","b"]), row=[], field=""
- i=4: `c` → field="c"
- i=5: `,` → push "c", field=""
- i=6: `d` → field="d"
- i=7: `\n` → push "d", rows.push(["c","d"]), row=[], field=""
- End: field="" and row=[] → skip
- Result: [["a","b"],["c","d"]] ✅ The empty trailing row is NOT added because field and row are both empty.

Wait, but what about `\na,b\n`? Leading newline:
- i=0: `\n` → push field(""), rows.push([""]), row=[], field=""
- i=1: `a` → field="a"
- i=2: `,` → push "a", field=""
- i=3: `b` → field="b"
- i=4: `\n` → push "b", rows.push(["a","b"]), row=[], field=""
- Result: [[""], ["a","b"]] — the leading empty row would become the header in parseCsv. But the docstring says "the first non-empty line is the header row" and `parseCsv` just takes `rows[0]`. So if there's a leading newline, it becomes a phantom row with one empty cell. This could be a minor bug but not sure it's worth flagging as P0/P1.

Actually, wait. Let me re-read: "Lenient: trailing empty rows are dropped, the first non-empty line is the header row." But `parseCsv` doesn't skip leading empty rows - it just takes `rows[0]`. If the CSV starts with a blank line, rows[0] would be `[""]` and all subsequent data would be mapped to headers `[""]`. This is a documentation mismatch but not really a "real correctness bug" in practice since the docs describe intended behavior but the implementation doesn't fully deliver. I'll skip this.

**Quoted field with comma inside:**
Input: `"hello,world",test`
- i=0: `"` → inQuotes=true
- i=1-10: `hello,world` → field="hello,world"
- i=11: `"` → text[12] is `,`, not `"` → inQuotes=false
- i=12: `,` → push "hello,world", field=""
- i=13-16: `test` → field="test"
- End: push "test", rows=[["hello,world","test"]] ✅

**Unquoted field with quote in the middle:**
Input: `hel"lo,world`
- i=0-2: `hel` → field="hel"
- i=3: `"` → inQuotes=true (this is wrong behavior per RFC 4180, but it's a "lenient" parser)
- i=4-11: `lo,world` → field="hello,world"
- End: inQuotes=true still. push field, push row.
- Result: [["hello,world"]] — the comma is eaten because it's inside quotes. This is technically wrong but it's documented as "lenient" so I won't flag it.

Hmm, actually wait. Let me re-check. After `i=3: "` → inQuotes=true. Then:
- i=4: `l` → field="hell"
- i=5: `o` → field="hello"
- i=6: `,` → inQuotes is true, so it goes to the else branch, field += c → field="hello,"
- ...
So yes, the comma is treated as part of the field. This is a correctness issue with unbalanced quotes but it's an edge case in malformed input. I'll skip.

## parseDollarsToCents

```js
const cleaned = s.replace(/[$,\s]/g, "");
if (!cleaned) return 0;
const n = parseFloat(cleaned);
if (!Number.isFinite(n) || n < 0) return null;
return Math.round(n * 100);
```

**Negative values:** The regex strips `$`, `,`, and whitespace. If input is `-$5.00`, cleaned becomes `-5.00`, n = -5, returns null. ✅

**Float precision:** `parseDollarsToCents("19.99")` → parseFloat("19.99") = 19.99, Math.round(19.99 * 100) = Math.round(1999) = 1999. ✅

But: `parseDollarsToCents("0.1")` → parseFloat("0.1") = 0.1, Math.round(0.1 * 100) = Math.round(10.000000000000001) = 10. ✅

`parseDollarsToCents("1.005")` → parseFloat("1.005") = 1.005, Math.round(1.005 * 100) = Math.round(100.49999999999999) = 100. But $1.005 should round to $1.01 (101 cents). However, 1.005 can't be exactly represented in float64, and the banker's rounding here gives 100 instead of 101. This is a known IEEE 754 issue, but since we're dealing with dollar amounts that typically have at most 2 decimal places, this is unlikely to be a real problem. I'll skip this.

Wait, actually, what about `parseDollarsToCents("5.555")`? 5.555 * 100 = 555.4999999999999, rounds to 555. But if you expected 556... again, this is a float precision issue that's well-known and unlikely in practice with dollar amounts.

**Input with empty string:** `parseDollarsToCents("")` → cleaned="" → `!cleaned` is true → returns 0. Hmm, but the caller checks `canon.cost != null` before calling, and an empty string from CSV would be `""` which is not `null`. So `canon.cost = ""` → `parseDollarsToCents("")` → returns 0. Is this correct behavior? If cost is an empty string, it gets treated as $0. This seems intentional since the function is only called when the canonical column exists in the row.

Actually wait, look at how it's used:
```js
const costCents = canon.cost != null ? parseDollarsToCents(canon.cost) : 0;
```

If `canon.cost` is `""`, then `"" != null` is true, so `parseDollarsToCents("")` is called, which returns 0. That seems fine - an empty cost field means $0.

## parseDate

```js
if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
const d = new Date(t);
if (Number.isNaN(d.getTime())) return null;
if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(t)) return d.toISOString().slice(0, 10);
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
```

**"2023-05-15"** → regex matches, returns "2023-05-15". ✅

**"2023-05-15T10:30:00Z"** → doesn't match date-only regex, new Date parses as UTC, regex matches Z at end → returns d.toISOString().slice(0,10) = "2023-05-15". ✅

**"2023-05-15T10:30:00+07:00"** → regex matches +07:00 → returns UTC date. If local is UTC+7, then 2023-05-15T10:30:00+07:00 = 2023-05-15T03:30:00Z, date is "2023-05-15". ✅

**"5/15/2023"** → no regex match, parsed in local time, format from local components. ✅

**Timezone-less ISO datetime "2023-05-15T10:30:00":** new Date("2023-05-15T10:30:00") — in most browsers, this is parsed as local time. The comment says this. Then we format from local components. ✅

Wait, actually there's a subtle issue. The regex `/[Zz]$|[+-]\d{2}:\d{2}$/` — this checks for timezone indicators. But what about `2023-05-15T10:30:00.000Z`? The Z is at the end. ✅

What about `2023-05-15T10:30:00+0700` (without colon)? The regex requires `:` so it won't match. new Date("2023-05-15T10:30:00+0700") — does this parse correctly? Actually, not all browsers support `+0700` format; some only support `+07:00`. But even if it parses, the regex won't match, so it falls through to the local-time branch. If it's actually a zoned timestamp, the date could be wrong. But this is an uncommon format, so I'll skip.

## parseFeatures

```js
const seen = new Set<string>();
const out: string[] = [];
for (const raw of s.split(/[|;,]/)) {
  const t = raw.trim();
  if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
}
return out;
```

Looks correct. Case-insensitive dedup, preserves first occurrence casing. ✅

## validateRow — enum/duplicate/price logic

**Enum maps:** All use `.trim().toLowerCase()` consistently. ✅

**Duplicate check:** Checks VIN first, then stock number. Only warns, doesn't error. ✅

**Price validation:**
```js
const costCents = canon.cost != null ? parseDollarsToCents(canon.cost) : 0;
```

If canon.cost is undefined (column not mapped), this defaults to 0. If canon.cost is "" (mapped but empty), parseDollarsToCents returns 0. Both result in cost_cents = 0 in the draft. This seems intentional.

Wait, I see a potential issue with `parseDollarsToCents`. Look:
```js
const cleaned = s.replace(/[$,\s]/g, "");
if (!cleaned) return 0;
```

If the input is something like `"$$$"`, cleaned is `""`, returns 0. That's treated as $0, not as an error. Then the caller checks `if (canon.cost != null && costCents == null)` — but costCents is 0, not null. So the "not a valid number" error is never triggered. This could be a bug: an input of `"$$$"` for cost silently becomes $0 instead of flagging an error.

Let me verify: `"$$$" → cleaned = "" → !"" is true → return 0. costCents = 0, not null. The check `canon.cost != null && costCents == null` is false. So the draft gets cost_cents = 0 with no error. ✅ This is a real bug.

Similarly, `"-"` → cleaned = "-" → parseFloat("-") = NaN → !Number.isFinite(NaN) → return null. OK that one works.

But `"$"` → cleaned = "" → returns 0. No error flagged. Bug.

Actually, is this really a bug in practice? If someone types `$` as the cost, it's clearly an invalid input but it silently becomes $0. The error message for invalid cost checks `costCents == null` but the function can never return null for an empty cleaned string — it returns 0 instead. So empty/whitespace-only/symbol-only inputs for price fields silently become $0.

This is a P1: `parseDollarsToCents("$")` returns `0` instead of `null`, so invalid price inputs like `"$"`, `"$$$"`, `","` silently become $0 with no validation error.

Wait, but the check is:
```js
if ((askingPriceCents ?? 0) === 0) {
    setSev("warn");
    messages.push("Asking price is $0.");
}
```

So a $0 asking price gets a warning. But cost being $0 from invalid input gets no warning at all. Hmm, still a bug.

## autoMapColumns

```js
const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().replace(/\s+/g, " ");

export function autoMapColumns(headers: string[]): Record<string, CanonicalColumn | null> {
  const out: Record<string, CanonicalColumn | null> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    const direct = ALIASES[norm];
    if (direct) { out[h] = direct; continue; }
    const snake = norm.replace(/[\s-]+/g, "_");
    if (ALIASES[snake]) { out[h] = ALIASES[snake]; continue; }
    out[h] = null;
  }
  return out;
}
```

Let me check: if header is `"Cost ($)"`, normalizeHeader → `"cost ($)"`. ALIASES has `"cost ($)"` → "cost". ✅

If header is `"Asking Price"`, normalizeHeader → `"asking price"`. ALIASES has `"asking price"` → "asking_price". ✅

If header is `"Exterior-Color"`, normalizeHeader → `"exterior-color"`. Not in ALIASES. snake = `"exterior_color"`. ALIASES has `"exterior_color"` → "exterior_color". ✅

What about `"Mileage Unit"`? normalizeHeader → `"mileage unit"`. ALIASES has `"mileage unit"` → "mileage_unit". ✅

What about a header with leading/trailing spaces and multiple spaces: `"  Asking   Price  "`? normalizeHeader → `"asking price"`. ALIASES match. ✅

This looks correct.

Now let me check: in `parseCsv`, the headers are trimmed:
```js
const headers = rows[0].map((h) => h.trim());
```

And in `autoMapColumns`, the raw header is used as the key, but normalized internally. The mapping returned uses the original header as key. Then in `validateRow`:
```js
for (const [rawHeader, canonicalCol] of Object.entries(mapping)) {
    if (!canonicalCol) continue;
    const v = rec[rawHeader];
```

The `rec` keys come from `parseCsv` which uses trimmed headers. So if the raw header passed to `autoMapColumns` is also trimmed (because it comes from parseCsv), this works. But if someone calls autoMapColumns with untrimmed headers and then looks up in a record built with trimmed headers, there'd be a mismatch. However, in the typical flow, both use parseCsv's output which trims headers. ✅

Wait, actually there's a subtle issue. In `parseCsv`:
```js
const headers = rows[0].map((h) => h.trim());
...
rec[headers[j]] = (row[j] ?? "").trim();
```

So `rec` keys are trimmed. If `autoMapColumns` is called with these trimmed headers, the mapping keys are also trimmed. Then in `validateRow`, `rec[rawHeader]` uses the same key. ✅

## parseRows — let me check one more edge case

**Quoted field at end of row:** `a,"b,c"\nd,e`
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3-5: `b,c` → field="b,c"
- i=6: `"` → text[7]=`\n`, not `"` → inQuotes=false
- i=7: `\n` → push "b,c", rows.push(["a","b,c"]), row=[], field=""
- i=8: `d` → field="d"
- i=9: `,` → push "d", field=""
- i=10: `e` → field="e"
- End: push "e", rows.push(["d","e"])
✅

**Field ending with escaped quote:** `a,"b""c",d`
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3: `b` → field="b"
- i=4: `"` → text[5]=`"` → field+='"' → field='b"', i=5
- i=6: `c` → field='b"c'
- i=7: `"` → text[8]=`,` → inQuotes=false
- i=8: `,` → push 'b"c', field=""
- i=9: `d` → field="d"
- End: push "d", row
✅

**What about a bare `\r\n` at end of file?**
Input: `a,b\r\n`
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `b` → field="b"
- i=3: `\r` → swallow
- i=4: `\n` → push "b", rows.push(["a","b"]), row=[], field=""
- End: field="" and row=[] → skip push
✅

**What about just `\n`?**
Input: `\n`
- i=0: `\n` → push "", rows.push([""]), row=[], field=""
- End: field="" and row=[] → skip
- Result: [[""]] — this becomes the header in parseCsv, with headers=[""]. Then no data rows. Actually parseCsv checks `rows.length === 0` which is false, so it proceeds with headers=[""]. Then for i=1 to end, there are no rows. Returns []. ✅

Actually wait, result is [[""]]. parseCsv: rows.length is 1, not 0. headers = [""] (trimmed). Then loop from i=1 to < 1, doesn't execute. Returns []. ✅

**What about `"unclosed quote`?**
Input: `"unclosed`
- i=0: `"` → inQuotes=true
- i=1-7: `unclosed` → field="unclosed"
- End of loop: inQuotes=true, so the else branch doesn't trigger on the last char being inside quotes. After loop: field="unclosed", row=[], field.length>0 → push field, push row.
- Result: [["unclosed"]] — the field is captured even though the quote is unclosed. This is lenient behavior, documented as such.

But what about `a,"unclosed\nc,d`?
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3-9: `unclosed` → field="unclosed"
- i=10: `\n` → inQuotes=true, so field += "\n" → field="unclosed\n"
- i=11: `c` → field="unclosed\nc"
- i=12: `,` → inQuotes=true, field += "," → field="unclosed\nc,"
- i=13: `d` → field="unclosed\nc,d"
- End: push field, push row.
- Result: [["a"], ["unclosed\nc,d"]] — the newline and subsequent content got swallowed into the quoted field. This is actually what should happen per RFC 4180 (quotes can contain newlines), but since the closing quote is missing, it's technically malformed. The lenient parser handles it. Not really a bug per the docs.

Hmm, actually wait. The spec says "escaped double-quotes ("" inside quotes)". An unclosed quote is malformed, but the parser still produces output. I'll call this acceptable for a "lenient" parser.

## Let me look for more substantive bugs

**parseDollarsToCents with input containing only whitespace:** `parseDollarsToCents("   ")` → cleaned = "" → returns 0. Same issue as above with empty strings.

**parseInt0 with input like "-5":** cleaned = "-5", parseInt("-5",10) = -5. Returns -5. Used for year. Negative year would be weird but not necessarily a bug. The year field doesn't validate range.

**parseInt0 with input like "abc123":** cleaned = "123", returns 123. This is lenient parsing. OK.

**parseDollarsToCents with negative:** `parseDollarsToCents("-$5.00")` → cleaned = "-5.00" → parseFloat = -5 → n < 0 → returns null. Good.

But `parseDollarsToCents("$-5.00")` → cleaned = "-5.00" → same. ✅

Now let me think about the `parseRows` CRLF handling more carefully.

**Input: `a\r\nb`** — already checked, works fine.

**Input: `a\n\rb`** — 
- i=0: `a` → field="a"
- i=1: `\n` → push "a", rows.push(["a"]), row=[], field=""
- i=2: `\r` → swallow
- i=3: `b` → field="b"
- End: push "b", rows.push(["b"])
- Result: [["a"], ["b"]] ✅

**Input: `a\r\rb`** —
- i=0: `a` → field="a"
- i=1: `\r` → swallow
- i=2: `\r` → swallow
- i=3: `b` → field="ab"
- End: push "ab", rows.push(["ab"])
- Result: [["ab"]] — the CRs are swallowed and the content is joined. This seems reasonable.

**Input with NUL bytes:** Not handled, but unlikely in CSV.

## Now let me look at a real subtle issue

**parseRows with a quoted field ending exactly at EOF:**
Input: `a,"b"`
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3: `b` → field="b"
- i=4: `"` → text[5] is undefined → `text[i+1] === '"'` is false → inQuotes=false
- End: field="b", row=["a"], push field, push row
- Result: [["a","b"]] ✅

**Input: `a,"b""` (dangling escaped quote at EOF):**
- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3: `b` → field="b"
- i=4: `"` → text[5] = `"` (wait, there's no index 5, input is 5 chars "a,"b"")

Let me recount: `a,"b""` has indices 0-5:
- 0: `a`
- 1: `,`
- 2: `"`
- 3: `b`
- 4: `"`
- 5: `"`

- i=0: `a` → field="a"
- i=1: `,` → push "a", field=""
- i=2: `"` → inQuotes=true
- i=3: `b` → field="b"
- i=4: `"` → text[5] = `"` → field += '"', field = 'b"', i becomes 5
- End of loop (i was incremented to 5, then i++ makes it 6, which is past length)

Wait, the for loop does `i++` at the end of each iteration. Let
