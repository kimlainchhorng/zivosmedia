import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("create post composer visual contracts", () => {
  it("keeps composer workflow choices visually stable and accessible", () => {
    const composer = source("src/components/social/CreatePostModal.tsx");

    for (const workflow of [
      '{ mode: "post", label: "Post", description: "Photos only", icon: ImageIcon }',
      '{ mode: "reel", label: "Reel", description: "Videos only", icon: Film }',
      '{ mode: "story", label: "Story", description: "Photo or video under 1m", icon: Play }',
      '{ mode: "poll", label: "Poll", description: "Ask and collect votes", icon: Hash }',
      '{ mode: "shop", label: "Shop", description: "Tag product or sale", icon: ShoppingBag }',
      '{ mode: "live", label: "Live", description: "Go on air now", icon: Radio }',
    ]) {
      expect(composer).toContain(workflow);
    }

    expect(composer).toContain("WORKFLOW_STYLES");
    expect(composer).toContain("WORKFLOW_PROMPTS");
    expect(composer).toContain("COMPOSER_WORKFLOWS.map((workflow)");
    expect(composer).toContain("min-w-[92px] shrink-0 rounded-2xl");
    expect(composer).toContain("overflow-x-auto scrollbar-none");
    expect(composer).toContain("truncate text-[11px] font-black");
    expect(composer).toContain("aria-label={publishLabel}");
    expect(composer).toContain("title={publishLabel}");
    expect(composer).toContain('className="fixed inset-0 z-[1700]');
    expect(composer).toContain("max-h-[100dvh] w-full");
  });

  it("keeps media picker constraints aligned with post, reel, and story UX", () => {
    const composer = source("src/components/social/CreatePostModal.tsx");

    expect(composer).toContain('openMediaPicker("image/*", true)');
    expect(composer).toContain('openMediaPicker("video/*", false)');
    expect(composer).toContain('openMediaPicker("image/*,video/*", true)');
    expect(composer).toContain("fileRef.current.accept = accept");
    expect(composer).toContain("fileRef.current.multiple = multiple");
    expect(composer).toContain('accept="image/*,video/*"');
    expect(composer).toContain('accept="video/*"');

    expect(composer).toContain('selected.filter((file) => file.type.startsWith("image/"))');
    expect(composer).toContain('selected.filter((file) => file.type.startsWith("video/")).slice(0, 1)');
    expect(composer).toContain("Story videos must be under 1 minute");
    expect(composer).toContain("duration <= 60");
    expect(composer).toContain("Add a video before sharing a reel");
    expect(composer).toContain("Post is for pictures only");
    expect(composer).toContain("Reel is for videos only");
    expect(composer).toContain("getVideoDuration");
    expect(composer).toContain('video.preload = "metadata"');
  });

  it("keeps mobile composer sheet gestures and safe bottom actions intact", () => {
    const composer = source("src/components/social/CreatePostModal.tsx");
    const swipeHook = source("src/components/social/useSwipeDownClose.ts");
    const css = source("src/index.css");

    expect(composer).toContain("useSwipeDownClose(onClose)");
    expect(composer).toContain("{...swipeDownMotionProps}");
    expect(composer).toContain("onPointerDown={startSwipeDownClose}");
    expect(composer).toContain('style={{ touchAction: "none" }}');
    expect(composer).toContain("cursor-grab");
    expect(composer).toContain("sticky top-0 z-10");
    expect(composer).toContain("sticky bottom-0 z-10");
    expect(composer).toContain("pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]");

    expect(swipeHook).toContain("drag: \"y\"");
    expect(swipeHook).toContain("dragElastic");
    expect(swipeHook).toContain("THRESHOLDS");
    expect(swipeHook).toContain("minDragDistance");
    expect(swipeHook).toContain("shouldDismiss");
    expect(swipeHook).toContain("gesture.swipe_aborted");
    expect(css).toContain(".zivo-social-composer");
    expect(css).toContain(".zivo-social-composer-panel");
  });
});
