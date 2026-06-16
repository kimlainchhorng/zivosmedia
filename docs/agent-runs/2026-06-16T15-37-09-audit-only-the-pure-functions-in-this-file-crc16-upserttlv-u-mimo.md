# MiMo advisor — Audit ONLY the pure functions in this file (crc16, upsertTlv/upsertNestedTlv, reorder/canonical-sort, formatAmount, buildDynamicKhqr). RULES: (1) State your VERDICT in the FIRST sentence: 'BUG: <line> <one-line why>' or 'NO BUG FOUND'. (2) Do NOT count characters inside hardcoded string constants — assume constants are valid. (3) Judge only control-flow/encoding logic in the functions. Be terse, <120 words.

Files: src/lib/khqr.ts

[no final text — stop_reason=end_turn; reasoning excerpt:]
Let me audit the pure functions carefully.

**crc16**: Standard CRC16-CCITT implementation. Poly 0x1021, init 0xFFFF. The bit-by-bit loop looks correct. Output is hex uppercase padded to 4 chars. ✅

**upsertNestedTlv**: Parses entries, replaces if found, appends if not. Rebuilds with tlv(). Looks correct. ✅

**upsertTlv** — wait, there's no standalone `upsertTlv`, only `upsertNestedTlv`. The code uses direct field map assignment for top-level tags. ✅

**reorder/canonical-sort**: The `order` array in `buildDynamicKhqr` defines canonical order. Then remaining tags are appended in original parse order. But wait — `parseTlvEntries` on `body` gives original order, but `fields` was built via `parseTlv` which uses `Object.fromEntries(parseTlvEntries(s))`. Object key order for string keys is insertion order, so `fields` preserves order. Then when iterating `parseTlvEntries(body)` again for remaining tags, that also preserves original order. ✅

**formatAmount / formatKhqrAmount**: USD → toFixed(2), KHR → Math.round. ✅

**buildDynamicKhqr**: 
- strips CRC, parses fields
- sets fields["01"] = "12" (dynamic), currency, amount
- handles reference in tag 62
- reassembles in canonical order
- appends remaining tags
- computes CRC

Wait — there's a potential issue. `stripCrc` uses regex `6304[0-9A-Fa-f]{4}$` to remove CRC. Then the body is parsed. But tag "63" with value "04" is the CRC tag itself (tag "63", length "04", value = 4 hex chars). The regex strips the last 8 characters that match `6304XXXX`. This is correct for removing the CRC.

But then when we iterate `parseTlvEntries(body)` for remaining tags — `body` already had CRC stripped. Any tag "63" wouldn't appear. Fine.

Now, `fields["62"]` is the raw value of tag 62 (the nested TLV content). `upsertNestedTlv` parses that value as nested TLV entries. This is correct — tag 62's value is itself a TLV structure.

One thing: the `emitted` set tracks tags already output. The second loop iterates `parseTlvEntries(body)` — but `fields` may have modified values (e.g., "01", "52", "53", "54", "62"). The second loop checks `fields[tag]` which would be the modified value. That's correct — we want the modified values emitted.

But wait: tags like "29", "30", "31" are in the canonical order. These are merchant account tags. The original static QR has tag "29" (or similar). If the static QR doesn't have these tags, `fields[tag]` would be undefined, and they'd be skipped. That's fine.

Actually, looking more carefully: the `order` array includes "29", "30", "31" but these may not exist in every QR. The condition `if (fields[tag] !== undefined)` handles that. ✅

**P1 Bug**: In the second loop, `parseTlvEntries(body)` is called again on the CRC-stripped body. But `fields` is a flat map from `parseTlv(body)` — which only has top-level tags. The second loop only adds top-level tags not in `emitted`. This is correct.

Hmm, actually let me re-examine the CRC computation. The CRC is computed over `withCrcTag` which ends in "6304". The CRC should cover everything up to and including "6304", then the 4-char hex CRC is appended. This matches EMVCo spec. ✅

Wait — `parseTlvEntries` has a guard: `while (i <= s.length - 4)`. If the string has fewer than 4 characters, the loop doesn't execute. For tag "63" with length "04", the value is 4 chars, so total field is 2+2+4=8 chars. The `i <= s.length - 4` condition ensures we can read at least a tag (2) + length (2). But what if the length field itself is only 1 digit because we're at the end? The `slice(i+2, i+4)` would get partial data. However, `parseInt` on partial would either be NaN or a smaller number, and `val.length !== len` check would catch mismatches. So it's safe enough. ✅

Actually, wait. Let me look at `parseTlvEntries` more carefully for a subtle bug:

```js
while (i <= s.length - 4) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    ...
```

If `s.length` is 3, then `i=0`, `s.length - 4 = -1`, so `0 <= -1` is false, loop doesn't execute. Good.

If `s.length` is 5, `i=0`, `s.length - 4 = 1`, `0 <= 1` is true. tag = s[0..2], len = parseInt(s[2..4]). If len is, say, 3, val = s[4..7] but s only has 5 chars, so val.length = 1 ≠ 3, break. Safe.

I don't see a correctness bug here.

Let me look at `formatKhqrAmount` one more time:
- KHR: `String(Math.round(amount))` — no decimal places, correct for KHR
- USD: `amount.toFixed(2)` — e.g., "5.00", correct

But what about negative amounts or zero? The function doesn't validate, but that's input validation, not control-flow logic. The question says to audit only control-flow/encoding logic.

One more thing: the `reference.slice(0, 25)` — is 25 the correct max for KHQR subtag 01 under tag 62? The EMVCo spec says the bill number subtag can be up to 25 chars. This is a spec constant, and per the rules I shouldn't count hardcoded constants. ✅

VERDICT: NO BUG FOUND. The control flow and encoding logic are all correct.
