/**
 * Verifies that opening the viewer via `?story=<id>` from the Chat carousel
 * emits exactly one `story_deeplink_open` event with `source: "chat"`, and
 * that the same applies to `profile` / `feed` source carousels — guarding
 * against double-firing during auto-advance / navigate updates.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => trackMock(...args) }));

import {
  useStoryDeepLink,
  useStoryViewerLocation,
  type StorySource,
} from "@/hooks/useStoryDeepLink";
import type { StoryGroup } from "@/components/stories/StoryViewer";

const FIXTURES: StoryGroup[] = [
  {
    userId: "u1",
    userName: "Alice",
    stories: [
      { id: "S1", mediaUrl: "/a.jpg", mediaType: "image", createdAt: new Date().toISOString(), viewsCount: 0 },
    ],
  },
];

function StubCarousel({ source }: { source: StorySource }) {
  const { activeStoryId } = useStoryDeepLink({ source });
  const loc = useStoryViewerLocation(FIXTURES, activeStoryId);
  return loc ? <div data-testid="viewer">open</div> : <div data-testid="closed">closed</div>;
}

function renderAt(source: StorySource, url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/page" element={<StubCarousel source={source} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Story deep-link source attribution", () => {
  beforeEach(() => trackMock.mockClear());

  it("emits source=chat exactly once when opened via ?story from chat", () => {
    renderAt("chat", "/page?story=S1");
    expect(screen.getByTestId("viewer")).toBeInTheDocument();
    const opens = trackMock.mock.calls.filter(
      ([event, payload]) => event === "story_deeplink_open" && (payload as any)?.source === "chat",
    );
    expect(opens).toHaveLength(1);
    expect(opens[0][1]).toMatchObject({ story_id: "S1", source: "chat" });
  });

  it("emits source=profile when opened from profile carousel", () => {
    renderAt("profile", "/page?story=S1");
    const opens = trackMock.mock.calls.filter(
      ([event, payload]) => event === "story_deeplink_open" && (payload as any)?.source === "profile",
    );
    expect(opens).toHaveLength(1);
  });

  it("emits source=feed when opened from feed carousel", () => {
    renderAt("feed", "/page?story=S1");
    const opens = trackMock.mock.calls.filter(
      ([event, payload]) => event === "story_deeplink_open" && (payload as any)?.source === "feed",
    );
    expect(opens).toHaveLength(1);
  });
});
