import { describe, expect, it } from "vitest";
import { formatChatDateLabel } from "./dateLabels";

describe("formatChatDateLabel", () => {
  const now = new Date("2026-05-27T12:00:00");

  it("uses relative chat day labels", () => {
    expect(formatChatDateLabel("2026-05-27T08:00:00", now)).toBe("Today");
    expect(formatChatDateLabel("2026-05-26T08:00:00", now)).toBe("Yesterday");
    expect(formatChatDateLabel("2026-05-25T08:00:00", now)).toBe("Monday");
  });

  it("falls back to calendar dates for older messages", () => {
    expect(formatChatDateLabel("2026-05-01T08:00:00", now)).toBe("May 1");
    expect(formatChatDateLabel("2025-12-31T08:00:00", now)).toBe("Dec 31, 2025");
  });
});
