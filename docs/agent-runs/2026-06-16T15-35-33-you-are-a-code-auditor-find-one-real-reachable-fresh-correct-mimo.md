# MiMo advisor — You are a code auditor. Find ONE real, reachable, fresh correctness or security bug in this KHQR dynamic payment-QR builder (CRC16-CCITT, EMVCo TLV upsert/reorder, merchant tag-62 sub-TLV preservation, amount/currency encoding). Name the EXACT line number and a CONCRETE failing input that triggers wrong behavior. If the file is correct, say 'NO BUG FOUND' and one sentence why. Be terse.

Files: src/lib/khqr.ts

[no final text — stop_reason=max_tokens; reasoning excerpt:]
Let me carefully analyze this KHQR builder for correctness bugs.

Let me trace through the key logic:

1. **CRC16 implementation** - CRC16-CCITT with poly 0x1021, init 0xFFFF. This looks standard. Let me verify:
   - Init: 0xFFFF ✓
   - XOR with char << 8 ✓
   - Poly 0x1021 ✓
   - Standard implementation ✓

2. **TLV parsing** - `parseTlvEntries` reads 2-char tag, 2-char length, then value. This is standard EMVCo TLV.

3. **The key issue I want to check**: When reassembling, the code uses `parseTlv(body)` which goes through `Object.fromEntries(parseTlvEntries(s))` — this creates a plain object. For tags like "00", "01", "29", "30", "31" etc., these are string keys in the object.

Wait, let me look at a subtle issue. `Object.fromEntries` with string keys should preserve them as strings. That's fine in modern JS.

4. **Amount formatting** - `amount.toFixed(2)` for USD, `Math.round(amount)` for KHR. Looks correct.

5. **Reference slicing** - `reference.slice(0, 25)` — the spec says tag 62 subtag 01 (bill number) max length is 25. But wait, the nested TLV's length field is 2 digits. The value "ref" can be up to 25 chars, so the length field would be "25" which fits in 2 digits. Fine.

6. **Strip CRC** - `qr.replace(/6304[0-9A-Fa-f]{4}$/, "")` — This strips the CRC tag (6304) and its 4-char hex value. But wait — this is the CRC of the raw string. The CRC value is 4 hex chars. This regex looks correct.

7. **Reassembly order** - The code has a canonical order list, then appends remaining tags from the original body. But there's a subtle issue: `parseTlv(body)` via `Object.fromEntries` will **overwrite duplicate tags**. If the original QR has duplicate tags (which EMVCo technically allows for some tags), the map will lose entries.

But more importantly, let me look at a specific bug:

**The `parseTlv` function creates an object from entries. When tags are like "00", "01", etc., `Object.fromEntries` handles them fine as string keys.**

Wait, let me look more carefully at the reassembly logic:

```js
const fields = parseTlv(body);
```

This creates `{ tag: value }` map. Then later:

```js
for (const [tag] of parseTlvEntries(body)) {
    if (emitted.has(tag) || fields[tag] === undefined) continue;
    emitted.add(tag);
    out += tlv(tag, fields[tag]);
}
```

This iterates over original entries to get the order, and for any tag not yet emitted and present in fields, it emits it. But `fields` was built via `parseTlv(body)` which uses `Object.fromEntries` — if there were duplicate tags in the original, only the last value survives. This could be an issue but is unlikely with standard KHQR.

Let me look at something else. The `stripCrc` function:

```js
function stripCrc(qr: string): string {
  return qr.replace(/6304[0-9A-Fa-f]{4}$/, "");
}
```

This regex is case-sensitive on the hex chars but includes both cases `[0-9A-Fa-f]`. Good.

**Now the big question: Is there a bug in how tag 62 is handled?**

```js
fields["62"] = upsertNestedTlv(fields["62"], "01", ref);
```

`upsertNestedTlv` parses the existing tag 62 value as TLV entries, upserts subtag "01", and reassembles. This seems correct.

**Let me check: what if the original QR has additional subtags in tag 62 beyond "01"?**

The `DEFAULT_STATIC_KHQR` has: `624168370010PAYWAY@ABA01069414780209032187119`

Wait, let me parse this. Tag 62, length 41, value: `68370010PAYWAY@ABA01069414780209032187119`

Wait no. Let me re-examine. The string after the CRC strip would be:

`00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA010694147802090321871196304`

Wait, the `stripCrc` removes the `6304XXXX` at the end. So the body is:

`00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA01069414780209032187119`

Wait, let me parse more carefully:

`00` `02` `01` → Payload Format Indicator = "01"
`01` `02` `11` → Dynamic QR flag? Point of Initiation = "11"
`30` `51` `0016abaakhppxxx@abaa01151260319063643400208ABA Bank` 

Hmm wait. Let me be more careful.

Tag `30`, length `51` — that's 51 characters of value. Let me count:

`0016abaakhppxxx@abaa01151260319063643400208ABA Bank`

Let me count: 0016abaakhppxxx@abaa01151260319063643400208ABA Bank
0-0-1-6-a-b-a-a-k-h-p-p-x-x-x-@-a-b-a-a-0-1-1-5-1-2-6-0-3-1-9-0-6-3-6-4-3-4-0-0-2-0-8-A-B-A- -B-a-n-k

That's 48 characters. But length says 51. Hmm, let me recount. Wait, the spaces in the original string... "ABA Bank" has a space. Let me recount:

`0016abaakhppxxx@abaa01151260319063643400208ABA Bank`

0,0,1,6,a,b,a,a,k,h,p,p,x,x,x,@,a,b,a,a,0,1,1,5,1,2,6,0,3,1,9,0,6,3,6,4,3,4,0,0,2,0,8,A,B,A, ,B,a,n,k

= 48 chars. But length is 51. So there might be something else in there.

Actually wait, this is tag 30 which is a merchant account info template. Let me look at it as nested TLV:

`0016abaakhppxxx@abaa` → subtag 00, length 16, value "abaakhppxxx@abaa"
`011512603190636434` → subtag 01, length 15, value "12603190636434"
`00208ABA Bank` → subtag 00, length 20, value "8ABA Bank"

Wait that doesn't look right. Let me re-parse.

Actually, `3051` means tag 30, length 51. The 51-char value starts after `3051`:

`0016abaakhppxxx@abaa01151260319063643400208ABA Bank`

Hmm, but 51 chars... Let me count more carefully. Let me look at the raw DEFAULT_STATIC_KHQR string character by character.

Actually, I realize I need to be more careful. Let me just focus on finding a real bug rather than fully parsing the static QR.

Let me think about potential bugs:

1. **`fields["52"] = fields["52"] || "4215"`** — This uses `||` which means if `fields["52"]` is `"0"` or `""` (empty string), it would be replaced with "4215". But these are unlikely values for MCC, so probably not a real issue.

2. **The big potential bug: `Object.fromEntries` and the preservation of tag order.**

When we do `parseTlv(body)` → `Object.fromEntries(parseTlvEntries(body))`, this creates a plain object. In modern JS (ES2015+), string keys that look like integers ARE ordered numerically first, then by insertion order. But our tags are "00", "01", "29", "30", "31", "52", "53", "54", "58", "59", "60", "62" — these are all valid integer-like strings. So `Object.fromEntries` would order them as: "00", "01", "29", "30", "31", "52", "53", "54", "58", "59", "60", "62" (numerically). But the original QR might have a different order.

Wait, but the reassembly explicitly uses a canonical `order` array for known tags, and then uses `parseTlvEntries(body)` order for remaining tags. So the order from `Object.fromEntries` doesn't matter for the output order — it only matters that the values are correctly stored and retrieved.

But here's the thing: `Object.fromEntries` with integer-coercible string keys will sort them numerically. But since we're only doing key lookups (`fields[tag]`), the order doesn't matter. The values are correctly stored.

3. **Let me look at the `parseTlvEntries` function more carefully:**

```js
function parseTlvEntries(s: string): TlvEntry[] {
  const out: TlvEntry[] = [];
  let i = 0;
  while (i <= s.length - 4) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const val = s.slice(i + 4, i + 4 + len);
    if (val.length !== len) break;
    out.push([tag, val]);
    i += 4 + len;
  }
  return out;
}
```

This parses 2-char tags only. But in EMVCo, some tags can be multi-byte (tag IDs where the low 5 bits of the first byte are all 1s indicate continuation). For standard KHQR tags (00-99), 2-char tags are correct. So this is fine for this use case.

4. **Here's a potential issue**: The `stripCrc` regex:

```js
function stripCrc(qr: string): string {
  return qr.replace(/6304[0-9A-Fa-f]{4}$/, "");
}
```

What if the merchant QR string contains `6304` as part of a value field? The regex is anchored to `$` (end of string), so it only matches at the very end. This should be safe.

5. **Let me look at a critical issue with `parseTlv` and duplicate tags:**

If the original QR has tag "00" appearing twice (which shouldn't happen in standard EMVCo, but...), `Object.fromEntries` would keep only the last one. However, in the reassembly loop that uses `parseTlvEntries(body)`, the `fields[tag]` lookup would give the last value, and the tag would be emitted once. So duplicate tags would be silently deduplicated. But this isn't really a practical issue.

6. **Let me focus on the `fields` object and integer-like keys:**

Actually, wait. In JavaScript, when you do:

```js
const obj = {};
obj["01"] = "12";
```

This works fine. And `obj["01"]` returns `"12"`. But what about `Object.fromEntries([["01", "val1"], ["01", "val2"]])`? This would give `{ "01": "val2" }` — last one wins. Fine.

But what about the iteration order? In `Object.fromEntries`, the insertion order is preserved for string keys. Integer-like string keys (non-negative integers up to 2^32-2) are ordered first, in numeric order, THEN other string keys in insertion order.

Tags like "00", "01", "29", "30", "31", "52", "53", "54", "58", "59", "60", "62" — all are valid array indices (non-negative integers). So they'd be ordered numerically in the resulting object.

But again, the reassembly doesn't rely on object iteration order — it uses explicit `order` array and `parseTlvEntries(body)` order.

7. **Hmm, let me think about the `parseTlvEntries` in the "preserve other tags" loop:**

```js
for (const [tag] of parseTlvEntries(body)) {
    if (emitted.has(tag) || fields[tag] === undefined) continue;
    emitted.add(tag);
    out += tlv(tag, fields[tag]);
}
```

This iterates over the original body's entries to get the order for non-canonical tags. `fields[tag]` retrieves the value from the parsed map. But `fields` was built via `parseTlv(body)` → `Object.fromEntries(parseTlvEntries(body))`. Since there are no duplicate tags in a standard KHQR, this is fine.

**But wait — there's a real issue here!** The `parseTlv` function is called on `body` which has already had CRC stripped. But what about tag 62's sub-tags? Tag 62 is a template tag containing nested TLV. When we do `parseTlv(body)`, we get `fields["62"]` = the raw nested TLV string (e.g., `"68370010PAYWAY@ABA01069414780209032187119"`). That's correct — we treat it as an opaque value and use `upsertNestedTlv` to modify it.

Wait, but is tag 62 actually parsed correctly? Let me check the DEFAULT_STATIC_KHQR:

`...624168370010PAYWAY@ABA0106941478020903218711963040E41`

After CRC strip, the last part is: `624168370010PAYWAY@ABA01069414780209032187119`

Tag `62`, length `41` (decimal). Let me verify: `68370010PAYWAY@ABA01069414780209032187119`

Hmm, that's:
6,8,3,7,0,0,1,0,P,A,Y,W,A,Y,@,A,B,A,0,1,0,6,9,4,1,4,7,8,0,2,0,9,0,3,2,1,8,7,1,1,9

That's 41 characters. Good.

But wait, when parsing the body, does the outer parser correctly extract tag 62? Let me trace:

The parser reads 2-char tag + 2-char length. For tag 62, it reads "62", then "41" (length 41), then takes 41 characters of value. That should work correctly.

OK, I've been going around. Let me think about what could actually break.

**AH WAIT. I think I found it.**

Look at the DEFAULT_STATIC_KHQR more carefully. The end is:

`...624168370010PAYWAY@ABA0106941478020903218711963040E41`

The CRC part is `63040E41`. Let me verify: `stripCrc` removes `6304[0-9A-Fa-f]{4}` at the end. So it removes `63040E41`. The body after stripping would be:

`00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA01069414780209032187119`

Now, in `buildDynamicKhqr`, we compute CRC as:

```js
const withCrcTag = out + "6304";
const crc = crc16(withCrcTag);
return withCrcTag + crc;
```

The CRC is computed over the string INCLUDING "6304" but NOT including the CRC value itself. This is correct per EMVCo — the CRC covers everything up to and including "6304", and the result is appended.

**Let me now look for the real bug more carefully...**

Actually, let me look at the amount handling for KHR:

```js
function formatKhqrAmount(amount: number, currency: Currency): string {
  return currency === "KHR" ? String(Math.round(amount)) : amount.toFixed(2);
}
```

For KHR: `Math.round(1.5)` = `2`, `String(2)` = `"2"`. This seems fine.

For USD: `(5).toFixed(2)` = `"5.00"`. Fine.

What about negative amounts? `(-5).toFixed(2)` = `"-5.00"`. The spec doesn't allow negative amounts, but the function doesn't validate. This isn't really a bug in the TLV builder though — it's a validation gap, not a correctness bug.

What about zero? `(0).toFixed(2)` = `"0.00"`. Should be fine.

What about very large amounts? For USD, `(99999999999.99).toFixed(2)` = `"99999999999.99"` — 13 chars. The length field is 2 digits (max 99), so this is fine.

**Let me think about the REAL bug here...**

Hmm, let me look at the `upsertNestedTlv` function more carefully:

```js
function upsertNestedTlv(existing: string | undefined, tag: string, value: string): string {
  const entries = parseTlvEntries(existing || "");
  let replaced = false;
  const next = entries.map(([entryTag, entryValue]): TlvEntry => {
    if (entryTag === tag) {
      replaced = true;
      return [tag, value];
    }
    return [entryTag, entryValue];
  });
  if (!replaced) next.push([tag, value]);
  return next.map(([entryTag, entryValue]) => tlv(entryTag, entryValue)).join("");
}
```

This looks correct for single-byte tags (like "01" in tag 62's sub-tags).

**OK, let me look at the DEFAULT_STATIC_KHQR parsing from scratch very carefully.**

`00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA0106941478020903218711963040E41`

Let me parse step by step:

Position 0: tag "00", len "02", value "01" → Payload Format Indicator = "01"
Position 6: tag "01", len "02", value "11" → Point of Initiation Method = "11" (dynamic? or static "11")

Wait, "11" means static in some implementations, "12" means dynamic. The code later sets `fields["01"] = "12"`.

Position 12: tag "30", len... let me check.

`30510016abaakhppxxx@abaa01151260319063643400208ABA Bank`

Tag "30", length "51" (51 chars). The value is the next 51 characters:

`0016abaakhppxxx@abaa01151260319063643400208ABA Bank`

Wait let me count: 
0016abaakhppxxx@abaa01151260319063643400208ABA Bank
0016 (4)
abaakhppxxx@abaa (16)
0115 (4)
12603190636434 (14)

Hmm wait. As a flat string: "0016abaakhppxxx@abaa01151260319063643400208ABA Bank"

Let me count character by character:
0-0-1-6-a-b-a-a-k-h-p-p-x-x-x-@-a-b-a-a-0-1-1-5-1-2-6-0-3-1-9-0-6-3-6-4-3-4-0-0-2-0-8-A-B-A- -B-a-n-k

That's 48 characters. But length says 51. So after "Bank" there should be 3 more characters. Let me look at the raw string again:

`...00208ABA Bank5204...`

Oh! The "5204" is the next tag (tag 52). So the value of tag 30 is:

`0016abaakhppxxx@abaa01151260319063643400208ABA Bank`

And tag 52 starts at position 12 + 4 + 51 = 67.

But I counted 48 characters, not 51. Let me recount VERY carefully:

Position in value:
0: '0'
1: '0'
2: '1'
3: '6'
4: 'a'
5: 'b'
6: 'a'
7: 'a'
8: 'k'
9: 'h'
10: 'p'
11: 'p'
12: 'x'
13: 'x'
14: 'x'
15: '@'
16: 'a'
17: 'b'
18: 'a'
19: 'a'
20: '0'
21: '1'
22: '1'
23: '5'
24: '1'
25: '2'
26: '6'
27: '0'
28: '3'
29: '1'
30: '9'
31: '0'
32: '6'
33: '3'
34: '6'
35: '4'
36: '3'
37: '4'
38: '0'
39: '0'
40: '2'
41: '0'
42: '8'
43: 'A'
44: 'B'
45: 'A'
46: ' '
47: 'B'
48: 'a'
49: 'n'
50: 'k'

OK that's 51 characters (0-50). I miscounted before. So the value is exactly 51 chars. Good.

This is the merchant account info for ABA Bank. As nested TLV:
- Subtag "00", len 16: "abaakhppxxx@abaa" (Bakong account)
- Subtag "01", len 15: "12603190636434" ... wait, "0115" → subtag "01", len "15" (decimal 15)

Hmm, "12603190636434" — let me count: 1-2-6-0-3-1-9-0-6-3-6-4-3-4 = 14 chars. But length says 15.

Wait, the value starting at position 24 in tag 30's value:
Position 20: '0'
Position
