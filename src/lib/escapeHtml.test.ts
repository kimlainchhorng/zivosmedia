/**
 * Contract tests for escapeHtml — the XSS guard behind the autorepair print/QR
 * builders. Those builders assemble standalone HTML documents from stored shop
 * data (customer name, vehicle, plate, VIN, notes, line-items) and hand them to
 * document.write / printOrShareHtml in a window that shares the app's origin, so an
 * unescaped `<img onerror>` in any free-text field would execute as same-origin XSS.
 * Two parts of the behavior are load-bearing and pinned here: (1) `&` is escaped
 * FIRST, so the entities introduced by the later replacements are not double-escaped;
 * (2) the input is coerced via `String(value ?? "")` — nullish, not falsy — so a
 * numeric 0 or boolean false renders its text rather than being silently blanked.
 *
 * The oracle is an independent clean-room reimplementation of the documented rule
 * (escape order + the exact entity set, incl. the numeric `&#39;` for apostrophe),
 * not the module itself.
 */
import { describe, it, expect } from "vitest";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapes each HTML-significant character to its entity", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"q"')).toBe("&quot;q&quot;");
    expect(escapeHtml("it's")).toBe("it&#39;s"); // apostrophe -> numeric entity
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes & first so existing entities are not double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("neutralizes an injected <img onerror> payload", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("coerces input with nullish (not falsy) semantics", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(0)).toBe("0"); // 0 is kept, not blanked
    expect(escapeHtml(123)).toBe("123");
    expect(escapeHtml(false)).toBe("false"); // false is kept, not blanked
  });

  it("leaves safe plain text untouched", () => {
    expect(escapeHtml("Honda Civic LX")).toBe("Honda Civic LX");
  });
});
