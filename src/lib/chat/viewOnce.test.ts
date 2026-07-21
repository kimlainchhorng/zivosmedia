import { describe, expect, it } from "vitest";
import { isViewOnce, isViewOnceOpened, viewOnceMediaState } from "./viewOnce";

describe("isViewOnce / isViewOnceOpened", () => {
  it("detects the view_once flag", () => {
    expect(isViewOnce({ view_once: true })).toBe(true);
    expect(isViewOnce({ view_once: false })).toBe(false);
    expect(isViewOnce({})).toBe(false);
    expect(isViewOnce(null)).toBe(false);
    expect(isViewOnce("not an object")).toBe(false);
  });

  it("detects the consumed flag", () => {
    expect(isViewOnceOpened({ view_once: true, view_once_opened: true })).toBe(true);
    expect(isViewOnceOpened({ view_once: true })).toBe(false);
  });
});

describe("viewOnceMediaState", () => {
  it("returns 'none' for non-view-once messages", () => {
    expect(viewOnceMediaState({ image_url: "x", file_payload: {} }, false)).toBe("none");
    expect(viewOnceMediaState({ image_url: "x", file_payload: { sensitive: true } }, true)).toBe("none");
  });

  it("returns 'gate' for an unopened message to the recipient", () => {
    expect(viewOnceMediaState({ image_url: "x", file_payload: { view_once: true } }, false)).toBe("gate");
    expect(viewOnceMediaState({ video_url: "v", file_payload: { view_once: true } }, false)).toBe("gate");
  });

  it("returns 'sent' for the sender's own unopened message", () => {
    expect(viewOnceMediaState({ image_url: "x", file_payload: { view_once: true } }, true)).toBe("sent");
  });

  it("returns 'opened' once consumed (flag set)", () => {
    expect(viewOnceMediaState({ image_url: null, file_payload: { view_once: true, view_once_opened: true } }, false)).toBe("opened");
    expect(viewOnceMediaState({ image_url: null, file_payload: { view_once: true, view_once_opened: true } }, true)).toBe("opened");
  });

  it("returns 'opened' when media has been nulled even without the flag", () => {
    expect(viewOnceMediaState({ image_url: null, video_url: null, file_payload: { view_once: true } }, false)).toBe("opened");
  });
});
