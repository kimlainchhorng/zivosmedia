import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import ChatMediaGallery from "./ChatMediaGallery";
import type { ChatMediaGalleryMessage } from "./chatMediaGalleryModel";

const mocks = vi.hoisted(() => ({
  rows: [] as ChatMediaGalleryMessage[],
  from: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

vi.mock("@/hooks/useSignedMedia", () => ({
  useSignedMedia: (value: string | null | undefined) => value || null,
}));

vi.mock("@/lib/chat/mediaCache", () => ({
  recordChatMediaCacheEntry: vi.fn(),
}));

vi.mock("@/lib/openExternalUrl", () => ({
  openExternalUrl: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

function installQueryMock() {
  mocks.from.mockImplementation(() => {
    const query: Record<string, any> = {};
    query.select = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn(async () => ({ data: mocks.rows }));
    return query;
  });
}

describe("ChatMediaGallery", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.from.mockReset();
    installQueryMock();
  });

  it("opens on the requested tab and indexes audio, GIFs, and album media", async () => {
    mocks.rows = [
      {
        id: "music-1",
        sender_id: "me",
        created_at: "2026-05-27T10:00:00Z",
        message_type: "file",
        message: "track",
        file_payload: { url: "me/track.mp3", filename: "track.mp3", mime_type: "audio/mpeg" },
      },
      {
        id: "gif-file-1",
        sender_id: "peer",
        created_at: "2026-05-27T10:01:00Z",
        message_type: "file",
        message: "gif file",
        file_payload: { url: "peer/dance.gif", filename: "dance.gif", mime_type: "image/gif" },
      },
      {
        id: "album-1",
        sender_id: "peer",
        created_at: "2026-05-27T10:02:00Z",
        message_type: "media_album",
        message: "album",
        image_url: "peer/cover.jpg",
        file_payload: {
          album_items: [
            { url: "peer/photo.jpg", kind: "image" },
            { url: "peer/video.mp4", kind: "video", duration_seconds: 3 },
            { url: "peer/animated.gif", mime_type: "image/gif" },
          ],
        },
      },
    ];

    const onClose = vi.fn();
    render(
      <ChatMediaGallery
        open
        onClose={onClose}
        recipientId="peer"
        recipientName="Alex"
        initialTab="music"
      />,
    );

    expect(await screen.findByText("track.mp3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /photos\s*1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /videos\s*1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gif\s*2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /music\s*1/i })).toBeInTheDocument();

    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "me/track.mp3");

    fireEvent.click(screen.getByRole("button", { name: /videos\s*1/i }));
    await waitFor(() => expect(screen.getByText("0:03")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /gif\s*2/i }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /open shared gif/i })).toHaveLength(2));
  });
});
