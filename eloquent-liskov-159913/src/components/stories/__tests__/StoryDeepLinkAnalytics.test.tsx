/**
 * Deep-link analytics tests.
 *
 * Cover the three "missing story" reasons surfaced by `StoryDeepLinkPage`
 * (expired, deleted/not-found, fetch_error) plus the happy-path redirect
 * for a shared link, asserting both the rendered copy and the analytics
 * payload that `AdminStoriesFunnelPage` reads from.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => trackMock(...args) }));

// Mutable response the supabase mock returns for each test.
const supabaseResponse: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    from: () => builder,
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ ...supabaseResponse }),
  };
  return { supabase: builder };
});

import StoryDeepLinkPage from "@/pages/StoryDeepLinkPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/stories/:storyId" element={<StoryDeepLinkPage />} />
        <Route path="/feed" element={<div data-testid="feed-page">feed</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StoryDeepLinkPage analytics + edge cases", () => {
  beforeEach(() => {
    trackMock.mockClear();
    supabaseResponse.data = null;
    supabaseResponse.error = null;
  });

  it("shows expired copy and tracks `expired` reason for an old story", async () => {
    const expiresAt = new Date(Date.now() - 60_000).toISOString();
    supabaseResponse.data = { id: "s-old", expires_at: expiresAt };

    renderAt("/stories/s-old");

    await waitFor(() => expect(screen.getByText(/Story expired/i)).toBeInTheDocument());
    expect(trackMock).toHaveBeenCalledWith(
      "story_deeplink_missing",
      expect.objectContaining({ story_id: "s-old", reason: "expired" }),
    );
  });

  it("shows not-found copy and tracks `not_found` for a deleted/missing story", async () => {
    supabaseResponse.data = null;
    supabaseResponse.error = null;

    renderAt("/stories/s-deleted");

    await waitFor(() => expect(screen.getByText(/Story not found/i)).toBeInTheDocument());
    expect(trackMock).toHaveBeenCalledWith(
      "story_deeplink_missing",
      expect.objectContaining({ story_id: "s-deleted", reason: "not_found" }),
    );
  });

  it("redirects to /feed?story=… and tracks `shared-link` open for a valid story", async () => {
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    supabaseResponse.data = { id: "s-live", expires_at: expiresAt };

    renderAt("/stories/s-live");

    await waitFor(() => expect(screen.getByTestId("feed-page")).toBeInTheDocument());
    expect(trackMock).toHaveBeenCalledWith(
      "story_deeplink_open",
      expect.objectContaining({ story_id: "s-live", source: "shared-link" }),
    );
  });

  it("shows fetch-error copy and tracks `fetch_error` when supabase errors", async () => {
    supabaseResponse.data = null;
    supabaseResponse.error = { message: "boom" };

    renderAt("/stories/s-err");

    await waitFor(() => expect(screen.getByText(/Couldn't load story/i)).toBeInTheDocument());
    expect(trackMock).toHaveBeenCalledWith(
      "story_deeplink_missing",
      expect.objectContaining({ story_id: "s-err", reason: "fetch_error" }),
    );
  });
});
