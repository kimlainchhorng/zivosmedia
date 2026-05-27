import { describe, expect, it } from "vitest";
import {
  formatStarsPrice,
  getLockedAlbumOriginalPaths,
  getLockedAlbumPreviewPaths,
  getLockedMediaItems,
  getGroupMediaGalleryPath,
  getLockedMediaPreviewPath,
  isLockedMediaMessage,
} from "./lockedMedia";

describe("lockedMedia", () => {
  it("formats group unlock prices as Stars", () => {
    expect(formatStarsPrice(249)).toBe("\u2b50249");
    expect(formatStarsPrice(444)).toBe("\u2b50444");
    expect(formatStarsPrice(1200)).toBe("\u2b501,200");
    expect(formatStarsPrice(1999)).toBe("\u2b501,999");
    expect(formatStarsPrice(null)).toBe("\u2b500");
  });

  it("detects locked image and video message types", () => {
    expect(isLockedMediaMessage("locked_image")).toBe(true);
    expect(isLockedMediaMessage("locked_video")).toBe(true);
    expect(isLockedMediaMessage("locked_album")).toBe(true);
    expect(isLockedMediaMessage("image")).toBe(false);
  });

  it("uses previews for locked group media until original access is available", () => {
    const message = {
      message_type: "locked_image",
      image_url: "sender/locked/original.jpg",
      file_payload: { locked_preview_url: "sender/locked-previews/preview.jpg" },
    };

    expect(getLockedMediaPreviewPath(message.file_payload)).toBe("sender/locked-previews/preview.jpg");
    expect(getGroupMediaGalleryPath(message, false)).toBe("sender/locked-previews/preview.jpg");
    expect(getGroupMediaGalleryPath(message, true)).toBe("sender/locked/original.jpg");
  });

  it("normalizes locked album bundle items", () => {
    const payload = {
      locked_items: [
        {
          id: "one",
          kind: "image",
          original_path: "sender/locked/original-1.jpg",
          preview_path: "sender/locked-previews/preview-1.jpg",
          mime_type: "image/jpeg",
          size: 123,
        },
        {
          id: "two",
          kind: "video",
          original_path: "sender/locked/original-2.mp4",
          preview_path: "sender/locked-previews/preview-2.jpg",
        },
        { id: "bad", kind: "image" },
      ],
    };

    expect(getLockedMediaItems(payload)).toHaveLength(2);
    expect(getLockedAlbumPreviewPaths(payload)).toEqual([
      "sender/locked-previews/preview-1.jpg",
      "sender/locked-previews/preview-2.jpg",
    ]);
    expect(getLockedAlbumOriginalPaths(payload)).toEqual([
      "sender/locked/original-1.jpg",
      "sender/locked/original-2.mp4",
    ]);
  });

  it("uses album previews until bundle originals are unlocked", () => {
    const message = {
      message_type: "locked_album",
      file_payload: {
        locked_items: [
          {
            kind: "image",
            original_path: "sender/locked/original.jpg",
            preview_path: "sender/locked-previews/preview.jpg",
          },
        ],
      },
    };

    expect(getLockedMediaPreviewPath(message.file_payload)).toBe("sender/locked-previews/preview.jpg");
    expect(getGroupMediaGalleryPath(message, false)).toBe("sender/locked-previews/preview.jpg");
    expect(getGroupMediaGalleryPath(message, true)).toBe("sender/locked/original.jpg");
  });
});
