import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearChatMediaCache,
  getChatMediaCacheStats,
  pruneChatMediaCacheByKeepMedia,
  recordChatMediaCacheEntry,
  type ChatMediaCacheBucket,
} from "./mediaCache";

describe("chat media cache tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("tracks rendered chat media by user and keeps stable storage paths unique", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);

    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/photo.jpg?token=first",
      storagePath: "user-2/images/photo.jpg",
      bucket: "photos",
      bytes: 2048,
    });
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/photo.jpg?token=second",
      storagePath: "user-2/images/photo.jpg",
      bucket: "photos",
    });

    const stats = getChatMediaCacheStats("user-1");
    expect(stats.photos.entries).toBe(1);
    expect(stats.photos.bytes).toBe(2048);
  });

  it("includes anonymous cache entries while a signed-in user is viewing storage", () => {
    recordChatMediaCacheEntry({
      url: "blob:http://localhost/local-video",
      bucket: "videos",
      bytes: 4096,
    });

    const stats = getChatMediaCacheStats("user-1");
    expect(stats.videos.entries).toBe(1);
    expect(stats.videos.bytes).toBe(4096);
  });

  it("clears selected media buckets", async () => {
    recordChatMediaCacheEntry({ userId: "user-1", url: "https://cdn.example.com/a.jpg", bucket: "photos", bytes: 100 });
    recordChatMediaCacheEntry({ userId: "user-1", url: "https://cdn.example.com/a.mp4", bucket: "videos", bytes: 200 });

    const removed = await clearChatMediaCache("user-1", new Set<ChatMediaCacheBucket>(["photos"]));

    const stats = getChatMediaCacheStats("user-1");
    expect(removed).toBe(1);
    expect(stats.photos.entries).toBe(0);
    expect(stats.videos.entries).toBe(1);
  });

  it("tracks locked previews and protects unlocked originals during bulk clear", async () => {
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/preview.jpg?token=short",
      bucket: "photos",
      bytes: 80,
      storagePath: "groups/g-1/previews/p-1.jpg",
      cacheKind: "locked-preview",
    });
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/original.jpg?token=short",
      bucket: "photos",
      bytes: 1_000,
      storagePath: "groups/g-1/originals/o-1.jpg",
      cacheKind: "locked-original",
    });

    const before = getChatMediaCacheStats("user-1");
    expect(before.photos.lockedPreviewEntries).toBe(1);
    expect(before.photos.protectedEntries).toBe(1);

    const removed = await clearChatMediaCache("user-1", new Set<ChatMediaCacheBucket>(["photos"]));

    const after = getChatMediaCacheStats("user-1");
    expect(removed).toBe(1);
    expect(after.photos.entries).toBe(1);
    expect(after.photos.protectedBytes).toBe(1_000);
  });

  it("can clear only locked previews", async () => {
    recordChatMediaCacheEntry({ userId: "user-1", url: "https://cdn.example.com/plain.jpg", bucket: "photos", bytes: 100 });
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/preview.jpg",
      bucket: "photos",
      bytes: 50,
      cacheKind: "locked-preview",
    });
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/original.jpg",
      bucket: "photos",
      bytes: 500,
      cacheKind: "locked-original",
    });

    const removed = await clearChatMediaCache("user-1", new Set<ChatMediaCacheBucket>(["photos"]), { lockedPreviewsOnly: true });

    const stats = getChatMediaCacheStats("user-1");
    expect(removed).toBe(1);
    expect(stats.photos.entries).toBe(2);
    expect(stats.photos.lockedPreviewEntries).toBe(0);
    expect(stats.photos.protectedEntries).toBe(1);
  });

  it("prunes old entries using the keep-media preference", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1_000);
    recordChatMediaCacheEntry({ userId: "user-1", url: "https://cdn.example.com/old.jpg", bucket: "photos", bytes: 100 });
    now.mockReturnValue(31 * day);

    const removed = pruneChatMediaCacheByKeepMedia("user-1", "1m");

    expect(removed).toBe(1);
    expect(getChatMediaCacheStats("user-1").photos.entries).toBe(0);
  });

  it("keeps unlocked originals when pruning old media", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1_000);
    recordChatMediaCacheEntry({
      userId: "user-1",
      url: "https://cdn.example.com/original.jpg",
      bucket: "photos",
      bytes: 1_000,
      cacheKind: "locked-original",
    });
    now.mockReturnValue(31 * day);

    const removed = pruneChatMediaCacheByKeepMedia("user-1", "1m");

    expect(removed).toBe(0);
    expect(getChatMediaCacheStats("user-1").photos.protectedEntries).toBe(1);
  });
});
