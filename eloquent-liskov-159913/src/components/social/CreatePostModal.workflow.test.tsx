import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatePostModal from "./CreatePostModal";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({ data: [] }),
        }),
      }),
      insert: async () => ({ error: null, data: null }),
    }),
  },
}));

vi.mock("@/hooks/useZivoOFMode", () => ({
  useZivoOFMode: () => ({ zivoOFMode: false }),
}));

vi.mock("@/utils/uploadWithProgress", () => ({
  uploadWithProgress: vi.fn(),
}));

vi.mock("@/utils/stripImageMetadata", () => ({
  stripImageMetadata: vi.fn(async (file: File) => file),
}));

vi.mock("@/lib/native/dialog", () => ({
  nativeConfirm: vi.fn(async () => true),
}));

const renderComposer = (initialMode: "photo" | "reel" | "poll" | "story" | "shop" | "live" = "reel") => {
  return render(
    <MemoryRouter>
      <CreatePostModal
        userId="user-1"
        userProfile={{ name: "Chhorng", avatar: null }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        initialMode={initialMode}
      />
    </MemoryRouter>,
  );
};

describe("CreatePostModal workflow composer", () => {
  it("opens with the selected workflow and mode-specific guidance", () => {
    renderComposer("reel");

    expect(screen.getByText("ZIVO Studio")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reel" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a short hook for your reel...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share Reel" })).toBeDisabled();
  });

  it("switches workflow cards without leaving stale composer copy", () => {
    renderComposer("reel");

    fireEvent.click(screen.getByRole("button", { name: /shop tag product or sale/i }));

    expect(screen.getByRole("heading", { name: "Shop" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe what you are selling or promoting...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share Shop" })).toBeDisabled();
  });
});
