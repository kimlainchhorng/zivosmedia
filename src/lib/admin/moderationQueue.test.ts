import { describe, expect, it } from "vitest";

import {
  getModerationActionOutcome,
  getModerationContentLabel,
  getModerationStatusLabel,
  isPendingModerationStatus,
  normalizeModerationContentType,
} from "./moderationQueue";

describe("moderationQueue", () => {
  it("normalizes legacy and current content types", () => {
    expect(normalizeModerationContentType("post")).toBe("user_post");
    expect(normalizeModerationContentType("user_post")).toBe("user_post");
    expect(normalizeModerationContentType("comment")).toBe("post_comment");
    expect(normalizeModerationContentType("post_comment")).toBe("post_comment");
    expect(normalizeModerationContentType("chat_message")).toBe("direct_message");
    expect(normalizeModerationContentType("direct_message")).toBe("direct_message");
    expect(normalizeModerationContentType("group_message")).toBe("group_message");
    expect(normalizeModerationContentType("story")).toBe("unknown");
  });

  it("returns operator-facing content labels", () => {
    expect(getModerationContentLabel("user_post")).toBe("Post");
    expect(getModerationContentLabel("post_comment")).toBe("Comment");
    expect(getModerationContentLabel("direct_message")).toBe("Direct message");
    expect(getModerationContentLabel("group_message")).toBe("Group message");
    expect(getModerationContentLabel("story")).toBe("Unknown");
  });

  it("maps review actions to queue statuses and audit actions", () => {
    expect(getModerationActionOutcome("confirm_hidden")).toMatchObject({
      queueStatus: "actioned",
      auditActionType: "content_hidden",
    });
    expect(getModerationActionOutcome("dismiss")).toMatchObject({
      queueStatus: "dismissed",
      auditActionType: "report_dismissed",
    });
    expect(getModerationActionOutcome("unhide_false_positive")).toMatchObject({
      queueStatus: "dismissed",
      auditActionType: "content_unhidden",
    });
  });

  it("labels pending and reviewed statuses", () => {
    expect(isPendingModerationStatus(null)).toBe(true);
    expect(isPendingModerationStatus("pending")).toBe(true);
    expect(isPendingModerationStatus("actioned")).toBe(false);
    expect(getModerationStatusLabel(null)).toBe("Pending");
    expect(getModerationStatusLabel("actioned")).toBe("Actioned");
    expect(getModerationStatusLabel("dismissed")).toBe("Dismissed");
  });
});
