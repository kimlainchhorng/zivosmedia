import { describe, expect, it } from "vitest";
import { normalizeChatMessageNavigationRows, type ChatMessageNavigationRow } from "./chatMessageNavigatorModel";

describe("chatMessageNavigatorModel", () => {
  it("normalizes direct-message search and pinned rows", () => {
    const rows: ChatMessageNavigationRow[] = [
      {
        id: "m-1",
        sender_id: "me",
        receiver_id: "peer",
        message: "hello search",
        message_type: "text",
        created_at: "2026-05-27T10:00:00Z",
        is_pinned: true,
      },
      {
        id: "m-2",
        sender_id: "peer",
        receiver_id: "me",
        message: "",
        message_type: "file",
        created_at: "2026-05-27T10:01:00Z",
        file_payload: { filename: "report.pdf" },
      },
    ];

    const items = normalizeChatMessageNavigationRows(rows, {
      sourceType: "dm",
      chatId: "peer",
      currentUserId: "me",
      peerLabel: "Alex",
    });

    expect(items).toEqual([
      expect.objectContaining({
        messageId: "m-1",
        sourceType: "dm",
        chatId: "peer",
        senderLabel: "You",
        body: "hello search",
        previewLabel: "hello search",
        isPinned: true,
      }),
      expect.objectContaining({
        messageId: "m-2",
        senderLabel: "Alex",
        body: "report.pdf",
        previewLabel: "report.pdf",
        messageType: "file",
      }),
    ]);
  });

  it("normalizes group sender labels and excludes hidden, expired, and optimistic rows", () => {
    const rows: ChatMessageNavigationRow[] = [
      {
        id: "g-visible",
        sender_id: "u-1",
        group_id: "group-1",
        message: "",
        message_type: "voice",
        voice_url: "voice.webm",
        created_at: "2026-05-27T10:00:00Z",
      },
      {
        id: "g-hidden",
        sender_id: "u-2",
        group_id: "group-1",
        message: "hidden",
        created_at: "2026-05-27T10:01:00Z",
        hidden_at: "2026-05-27T10:02:00Z",
      },
      {
        id: "g-expired",
        sender_id: "u-2",
        group_id: "group-1",
        message: "expired",
        created_at: "2026-05-27T10:03:00Z",
        expires_at: "2026-05-27T10:04:00Z",
      },
      {
        id: "opt-local",
        sender_id: "me",
        group_id: "group-1",
        message: "local",
        created_at: "2026-05-27T10:05:00Z",
      },
    ];

    const items = normalizeChatMessageNavigationRows(rows, {
      sourceType: "group",
      chatId: "group-1",
      currentUserId: "me",
      now: new Date("2026-05-27T10:06:00Z"),
      senderLabelFor: (senderId) => senderId === "u-1" ? "Nita" : "Member",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      messageId: "g-visible",
      sourceType: "group",
      senderLabel: "Nita",
      body: "Voice message",
      previewLabel: "Voice message",
    });
  });
});
