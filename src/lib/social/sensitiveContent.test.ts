import { describe, expect, it } from "vitest";
import {
  detectSensitiveContent,
  isChatMessageSafetySchemaDriftError,
  isCommentSafetySchemaDriftError,
  isGroupMessageSafetySchemaDriftError,
  isSensitiveReportReason,
  isStoryCommentSafetySchemaDriftError,
  isStorySafetySchemaDriftError,
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

  // detectSensitiveContent gates a HARD rejection on post and comment creation,
  // so both directions matter: an adult caption must be caught, and ordinary
  // "18+" copy must NOT be accused of being explicit.
  describe("the 18+ marker", () => {
    it.each([
      "18+ only",
      "18+ content",
      "18+ material",
      "NSFW 18+",
      "adult 18+",
      "xxx 18+",
    ])("treats %j as adult material", (caption) => {
      expect(detectSensitiveContent(caption).isSensitive).toBe(true);
    });

    // Ordinary copy in a super-app carrying job ads, venue rules and service
    // listings. Blocking these would tell the poster their listing is porn.
    it.each([
      "18+ years experience",
      "Open to 18+ applicants",
      "must be 18+ to enter",
      "ages 18+",
      "18+ yrs in the trade",
    ])("leaves %j alone", (caption) => {
      expect(detectSensitiveContent(caption).isSensitive).toBe(false);
    });

    // The rule this replaced was /\b18\+\b/i, which could only ever match the
    // glued form: \b after "+" demands a following word character. It caught no
    // real caption, so the marker was dead in production.
    it("catches the spacing the old boundary-anchored rule could not", () => {
      expect(detectSensitiveContent("18+ only").isSensitive).toBe(true);
      expect(/\b18\+\b/i.test("18+ only")).toBe(false);
    });
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

  it("recognizes missing story safety migration errors", () => {
    expect(isStorySafetySchemaDriftError({ message: "relation public.story_reports does not exist" })).toBe(true);
    expect(isStorySafetySchemaDriftError({ message: "Could not find the hidden_at column of stories" })).toBe(true);
    expect(isStorySafetySchemaDriftError({ message: "network timeout" })).toBe(false);
  });

  it("recognizes missing story comment safety migration errors", () => {
    expect(isStoryCommentSafetySchemaDriftError({ message: "relation public.story_comment_reports does not exist" })).toBe(true);
    expect(isStoryCommentSafetySchemaDriftError({ message: "Could not find the hidden_at column of story_comments" })).toBe(true);
    expect(isStoryCommentSafetySchemaDriftError({ message: "network timeout" })).toBe(false);
  });
});
