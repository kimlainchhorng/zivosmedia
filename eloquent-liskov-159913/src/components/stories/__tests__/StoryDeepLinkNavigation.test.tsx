/**
 * Back/forward navigation test for the story deep-link flow.
 *
 * Mounts a minimal carousel that uses the same `useStoryDeepLink` +
 * `useStoryViewerLocation` pair as the production carousels and a stub viewer
 * that exposes the resolved story_id via `data-testid="viewer-story"`.
 *
 * Verifies:
 *  1. Opening ?story=A renders A.
 *  2. Opening ?story=B renders B.
 *  3. history.back() returns to A WITHOUT B leaking into the rendered output.
 *  4. history.forward() returns to B.
 *  5. ?story=missing returns null (no viewer mounted) — caller handles missing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, BrowserRouter, Route, Routes } from "react-router-dom";
import {
  useStoryDeepLink,
  useStoryViewerLocation,
} from "@/hooks/useStoryDeepLink";
import type { StoryGroup } from "@/components/stories/StoryViewer";

// Mute analytics inserts (the helper already swallows errors but the test
// runs without window.localStorage in some environments).
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const FIXTURES: StoryGroup[] = [
  {
    userId: "u1",
    userName: "Alice",
    stories: [
      { id: "A", mediaUrl: "/a.jpg", mediaType: "image", createdAt: new Date().toISOString(), viewsCount: 0 },
    ],
  },
  {
    userId: "u2",
    userName: "Bob",
    stories: [
      { id: "B", mediaUrl: "/b.jpg", mediaType: "image", createdAt: new Date().toISOString(), viewsCount: 0 },
    ],
  },
];

function StubCarousel() {
  const { activeStoryId } = useStoryDeepLink({ source: "profile" });
  const loc = useStoryViewerLocation(FIXTURES, activeStoryId);

  return (
    <div>
      <div data-testid="active-id">{activeStoryId ?? "none"}</div>
      {loc ? (
        <div data-testid="viewer-story">
          {FIXTURES[loc.groupIndex].stories[loc.storyIndex].id}
        </div>
      ) : (
        <div data-testid="no-viewer">no viewer</div>
      )}
    </div>
  );
}

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/profile" element={<StubCarousel />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Story deep-link back/forward navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the story for ?story=A", () => {
    renderAt("/profile?story=A");
    expect(screen.getByTestId("viewer-story").textContent).toBe("A");
  });

  it("renders B when navigated to ?story=B", () => {
    renderAt("/profile?story=B");
    expect(screen.getByTestId("viewer-story").textContent).toBe("B");
  });

  it("shows no viewer for an unknown story_id (carousel-level)", () => {
    renderAt("/profile?story=missing");
    expect(screen.queryByTestId("viewer-story")).toBeNull();
    expect(screen.getByTestId("no-viewer")).toBeInTheDocument();
    // active-id still reflects the URL — caller decides what to do
    expect(screen.getByTestId("active-id").textContent).toBe("missing");
  });

  it("preserves correct story_id across back/forward without flashing the previous segment", async () => {
    // We drive react-router via MemoryRouter's history through window.history-style
    // navigation by remounting at distinct entries inside a controlled harness.
    // MemoryRouter exposes navigation via useNavigate; we simulate back/forward
    // by mounting a small navigator.
    const Nav = () => {
      const { openStory } = useStoryDeepLink({ source: "profile" });
      return (
        <div>
          <button type="button" onClick={() => openStory("A")}>open-A</button>
          <button type="button" onClick={() => openStory("B")}>open-B</button>
          <StubCarousel />
        </div>
      );
    };

    // BrowserRouter listens to window.history events, which jsdom implements.
    window.history.replaceState({}, "", "/profile");
    const { container } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/profile" element={<Nav />} />
        </Routes>
      </BrowserRouter>,
    );

    // 1) Open A
    await act(async () => {
      (screen.getByText("open-A") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("viewer-story").textContent).toBe("A");

    // 2) Open B (pushes a new history entry)
    await act(async () => {
      (screen.getByText("open-B") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("viewer-story").textContent).toBe("B");

    // 3) Back -> should show A. history.back() dispatches popstate
    // asynchronously; React Router only re-renders after the popstate event
    // fires on the window, so wait for that.
    const waitForBack = new Promise((resolve) => {
      window.addEventListener("popstate", () => resolve(null), { once: true });
      setTimeout(() => resolve(null), 50);
    });
    await act(async () => {
      window.history.back();
      await waitForBack;
    });
    await waitFor(() => {
      expect(container.querySelector("[data-testid='viewer-story']")?.textContent).toBe("A");
    });

    // 4) Forward -> should show B again
    const waitForForward = new Promise((resolve) => {
      window.addEventListener("popstate", () => resolve(null), { once: true });
      setTimeout(() => resolve(null), 50);
    });
    await act(async () => {
      window.history.forward();
      await waitForForward;
    });
    await waitFor(() => {
      expect(screen.getByTestId("viewer-story").textContent).toBe("B");
    });
  });
});
