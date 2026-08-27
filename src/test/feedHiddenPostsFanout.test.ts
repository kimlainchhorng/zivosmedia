import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const feedSource = readFileSync(
  path.join(process.cwd(), "src/pages/ReelsFeedPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const feedCardStart = feedSource.indexOf("const FeedCard = memo(");
const feedCardSource = feedSource.slice(feedCardStart);

describe("Feed hidden-post listener fan-out", () => {
  it("keeps hidden-post hooks at page scope instead of mounting one per card", () => {
    expect(feedCardStart).toBeGreaterThan(-1);
    expect(feedSource.match(/useHiddenPosts\(/g) ?? []).toHaveLength(2);
    expect(feedSource).toContain("const hiddenPosts = useHiddenPosts(userId);");
    expect(feedSource).toContain(
      "const { hide: hideFeedCardPost } = useHiddenPosts();",
    );
    expect(feedCardSource).not.toContain("useHiddenPosts(");
    expect(
      feedSource.match(/onHidePost={hideFeedCardPost}/g) ?? [],
    ).toHaveLength(2);
  });

  it("preserves the existing local-only Not interested command", () => {
    expect(feedCardSource).toContain("onHidePost: (postId: string) => void;");
    expect(feedCardSource).toContain("onHidePost(item.id);");
    expect(feedCardSource).not.toContain("hiddenPosts.hide(item.id)");
    expect(feedCardSource).not.toContain("onHidePost(item.id, item.source)");
  });
});
