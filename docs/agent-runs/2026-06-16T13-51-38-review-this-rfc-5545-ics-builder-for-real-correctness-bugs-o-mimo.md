# MiMo advisor — Review this RFC 5545 .ics builder for REAL correctness bugs only (P0/P1/P2). Focus: escapeText escaping order/completeness (does it miss any RFC 5545 TEXT special char? note RFC 5545 does NOT require escaping colon; line folding at 75 octets is absent — is that a real interop bug?), formatICSDate UTC correctness, default-end computation, the CRLF line structure, and the zone-less ISO 'start' string being read via getUTC* (timezone correctness). Report only concrete bugs with input->wrong-output.

Files: src/lib/buildICS.ts

## Findings

### P1 · `URL` property is TEXT-escaped — corrupts real URLs

`escapeText()` is applied to `input.url`. RFC 5545 §3.8.4.6 defines `URL` as a **URI** value type — it must NOT receive TEXT escaping. Any booking URL containing a comma or semicolon in query params gets silently corrupted.

```
input.url = "https://booking.example.com/rsvp?ref=abc,xyz"
output →   URL:https://booking.example.com/rsvp?ref=abc\,xyz   ← broken link
```

**Fix:** Remove `escapeText` wrapping for the URL line:
```ts
input.url ? `URL:${input.url}` : "",
```

---

### Everything else is correct

- **`escapeText` completeness:** `\ ; ,` newline — all four RFC 5545 §3.3.11 specials handled. Colon correctly left unescaped. Backslash-replacement done first so later replacements aren't double-escaped. ✓
- **Line folding (75-octet SHOULD):** Not a real interop bug — Google Calendar, Apple Calendar, and Outlook all consume folded-and-unfolded lines identically. Acceptable for a confirmation-download use case.
- **`formatICSDate` UTC:** `getUTC*` methods + `"Z"` suffix → correct UTC output. ✓
- **Zone-less ISO `"2026-05-12T19:00:00"` → `new Date()` → `getUTC*`:** Browser parses as local time, `getUTC*` converts to UTC, `"Z"` suffix marks it correctly. Calendar app renders the intended local wall-clock time. ✓
- **Default end (`start + 1h`):** `getTime()` arithmetic is timezone-unaware epoch math. Correct. ✓
- **CRLF join:** `lines.join("\r\n")` matches RFC 5545 §3.1. ✓
