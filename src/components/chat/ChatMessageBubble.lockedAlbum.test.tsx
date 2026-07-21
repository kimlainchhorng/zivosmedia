import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatMessageBubble from "./ChatMessageBubble";

const openMediaMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "viewer-1" } }),
}));

vi.mock("@/hooks/useSignedMedia", () => ({
  useSignedMedia: (value: string | null | undefined) => value || null,
}));

vi.mock("@/hooks/useSensitiveMediaPreference", () => ({
  useSensitiveMediaPreference: () => ({ blurSensitiveMedia: true }),
}));

vi.mock("@/hooks/useAutoTranslateMessage", () => ({
  useAutoTranslateMessage: () => ({ translated: null, loading: false }),
}));

vi.mock("@/lib/chat/openMedia", () => ({
  openMedia: openMediaMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, drag, dragConstraints, dragElastic, dragSnapToOrigin, onDragEnd, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const defaultProps = {
  id: "message-1",
  message: "Locked Bundle · ⭐1,999",
  time: "1:12 PM",
  isMe: false,
  messageType: "locked_album",
  lockedPriceCoins: 1999,
  initiallyLocked: true,
  initialReactions: [],
  senderId: "sender-1",
  senderName: "Creator",
  filePayload: {
    locked_items: [
      {
        id: "one",
        kind: "image",
        original_path: "sender/locked/original-1.jpg",
        preview_path: "sender/locked-previews/preview-1.jpg",
      },
      {
        id: "two",
        kind: "video",
        original_path: "sender/locked/original-2.mp4",
        preview_path: "sender/locked-previews/preview-2.jpg",
      },
    ],
  },
  onReply: vi.fn(),
  onDelete: vi.fn(),
};

function renderBubble(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe("ChatMessageBubble locked albums", () => {
  beforeEach(() => {
    openMediaMock.mockClear();
  });

  it("renders a blurred paid bundle with a Stars unlock button", () => {
    renderBubble(<ChatMessageBubble {...defaultProps} />);

    expect(screen.getByTestId("locked-album-grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock locked media bundle for ⭐1,999/i })).toBeInTheDocument();
    expect(screen.getByText("Locked media bundle")).toBeInTheDocument();
  });

  it("reveals album items after the unlock callback succeeds", async () => {
    const onUnlockLockedMedia = vi.fn().mockResolvedValue(true);
    const onLockedMediaUnlocked = vi.fn();

    renderBubble(
      <ChatMessageBubble
        {...defaultProps}
        onUnlockLockedMedia={onUnlockLockedMedia}
        onLockedMediaUnlocked={onLockedMediaUnlocked}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /unlock locked media bundle for ⭐1,999/i }));

    await waitFor(() => expect(onUnlockLockedMedia).toHaveBeenCalledWith("message-1"));
    await waitFor(() => expect(onLockedMediaUnlocked).toHaveBeenCalledWith("message-1"));
    await waitFor(() => expect(screen.getByText("2 items")).toBeInTheDocument());
  });

  it("renders a regular media album with caption and footer metadata", () => {
    renderBubble(
      <ChatMessageBubble
        {...defaultProps}
        id="album-1"
        message="Weekend market photos"
        messageType="media_album"
        initiallyLocked={false}
        lockedPriceCoins={undefined}
        filePayload={{
          album_items: [
            { id: "one", type: "image", url: "one.jpg" },
            { id: "two", type: "video", url: "two.mp4", duration_ms: 5000 },
            { id: "three", type: "image", url: "three.jpg" },
            { id: "four", type: "image", url: "four.jpg" },
          ],
          view_count: 3200,
          reaction: { emoji: "like", count: 1 },
        }}
      />,
    );

    expect(screen.getByTestId("media-album-grid")).toBeInTheDocument();
    expect(screen.getByText("Weekend market photos")).toBeInTheDocument();
    expect(screen.getByText("3.2K")).toBeInTheDocument();
    expect(screen.getByText("0:05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "React with like" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open album photo" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Open album video" })).toBeInTheDocument();
  });

  it("renders a Telegram-style media album mosaic with eight visible tiles and overflow", async () => {
    renderBubble(
      <ChatMessageBubble
        {...defaultProps}
        id="album-10"
        message="chhing new"
        messageType="media_album"
        initiallyLocked={false}
        lockedPriceCoins={undefined}
        filePayload={{
          album_items: [
            { id: "one", type: "video", url: "one.mp4", duration_ms: 3000 },
            { id: "two", type: "video", url: "two.mp4", duration_ms: 5000 },
            { id: "three", type: "image", url: "three.jpg" },
            { id: "four", type: "video", url: "four.mp4", duration_ms: 2000 },
            { id: "five", type: "image", url: "five.jpg" },
            { id: "six", type: "image", url: "six.jpg" },
            { id: "seven", type: "video", url: "seven.mp4", duration_ms: 1000 },
            { id: "eight", type: "image", url: "eight.jpg" },
            { id: "nine", type: "image", url: "nine.jpg" },
            { id: "ten", type: "video", url: "ten.mp4", duration_ms: 2000 },
          ],
          view_count: 126,
        }}
      />,
    );

    const tiles = screen.getAllByTestId("media-album-tile");
    expect(tiles).toHaveLength(8);
    expect(screen.getByText("0:03")).toBeInTheDocument();
    expect(screen.getByText("0:05")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("chhing new")).toBeInTheDocument();
    expect(screen.getByText("126")).toBeInTheDocument();

    fireEvent.click(tiles[7]);

    await waitFor(() => expect(openMediaMock).toHaveBeenCalled());
    expect(openMediaMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "album-10:7",
      index: 7,
      gallery: expect.arrayContaining([
        expect.objectContaining({ id: "one", type: "video", url: "one.mp4" }),
        expect.objectContaining({ id: "ten", type: "video", url: "ten.mp4" }),
      ]),
    }));
    expect(openMediaMock.mock.calls[0][0].gallery).toHaveLength(10);
  });

  it("keeps sensitive media albums behind the 18+ gate", () => {
    renderBubble(
      <ChatMessageBubble
        {...defaultProps}
        id="album-sensitive"
        message="Marked album"
        messageType="media_album"
        initiallyLocked={false}
        lockedPriceCoins={undefined}
        filePayload={{
          album_items: [
            { id: "one", type: "image", url: "one.jpg" },
            { id: "two", type: "video", url: "two.mp4", duration_ms: 2000 },
          ],
          sensitive: true,
          sensitive_reason: "sender_marked",
        }}
      />,
    );

    expect(screen.getByTestId("media-album-grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view sensitive media/i })).toBeInTheDocument();
  });
});
