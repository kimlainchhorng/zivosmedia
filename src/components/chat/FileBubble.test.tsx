import { fireEvent, render, screen } from "@testing-library/react";
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
    vi.restoreAllMocks();
    mocks.recordChatMediaCacheEntry.mockClear();
  });

  it("renders uploaded music with a chat audio player and file actions", () => {
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
    expect(screen.getByText(/4.0 KB/)).toBeInTheDocument();
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", file.url);
    expect(audio).not.toHaveAttribute("controls");
    expect(screen.getByRole("button", { name: "Play track.mp3" })).toBeInTheDocument();
    expect(screen.getByLabelText("Seek track.mp3")).toBeDisabled();
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

  it("updates custom audio controls for playback and seeking", () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const file = {
      url: "https://cdn.example.com/music/track.mp3",
      filename: "track.mp3",
      mime_type: "audio/mpeg",
      size: 4096,
      source: "upload" as const,
    };

    const { container } = render(<FileBubble file={file} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "duration", { configurable: true, value: 90 });
    Object.defineProperty(audio, "currentTime", { configurable: true, writable: true, value: 0 });

    fireEvent.loadedMetadata(audio);
    expect(screen.getByText("1:30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play track.mp3" }));
    expect(playSpy).toHaveBeenCalled();
    fireEvent.play(audio);
    expect(screen.getByRole("button", { name: "Pause track.mp3" })).toBeInTheDocument();

    const seek = screen.getByLabelText("Seek track.mp3") as HTMLInputElement;
    fireEvent.change(seek, { target: { value: "30" } });
    expect(audio.currentTime).toBe(30);
    expect(screen.getByText("0:30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause track.mp3" }));
    expect(pauseSpy).toHaveBeenCalled();
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
