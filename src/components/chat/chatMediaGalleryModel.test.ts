import { describe, expect, it } from "vitest";
import { normalizeChatMediaMessages, type ChatMediaGalleryMessage } from "./chatMediaGalleryModel";

describe("chatMediaGalleryModel", () => {
  it("normalizes direct-message media into every shared media tab", () => {
    const rows: ChatMediaGalleryMessage[] = [
      {
        id: "photo-1",
        sender_id: "me",
        created_at: "2026-05-27T10:00:00Z",
        message_type: "image",
        message: "photo",
        image_url: "me/photo.jpg",
      },
      {
        id: "video-1",
        sender_id: "them",
        created_at: "2026-05-27T10:01:00Z",
        message_type: "video",
        message: "video",
        video_url: "them/video.mp4",
        file_payload: { duration_ms: 9_000 },
      },
      {
        id: "gif-1",
        sender_id: "me",
        created_at: "2026-05-27T10:02:00Z",
        message_type: "text",
        message: "[gif] clap: https://media.example.com/clap.gif",
      },
      {
        id: "voice-1",
        sender_id: "them",
        created_at: "2026-05-27T10:03:00Z",
        message_type: "voice",
        message: "voice",
        voice_url: "them/voice.webm",
        file_payload: { duration_ms: 5_000 },
      },
      {
        id: "music-1",
        sender_id: "me",
        created_at: "2026-05-27T10:04:00Z",
        message_type: "file",
        message: "track",
        file_payload: { url: "me/track.mp3", filename: "track.mp3", mime_type: "audio/mpeg" },
      },
      {
        id: "file-1",
        sender_id: "them",
        created_at: "2026-05-27T10:05:00Z",
        message_type: "file",
        message: "report",
        file_payload: { url: "them/report.pdf", filename: "report.pdf", mime_type: "application/pdf" },
      },
      {
        id: "link-1",
        sender_id: "me",
        created_at: "2026-05-27T10:06:00Z",
        message_type: "text",
        message: "visit https://example.com and javascript:alert(1)",
      },
    ];

    const items = normalizeChatMediaMessages(rows, { currentUserId: "me", peerName: "Alex" });

    expect(items.map((item) => item.kind)).toEqual(["photos", "videos", "gif", "voice", "music", "files", "links"]);
    expect(items.find((item) => item.kind === "photos")).toMatchObject({ messageId: "photo-1", senderLabel: "You", cacheBucket: "photos" });
    expect(items.find((item) => item.kind === "videos")).toMatchObject({ durationMs: 9_000, cacheBucket: "videos" });
    expect(items.find((item) => item.kind === "music")).toMatchObject({ title: "track.mp3", cacheBucket: "audio" });
    expect(items.find((item) => item.kind === "files")).toMatchObject({ title: "report.pdf", cacheBucket: "files" });
    expect(items.find((item) => item.kind === "links")).toMatchObject({ url: "https://example.com", cacheBucket: "other" });
    expect(items.some((item) => item.url.startsWith("javascript:"))).toBe(false);
  });

  it("normalizes group senders and locked media previews without exposing originals", () => {
    const rows: ChatMediaGalleryMessage[] = [
      {
        id: "locked-1",
        sender_id: "creator",
        created_at: "2026-05-27T11:00:00Z",
        message_type: "locked_album",
        message: "locked",
        image_url: "creator/locked/original.jpg",
        file_payload: {
          locked_items: [
            { kind: "image", original_path: "creator/locked/original.jpg", preview_path: "creator/locked-previews/preview.jpg", size: 1234 },
            { kind: "video", original_path: "creator/locked/original.mp4", preview_path: "creator/locked-previews/preview-video.jpg" },
          ],
        },
      },
    ];

    const lockedItems = normalizeChatMediaMessages(rows, {
      currentUserId: "member",
      senderLabelFor: (senderId) => senderId === "creator" ? "Creator" : "Member",
      isMessageUnlocked: () => false,
    });

    expect(lockedItems).toHaveLength(2);
    expect(lockedItems.map((item) => item.url)).toEqual([
      "creator/locked-previews/preview.jpg",
      "creator/locked-previews/preview-video.jpg",
    ]);
    expect(lockedItems.every((item) => item.locked)).toBe(true);
    expect(lockedItems.every((item) => item.cacheKind === "locked-preview")).toBe(true);
    expect(lockedItems[0].senderLabel).toBe("Creator");

    const unlockedItems = normalizeChatMediaMessages(rows, {
      currentUserId: "member",
      isMessageUnlocked: () => true,
    });

    expect(unlockedItems.map((item) => item.url)).toEqual([
      "creator/locked/original.jpg",
      "creator/locked/original.mp4",
    ]);
    expect(unlockedItems.every((item) => item.cacheKind === "locked-original")).toBe(true);

    const senderItems = normalizeChatMediaMessages(rows, {
      currentUserId: "creator",
      isMessageUnlocked: () => false,
    });

    expect(senderItems.map((item) => item.url)).toEqual([
      "creator/locked/original.jpg",
      "creator/locked/original.mp4",
    ]);
    expect(senderItems.every((item) => item.locked)).toBe(false);
  });

  it("normalizes media album payload items from album_items", () => {
    const rows: ChatMediaGalleryMessage[] = [
      {
        id: "album-1",
        sender_id: "me",
        created_at: "2026-05-27T12:00:00Z",
        message_type: "media_album",
        message: "album",
        image_url: "album/cover.jpg",
        file_payload: {
          album_items: [
            { url: "album/photo.jpg", kind: "image" },
            { url: "album/video.mp4", kind: "video", duration_seconds: 3 },
            { url: "album/animated.gif", mime_type: "image/gif", filename: "animated.gif" },
          ],
        },
      },
    ];

    const items = normalizeChatMediaMessages(rows, { currentUserId: "me" });

    expect(items.map((item) => item.kind)).toEqual(["photos", "videos", "gif"]);
    expect(items).toHaveLength(3);
    expect(items[1]).toMatchObject({ messageId: "album-1", durationMs: 3_000, cacheBucket: "videos" });
    expect(items[2]).toMatchObject({ title: "animated.gif", cacheBucket: "photos" });
  });
});
