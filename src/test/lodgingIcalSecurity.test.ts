import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "supabase/functions/lodging-ical-import/index.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("lodging iCal importer security boundaries", () => {
  it("validates public HTTPS destinations and every redirect hop", () => {
    expect(source).toContain('parsed.protocol !== "https:"');
    expect(source).toContain("isBlockedHostname(hostname)");
    expect(source).toContain('Deno.resolveDns(hostname, "A")');
    expect(source).toContain('Deno.resolveDns(hostname, "AAAA")');
    expect(source).toContain('redirect: "manual"');
    expect(source).toMatch(
      /validateCalendarUrl\(\s*new URL\(location, target\)\.toString\(\),?\s*\)/,
    );
    expect(source).not.toContain('redirect: "follow"');
  });

  it("bounds remote body reads, event parsing, date expansion, and writes", () => {
    expect(source).toContain("MAX_ICAL_BYTES = 1_000_000");
    expect(source).toContain("MAX_ICAL_EVENTS = 500");
    expect(source).toContain("MAX_EVENT_DAYS = 366");
    expect(source).toContain("MAX_IMPORTED_DAYS = 5_000");
    expect(source).toContain("response.body.getReader()");
    expect(source).toContain('response.headers.get("content-length")');
    expect(source).toContain("Calendar response too large");
    expect(source).toContain("Calendar import exceeds write limit");
  });
});
