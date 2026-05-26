import { describe, expect, it } from "vitest";
import {
  detectSensitiveContent,
  isChatMessageSafetySchemaDriftError,
  isCommentSafetySchemaDriftError,
  isGroupMessageSafetySchemaDriftError,
  isSensitiveReportReason,
} from "./sensitiveContent";

describe("sensitiveContent", () => {
  it("detects creator-marked sensitive media", () => {
    expect(detectSensitiveContent("hello", { creatorMarked: true })).toMatchObject({
      isSensitive: true,
      reason: "creator_marked",
    });
  });

  it("detects adult and sexual wording without matching unrelated words", () => {
    expect(detectSensitiveContent("18+ adult content").isSensitive).toBe(true);
    expect(detectSensitiveContent("sexual content").isSensitive).toBe(true);
    expect(detectSensitiveContent("A post about Essex travel").isSensitive).toBe(false);
  });

  it("recognizes sexual report reasons", () => {
    expect(isSensitiveReportReason("Nudity or sexual content", "Non-consensual imagery")).toBe(true);
    expect(isSensitiveReportReason("Spam", "Clickbait")).toBe(false);
  });

  it("recognizes missing comment safety migration errors", () => {
    expect(isCommentSafetySchemaDriftError({ message: "relation public.comment_reports does not exist" })).toBe(true);
    expect(isCommentSafetySchemaDriftError({ message: "network timeout" })).toBe(false);
  });

  it("recognizes missing chat message safety migration errors", () => {
    expect(isChatMessageSafetySchemaDriftError({ message: "Could not find the hidden_at column of direct_messages" })).toBe(true);
    expect(isChatMessageSafetySchemaDriftError({ message: "network timeout" })).toBe(false);
  });

  it("recognizes missing group message safety migration errors", () => {
    expect(isGroupMessageSafetySchemaDriftError({ message: "relation public.group_message_reports does not exist" })).toBe(true);
    expect(isGroupMessageSafetySchemaDriftError({ message: "Could not find the hidden_at column of group_messages" })).toBe(true);
    expect(isGroupMessageSafetySchemaDriftError({ message: "network timeout" })).toBe(false);
  });
});
