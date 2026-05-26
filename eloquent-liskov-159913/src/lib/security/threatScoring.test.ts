import { describe, it, expect } from "vitest";
import { scoreThreatHistory, threatVerdict, type ThreatHistoryRow } from "./threatScoring";

const row = (over: Partial<ThreatHistoryRow>): ThreatHistoryRow => ({
  source: "security_events",
  total_count: 0,
  blocked_count: 0,
  max_severity: null,
  last_seen: new Date().toISOString(),
  sample: [],
  ...over,
});

describe("scoreThreatHistory", () => {
  it("returns 0 for no signals", () => {
    expect(scoreThreatHistory([])).toBe(0);
  });

  it("ip_blocklist hit caps the score at 100", () => {
    expect(scoreThreatHistory([row({ source: "ip_blocklist", total_count: 1 })])).toBe(100);
  });

  it("blocked_link_attempts contributes 8 per row", () => {
    const got = scoreThreatHistory([row({ source: "blocked_link_attempts", total_count: 3 })]);
    expect(got).toBe(24);
  });

  it("security_events use blocked_count, not total_count", () => {
    const got = scoreThreatHistory([row({
      source: "security_events", total_count: 100, blocked_count: 5,
    })]);
    expect(got).toBe(20); // 5 * 4
  });

  it("security_incidents only count if severity is high or critical", () => {
    expect(scoreThreatHistory([row({
      source: "security_incidents", blocked_count: 2, max_severity: "medium",
    })])).toBe(0);
    expect(scoreThreatHistory([row({
      source: "security_incidents", blocked_count: 2, max_severity: "high",
    })])).toBe(50); // 2 * 25
    expect(scoreThreatHistory([row({
      source: "security_incidents", blocked_count: 1, max_severity: "critical",
    })])).toBe(25);
  });

  it("chat_security_events contributes 6 per blocked row", () => {
    expect(scoreThreatHistory([row({
      source: "chat_security_events", blocked_count: 4,
    })])).toBe(24);
  });

  it("scores stack across sources", () => {
    const got = scoreThreatHistory([
      row({ source: "blocked_link_attempts", total_count: 2 }),         // 16
      row({ source: "security_events", blocked_count: 3 }),              // 12
      row({ source: "chat_security_events", blocked_count: 1 }),         //  6
    ]);
    expect(got).toBe(34);
  });

  it("clamps to 100", () => {
    const got = scoreThreatHistory([
      row({ source: "blocked_link_attempts", total_count: 50 }),         // 400
      row({ source: "security_events", blocked_count: 10 }),
    ]);
    expect(got).toBe(100);
  });

  it("ignores unknown sources", () => {
    expect(scoreThreatHistory([row({ source: "made_up", total_count: 999 })])).toBe(0);
  });
});

describe("threatVerdict", () => {
  it("0 → clean", () => expect(threatVerdict(0)).toBe("clean"));
  it("9 → clean", () => expect(threatVerdict(9)).toBe("clean"));
  it("10 → watch", () => expect(threatVerdict(10)).toBe("watch"));
  it("29 → watch", () => expect(threatVerdict(29)).toBe("watch"));
  it("30 → high",  () => expect(threatVerdict(30)).toBe("high"));
  it("69 → high",  () => expect(threatVerdict(69)).toBe("high"));
  it("70 → critical",  () => expect(threatVerdict(70)).toBe("critical"));
  it("100 → critical", () => expect(threatVerdict(100)).toBe("critical"));
});
