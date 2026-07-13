export type ChatMessageNavigatorSourceType = "dm" | "group";
export type ChatMessageNavigatorMode = "search" | "pinned";

export interface ChatMessageNavigationRow {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  group_id?: string | null;
  message?: string | null;
  message_type?: string | null;
  created_at: string;
  is_pinned?: boolean | null;
  hidden_at?: string | null;
  expires_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: Record<string, unknown> | null;
}

export interface ChatMessageNavigationItem {
  messageId: string;
  sourceType: ChatMessageNavigatorSourceType;
  chatId: string;
  senderId: string;
  senderLabel: string;
  body: string;
  previewLabel: string;
  createdAt: string;
  isPinned: boolean;
  messageType: string;
}

interface NormalizeOptions {
  sourceType: ChatMessageNavigatorSourceType;
  chatId: string;
  currentUserId?: string | null;
  peerLabel?: string;
  senderLabelFor?: (senderId: string) => string;
  now?: Date;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasExpired(row: ChatMessageNavigationRow, now: Date) {
  if (!row.expires_at) return false;
  const time = Date.parse(row.expires_at);
  return Number.isFinite(time) && time <= now.getTime();
}

export function isVisibleNavigationRow(row: ChatMessageNavigationRow, now: Date = new Date()) {
  return !row.hidden_at && !hasExpired(row, now) && !row.id.startsWith("opt-");
}

export function getMessagePreviewLabel(row: ChatMessageNavigationRow) {
  const type = (row.message_type || "text").toLowerCase();
  const payload = row.file_payload || {};
  const filename =
    asString(payload.filename) ||
    asString(payload.fileName) ||
    asString(payload.name) ||
    asString(payload.title);
  const question = asString(payload.question);
  const contactName = asString(payload.full_name);
  const platform = asString(payload.platform_label) || asString(payload.platform);
  const title = asString(payload.title);
  const message = asString(row.message);

  if (message && !["image", "video", "voice", "file", "media_album", "locked_image", "locked_video", "locked_album"].includes(type)) {
    return message;
  }
  if (type === "image" || type === "locked_image" || row.image_url) return "Photo";
  if (type === "video" || type === "locked_video" || row.video_url) return "Video";
  if (type === "voice" || type === "voice_note" || row.voice_url) return "Voice message";
  if (type === "gif") return title || filename || "GIF";
  if (type === "music" || type === "audio") return title || filename || "Music";
  if (type === "media_album" || type === "locked_album") return "Album";
  if (type === "poll") return question ? `Poll: ${question}` : "Poll";
  if (type === "contact") return contactName ? `Contact: ${contactName}` : "Contact";
  if (type === "social") return platform ? `${platform} link` : "Social link";
  if (type === "zivo_card") return title || "ZIVO card";
  if (type === "file" || type === "document") return filename || "File";
  return message || filename || "Message";
}

export function normalizeChatMessageNavigationRows(
  rows: ChatMessageNavigationRow[],
  options: NormalizeOptions,
): ChatMessageNavigationItem[] {
  const now = options.now ?? new Date();
  return rows
    .filter((row) => isVisibleNavigationRow(row, now))
    .map((row) => {
      const messageType = row.message_type || "text";
      const previewLabel = getMessagePreviewLabel(row);
      const body = asString(row.message) || previewLabel;
      const senderLabel = row.sender_id === options.currentUserId
        ? "You"
        : options.senderLabelFor?.(row.sender_id) || options.peerLabel || (options.sourceType === "group" ? "Member" : "Contact");

      return {
        messageId: row.id,
        sourceType: options.sourceType,
        chatId: options.chatId,
        senderId: row.sender_id,
        senderLabel,
        body,
        previewLabel,
        createdAt: row.created_at,
        isPinned: Boolean(row.is_pinned),
        messageType,
      };
    });
}
