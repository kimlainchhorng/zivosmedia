import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileBubble from "./FileBubble";

const mocks = vi.hoisted(() => ({
  recordChatMediaCacheEntry: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/chat/mediaCache", () => ({
  recordChatMediaCacheEntry: mocks.recordChatMediaCacheEntry,
}));

describe("FileBubble", () => {
  beforeEach(() => {
    mocks.recordChatMediaCacheEntry.mockClear();
  });

  it("renders uploaded music with inline audio controls and file actions", () => {
    const file = {
      url: "https://cdn.example.com/music/track.mp3",
      filename: "track.mp3",
      mime_type: "audio/mpeg",
      size: 4096,
      source: "upload" as const,
    };

    const { container } = render(<FileBubble file={file} mine />);
    const audio = container.querySelector("audio");

    expect(screen.getByText("track.mp3")).toBeInTheDocument();
    expect(screen.getByText(/MPEG/)).toBeInTheDocument();
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", file.url);
    expect(audio).toHaveAttribute("controls");
    expect(audio).toHaveAttribute("aria-label", "Play track.mp3");
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute("href", file.url);
    expect(screen.getByRole("link", { name: /save/i })).toHaveAttribute("download", file.filename);
    expect(mocks.recordChatMediaCacheEntry).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "audio",
      bytes: file.size,
      storagePath: file.url,
      url: file.url,
      userId: "user-1",
    }));
  });

  it("does not add audio controls for documents", () => {
    const { container } = render(
      <FileBubble
        file={{
          url: "https://cdn.example.com/report.pdf",
          filename: "report.pdf",
          mime_type: "application/pdf",
          size: 2048,
          source: "upload",
        }}
      />,
    );

    expect(container.querySelector("audio")).not.toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });
});
