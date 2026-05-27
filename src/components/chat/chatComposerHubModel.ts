export type ChatComposerSource =
  | { type: "dm"; chatId: string; title: string; canSchedule: true }
  | { type: "group"; chatId: string; title: string; canSchedule: false };

export type ComposerActionSection = "media" | "tools" | "money" | "privacy" | "schedule";

export type ComposerActionId =
  | "photo"
  | "video"
  | "gif"
  | "music"
  | "file"
  | "scan"
  | "location"
  | "contact"
  | "poll"
  | "miniapp"
  | "social"
  | "zivo"
  | "gift"
  | "wallet"
  | "sensitive"
  | "locked"
  | "locked-text"
  | "disappearing"
  | "schedule"
  | "scheduled";

export type ComposerIconKey =
  | "image"
  | "video"
  | "gif"
  | "music"
  | "file"
  | "scan"
  | "location"
  | "contact"
  | "poll"
  | "miniapp"
  | "social"
  | "zivo"
  | "gift"
  | "wallet"
  | "sensitive"
  | "lock"
  | "timer"
  | "calendar"
  | "list";

export interface ComposerAction {
  id: ComposerActionId;
  label: string;
  hint: string;
  icon: ComposerIconKey;
  section: ComposerActionSection;
  enabled: boolean;
  disabledReason?: string;
}

export interface BuildComposerActionsOptions {
  source: ChatComposerSource;
  hasDraftText: boolean;
  canUseLocked?: boolean;
  enabledActionIds?: Partial<Record<ComposerActionId, boolean>>;
  disappearingEnabled?: boolean;
  disappearingLabel?: string;
  sensitiveMediaMarked?: boolean;
}

const ACTION_CATALOG: Array<Omit<ComposerAction, "enabled" | "disabledReason">> = [
  { id: "photo", label: "Photo", hint: "Camera roll", icon: "image", section: "media" },
  { id: "video", label: "Video", hint: "Camera clip", icon: "video", section: "media" },
  { id: "gif", label: "GIF", hint: "Animated image", icon: "gif", section: "media" },
  { id: "music", label: "Music", hint: "Audio file", icon: "music", section: "media" },
  { id: "file", label: "File", hint: "PDF and docs", icon: "file", section: "media" },
  { id: "scan", label: "Scan", hint: "Quick document", icon: "scan", section: "tools" },
  { id: "location", label: "Location", hint: "Share pin", icon: "location", section: "tools" },
  { id: "contact", label: "Contact", hint: "Send profile", icon: "contact", section: "tools" },
  { id: "poll", label: "Poll", hint: "Vote together", icon: "poll", section: "tools" },
  { id: "miniapp", label: "Mini apps", hint: "Open tools", icon: "miniapp", section: "tools" },
  { id: "social", label: "Social", hint: "Share links", icon: "social", section: "tools" },
  { id: "zivo", label: "ZIVO", hint: "App card", icon: "zivo", section: "tools" },
  { id: "gift", label: "Gift", hint: "Send a gift", icon: "gift", section: "money" },
  { id: "wallet", label: "Wallet", hint: "Fast transfer", icon: "wallet", section: "money" },
  { id: "sensitive", label: "18+", hint: "Blur next media", icon: "sensitive", section: "privacy" },
  { id: "locked", label: "Locked", hint: "Paid unlock", icon: "lock", section: "privacy" },
  { id: "locked-text", label: "Paid DM", hint: "Locked message", icon: "lock", section: "privacy" },
  { id: "disappearing", label: "Auto delete", hint: "Disappearing messages", icon: "timer", section: "privacy" },
  { id: "schedule", label: "Schedule", hint: "Send later", icon: "calendar", section: "schedule" },
  { id: "scheduled", label: "Scheduled", hint: "Pending sends", icon: "list", section: "schedule" },
];

export const COMPOSER_ACTION_SECTIONS: ComposerActionSection[] = [
  "media",
  "tools",
  "money",
  "privacy",
  "schedule",
];

export const COMPOSER_SECTION_LABELS: Record<ComposerActionSection, string> = {
  media: "Media",
  tools: "Tools",
  money: "Money",
  privacy: "Privacy",
  schedule: "Schedule",
};

export function getComposerDraftPartnerId(source: ChatComposerSource): string {
  return source.type === "group" ? `group:${source.chatId}` : source.chatId;
}

export function buildComposerActions({
  source,
  hasDraftText,
  canUseLocked = true,
  enabledActionIds = {},
  disappearingEnabled = false,
  disappearingLabel,
  sensitiveMediaMarked = false,
}: BuildComposerActionsOptions): ComposerAction[] {
  return ACTION_CATALOG.map((action) => {
    let label = action.label;
    let hint = action.hint;
    let enabled = enabledActionIds[action.id] ?? true;
    let disabledReason: string | undefined;

    if (action.id === "schedule" || action.id === "scheduled") {
      if (!source.canSchedule) {
        enabled = false;
        disabledReason = "DMs only for now";
      } else if (action.id === "schedule" && !hasDraftText) {
        enabled = false;
        disabledReason = "Write a message first";
      }
    }

    if ((action.id === "locked" || action.id === "locked-text") && !canUseLocked) {
      enabled = false;
      disabledReason = "Requires Chat+ or Pro";
    }

    if (enabledActionIds[action.id] === false && !disabledReason) {
      enabled = false;
      disabledReason = "Not available here";
    }

    if (action.id === "disappearing") {
      label = disappearingLabel ?? (disappearingEnabled ? "Auto delete on" : "Auto delete");
      hint = disappearingEnabled ? "Tap to change timer" : "Set disappearing timer";
    }

    if (action.id === "sensitive" && sensitiveMediaMarked) {
      hint = "Next media will be blurred";
    }

    return {
      ...action,
      label,
      hint,
      enabled,
      disabledReason,
    };
  });
}
