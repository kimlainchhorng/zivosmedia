import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const feedSource = readFileSync(
  path.join(process.cwd(), "src/pages/ReelsFeedPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const reelSlideStart = feedSource.indexOf("function ReelSlide(");
const feedCardStart = feedSource.indexOf("const FeedCard = memo(");
const reelSlideSource = feedSource.slice(reelSlideStart, feedCardStart);
const feedCardSource = feedSource.slice(feedCardStart);
const feedCardVideoTags = feedCardSource.match(/<video\b[\s\S]*?\/>/g) ?? [];

describe("Feed video source hydration", () => {
  it("attaches both FeedCard video sources only inside the hydration range", () => {
    expect(feedCardStart).toBeGreaterThan(reelSlideStart);
    expect(feedCardSource).toContain(
      'const shouldLoadVideo = item.media_type === "video" && shouldHydrate;',
    );
    expect(feedCardSource).toContain(
      "const { hydrationRef, shouldHydrate } = useFeedCardHydration(Boolean(detailMode));",
    );
    expect(feedCardVideoTags).toHaveLength(2);

    for (const videoTag of feedCardVideoTags) {
      expect(videoTag).toContain(
        "src={shouldLoadVideo ? mediaUrl : undefined}",
      );
      expect(videoTag).toContain(
        'preload={shouldLoadVideo ? "metadata" : "none"}',
      );
      expect(videoTag).toContain("muted={muted}");
      expect(videoTag).toContain("loop");
      expect(videoTag).toContain("playsInline");
      expect(videoTag).toContain("onLoadedMetadata=");
      expect(videoTag).toContain("onClick=");
    }
  });

  it("waits to install playback observation until a source can exist", () => {
    expect(feedCardSource).toContain("if (!shouldLoadVideo) return;");
    expect(feedCardSource).toContain(
      'if (typeof IntersectionObserver === "undefined") return;',
    );
    expect(feedCardSource).toContain(
      "}, [item.media_type, autoPlayVideo, shouldLoadVideo]);",
    );
    expect(feedCardSource).toContain("}, 1500);");
  });

  it("preserves media selection, images, controls, and immediate ReelSlide media", () => {
    expect(feedCardSource).toContain(
      "const mediaUrl = item.media_urls[currentMedia] || item.media_urls[0];",
    );
    expect(feedCardSource).toContain("const hasMedia = Boolean(mediaUrl);");
    expect(feedCardSource.match(/aria-label="Play video"/g) ?? []).toHaveLength(
      2,
    );
    expect(feedCardSource.match(/setMuted\(!muted\)/g) ?? []).toHaveLength(2);
    expect(feedCardSource).toContain("<img src={mediaUrl}");
    expect(feedCardSource).toContain("item.media_urls.map((url, i) => (");
    expect(reelSlideSource).toContain("src={mediaUrl}");
    expect(reelSlideSource).toContain('preload="metadata"');
  });
});
