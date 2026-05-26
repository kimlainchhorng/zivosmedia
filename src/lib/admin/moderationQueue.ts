export type ModerationContentKind = "user_post" | "post_comment" | "direct_message" | "group_message" | "unknown";

export type ModerationReviewAction = "confirm_hidden" | "dismiss" | "unhide_false_positive";

export interface ModerationActionOutcome {
  queueStatus: "actioned" | "dismissed";
  auditActionType: "content_hidden" | "report_dismissed" | "content_unhidden";
  successLabel: string;
}

const CONTENT_LABELS: Record<ModerationContentKind, string> = {
  user_post: "Post",
  post_comment: "Comment",
  direct_message: "Direct message",
  group_message: "Group message",
  unknown: "Unknown",
};

export function normalizeModerationContentType(contentType?: string | null): ModerationContentKind {
  switch ((contentType || "").trim()) {
    case "post":
    case "user_post":
      return "user_post";
    case "comment":
    case "post_comment":
      return "post_comment";
    case "chat_message":
    case "direct_message":
      return "direct_message";
    case "group_message":
      return "group_message";
    default:
      return "unknown";
  }
}

export function getModerationContentLabel(contentType?: string | null): string {
  return CONTENT_LABELS[normalizeModerationContentType(contentType)];
}

export function isPendingModerationStatus(status?: string | null): boolean {
  return !status || status === "pending";
}

export function getModerationActionOutcome(action: ModerationReviewAction): ModerationActionOutcome {
  switch (action) {
    case "confirm_hidden":
      return {
        queueStatus: "actioned",
        auditActionType: "content_hidden",
        successLabel: "Report actioned",
      };
    case "unhide_false_positive":
      return {
        queueStatus: "dismissed",
        auditActionType: "content_unhidden",
        successLabel: "Content restored",
      };
    case "dismiss":
    default:
      return {
        queueStatus: "dismissed",
        auditActionType: "report_dismissed",
        successLabel: "Report dismissed",
      };
  }
}

export function getModerationStatusLabel(status?: string | null): string {
  if (isPendingModerationStatus(status)) return "Pending";
  if (status === "actioned") return "Actioned";
  if (status === "dismissed") return "Dismissed";
  if (status === "resolved") return "Resolved";
  return status || "Pending";
}
