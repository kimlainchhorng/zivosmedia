import { describe, expect, it } from "vitest";
import { parseRichText, applyFormat, stripRichText, hasRichMarkers, type RichNode } from "./richText";

// Compact helper: serialize the node tree to a readable string for assertions.
// "hi **b**" -> "hi |b{b}" where b{...} = bold, i{} italic, s{} strike, c{} code, sp{} spoiler.
function ser(nodes: RichNode[]): string {
  const tag: Record<string, string> = { bold: "b", italic: "i", strike: "s", code: "c", spoiler: "sp" };
  return nodes
    .map((n) => (n.type === "text" ? n.value : `${tag[n.mark]}{${ser(n.children)}}`))
    .join("");
}

describe("parseRichText", () => {
  it("parses each marker", () => {
    expect(ser(parseRichText("**bold**"))).toBe("b{bold}");
    expect(ser(parseRichText("_italic_"))).toBe("i{italic}");
    expect(ser(parseRichText("~~strike~~"))).toBe("s{strike}");
    expect(ser(parseRichText("`code`"))).toBe("c{code}");
    expect(ser(parseRichText("||secret||"))).toBe("sp{secret}");
  });

  it("mixes plain text and marks", () => {
    expect(ser(parseRichText("hi **there** friend"))).toBe("hi b{there} friend");
  });

  it("nests marks (bold > italic)", () => {
    expect(ser(parseRichText("**bold _and_ italic**"))).toBe("b{bold i{and} italic}");
  });

  it("treats inline code contents as literal", () => {
    expect(ser(parseRichText("`a**b**c`"))).toBe("c{a**b**c}");
  });

  it("does not format mid-word or non-boundary markers", () => {
    expect(ser(parseRichText("snake_case_name"))).toBe("snake_case_name");
    expect(ser(parseRichText("2*3*4"))).toBe("2*3*4");
    expect(ser(parseRichText("a~b~c"))).toBe("a~b~c");
  });

  it("leaves unmatched markers as literal text", () => {
    expect(ser(parseRichText("**oops"))).toBe("**oops");
    expect(ser(parseRichText("no _close here"))).toBe("no _close here");
  });

  it("round-trips plain text", () => {
    expect(ser(parseRichText("just a normal message"))).toBe("just a normal message");
  });
});

describe("hasRichMarkers", () => {
  it("is false for plain text", () => {
    expect(hasRichMarkers("hello world")).toBe(false);
  });
  it("is true when any marker char is present", () => {
    expect(hasRichMarkers("a **b**")).toBe(true);
    expect(hasRichMarkers("a ||b||")).toBe(true);
  });
});

describe("stripRichText", () => {
  it("removes formatting markers", () => {
    expect(stripRichText("**bold** and _italic_")).toBe("bold and italic");
    expect(stripRichText("`code` here")).toBe("code here");
  });
  it("leaves plain text untouched", () => {
    expect(stripRichText("nothing to strip")).toBe("nothing to strip");
  });
});

describe("applyFormat", () => {
  it("wraps a selection", () => {
    const r = applyFormat("hello world", 0, 5, "bold");
    expect(r.text).toBe("**hello** world");
    expect([r.selStart, r.selEnd]).toEqual([2, 7]);
  });

  it("inserts paired markers with caret between on empty selection", () => {
    const r = applyFormat("ab", 1, 1, "italic");
    expect(r.text).toBe("a__b");
    expect([r.selStart, r.selEnd]).toEqual([2, 2]);
  });

  it("unwraps a selection that is already wrapped (inside)", () => {
    const r = applyFormat("**hello** world", 0, 9, "bold");
    expect(r.text).toBe("hello world");
    expect([r.selStart, r.selEnd]).toEqual([0, 5]);
  });

  it("unwraps when markers sit just outside the selection", () => {
    // selection covers "hello" only; the ** are immediately around it
    const r = applyFormat("**hello** world", 2, 7, "bold");
    expect(r.text).toBe("hello world");
    expect([r.selStart, r.selEnd]).toEqual([0, 5]);
  });

  it("handles reversed selection bounds", () => {
    const r = applyFormat("hi", 2, 0, "code");
    expect(r.text).toBe("`hi`");
  });
});
