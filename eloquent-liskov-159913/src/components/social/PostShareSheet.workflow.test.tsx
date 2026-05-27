import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import PostShareSheet, { openPostShareSheet } from "./PostShareSheet";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/storiesCache", () => ({
  invalidateAllStoryCaches: vi.fn(),
}));

function renderShareSheet() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PostShareSheet />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PostShareSheet", () => {
  it("renders a share preview with recommended actions", async () => {
    renderShareSheet();

    act(() => {
      openPostShareSheet({
        postId: "post-1",
        url: "https://local.test/feed?post=post-1",
        title: "Sunset at Kep",
        text: "A soft launch post for the new ZIVO creator flow.",
        imageUrl: "https://local.test/post.jpg",
        onSendToFriend: vi.fn(),
      });
    });

    expect(await screen.findByText("Share post")).toBeInTheDocument();
    expect(screen.getByText("local.test")).toBeInTheDocument();
    expect(screen.getByText("Sunset at Kep")).toBeInTheDocument();
    expect(screen.getByText("DM ready")).toBeInTheDocument();
    expect(screen.getByText("Story ready")).toBeInTheDocument();
    expect(screen.getByText("Public link")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Fast share")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy: Link" })).toBeInTheDocument();
  });

  it("copies the share URL from the link row", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderShareSheet();

    act(() => {
      openPostShareSheet({
        postId: "post-2",
        url: "https://local.test/feed?post=post-2",
        title: "Creator update",
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: "Copy share link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://local.test/feed?post=post-2");
    });
    await waitFor(() => {
      expect(screen.queryByText("Share post")).not.toBeInTheDocument();
    });
  });
});
