import { describe, expect, it } from "vitest";
import {
  formatStarsPrice,
  getGroupMediaGalleryPath,
  getLockedMediaPreviewPath,
  isLockedMediaMessage,
} from "./lockedMedia";

describe("lockedMedia", () => {
  it("formats group unlock prices as Stars", () => {
    expect(formatStarsPrice(249)).toBe("\u2b50249");
    expect(formatStarsPrice(1200)).toBe("\u2b501,200");
    expect(formatStarsPrice(null)).toBe("\u2b500");
  });

  it("detects locked image and video message types", () => {
    expect(isLockedMediaMessage("locked_image")).toBe(true);
    expect(isLockedMediaMessage("locked_video")).toBe(true);
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
});
