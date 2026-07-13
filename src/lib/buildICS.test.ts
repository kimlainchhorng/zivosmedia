/**
 * Contract tests for buildICS — the RFC 5545 .ics generator used by booking
 * confirmations.
 *
 * Two parts of the output are non-deterministic: the DTSTAMP line (uses
 * `new Date()`) and the default UID (uses Date.now()+Math.random()). So every
 * test passes an explicit `uid` and masks the DTSTAMP line (asserting only that
 * it matches /^DTSTAMP:\d{8}T\d{6}Z$/) before comparing. Dates are passed as ISO
 * strings WITH a trailing "Z" so formatICSDate's getUTC* output is independent
 * of the machine timezone. Values are grounded by an independent clean-room
 * oracle (Node v22) that does NOT import this module.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - escapeText escapes the backslash FIRST, so a literal "\," becomes THREE
 *     backslashes + comma — escaping comma first would corrupt it;
 *   - every line-break form ("\n", "\r\n", lone "\r") collapses to the "\n"
 *     escape (a raw CR left in a value would corrupt the .ics line structure);
 *   - a colon is NOT escaped (RFC 5545 TEXT doesn't require it), so URLs survive;
 *   - lines are joined with "\r\n";
 *   - DTEND defaults to DTSTART + 1 hour when `end` is omitted;
 *   - optional DESCRIPTION / LOCATION / URL lines are dropped when absent.
 */
import { describe, it, expect } from "vitest";
import { buildICS } from "./buildICS";

const linesOf = (ics: string): string[] => ics.split("\r\n");

/** Assert the DTSTAMP line is well-formed, then replace it with a stable token. */
function maskDTSTAMP(lines: string[]): string[] {
  const i = lines.findIndex((l) => l.startsWith("DTSTAMP:"));
  expect(i).not.toBe(-1);
  expect(lines[i]).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  const masked = [...lines];
  masked[i] = "DTSTAMP:<MASK>";
  return masked;
}

const summaryOf = (ics: string): string | undefined =>
  linesOf(ics).find((l) => l.startsWith("SUMMARY:"));

describe("buildICS — full structure", () => {
  it("emits every line with escaping applied, in order", () => {
    const ics = buildICS({
      title: "Dinner, 7pm",
      description: "Table for 2; window\nseat",
      location: "Café; downtown",
      url: "https://zivo.app/x",
      start: "2026-05-12T19:00:00Z",
      uid: "evt-1@zivo.app",
    });
    expect(maskDTSTAMP(linesOf(ics))).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZIVO//Concierge//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:evt-1@zivo.app",
      "DTSTAMP:<MASK>",
      "DTSTART:20260512T190000Z",
      "DTEND:20260512T200000Z",
      "SUMMARY:Dinner\\, 7pm",
      "DESCRIPTION:Table for 2\\; window\\nseat",
      "LOCATION:Café\\; downtown",
      "URL:https://zivo.app/x",
      "END:VEVENT",
      "END:VCALENDAR",
    ]);
  });

  it("drops optional lines and defaults DTEND to start + 1h", () => {
    const ics = buildICS({ title: "Hold", start: "2026-05-12T19:00:00Z", uid: "u2" });
    expect(maskDTSTAMP(linesOf(ics))).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZIVO//Concierge//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:u2",
      "DTSTAMP:<MASK>",
      "DTSTART:20260512T190000Z",
      "DTEND:20260512T200000Z",
      "SUMMARY:Hold",
      "END:VEVENT",
      "END:VCALENDAR",
    ]);
  });

  it("honors an explicit end over the default", () => {
    const ics = buildICS({
      title: "Explicit End",
      start: "2026-05-12T19:00:00Z",
      end: "2026-05-13T01:00:00Z",
      uid: "u3",
    });
    expect(linesOf(ics).find((l) => l.startsWith("DTEND:"))).toBe("DTEND:20260513T010000Z");
  });

  it("DTSTAMP is a valid UTC stamp", () => {
    const ics = buildICS({ title: "Test", start: "2026-05-12T19:00:00Z", uid: "u4" });
    expect(linesOf(ics)).toContainEqual(expect.stringMatching(/^DTSTAMP:\d{8}T\d{6}Z$/));
  });

  it("joins lines with CRLF", () => {
    const ics = buildICS({ title: "Test", start: "2026-05-12T19:00:00Z", uid: "u11" });
    expect(ics).toContain("\r\n");
    expect(linesOf(ics).length).toBeGreaterThan(1);
  });
});

describe("buildICS — escapeText rules (via SUMMARY)", () => {
  const summaryFor = (title: string) =>
    summaryOf(buildICS({ title, start: "2026-05-12T19:00:00Z", uid: "esc" }));

  it("doubles a backslash", () => {
    expect(summaryFor("a\\b")).toBe("SUMMARY:a\\\\b");
  });

  it("escapes a comma", () => {
    expect(summaryFor("a,b")).toBe("SUMMARY:a\\,b");
  });

  it("escapes a semicolon", () => {
    expect(summaryFor("a;b")).toBe("SUMMARY:a\\;b");
  });

  it("collapses every line-break form to \\n", () => {
    expect(summaryFor("a\nb")).toBe("SUMMARY:a\\nb");
    expect(summaryFor("a\r\nb")).toBe("SUMMARY:a\\nb");
    expect(summaryFor("a\rb")).toBe("SUMMARY:a\\nb");
  });

  it("escapes the backslash FIRST, so \\, becomes three backslashes + comma", () => {
    expect(summaryFor("\\,")).toBe("SUMMARY:\\\\\\,");
  });

  it("does NOT escape a colon", () => {
    expect(summaryFor("http://x:8080/a")).toBe("SUMMARY:http://x:8080/a");
  });
});
