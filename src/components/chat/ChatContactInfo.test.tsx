import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import ChatContactInfo from "./ChatContactInfo";

const mocks = vi.hoisted(() => ({
  sharedMedia: [] as Array<{
    id: string;
    sender_id: string;
    image_url: string | null;
    video_url: string | null;
    voice_url?: string | null;
    message_type: string | null;
    message?: string | null;
    file_payload?: Record<string, unknown> | null;
    created_at: string;
  }>,
  navigate: vi.fn(),
  pin: vi.fn(),
  unpin: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  mute: vi.fn(),
  setMode: vi.fn(),
  togglePin: vi.fn(),
  toggleArchive: vi.fn(),
  toggleMute: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me", email: "me@example.com" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "chat-shared-media") return { data: mocks.sharedMedia };
    if (queryKey[0] === "mutual-friends") return { data: [] };
    if (queryKey[0] === "recipient-profile") return { data: null };
    return { data: undefined };
  },
}));

vi.mock("@/integrations/supabase/client", () => {
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.not = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.insert = vi.fn(async () => ({ error: null }));
  query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));

  return {
    supabase: {
      from: vi.fn(() => query),
    },
  };
});

vi.mock("@/hooks/useThreadSettings", () => ({
  buildThreadId: (_kind: string, id: string) => `dm:${id}`,
  useThreadSettings: () => ({
    isPinned: () => false,
    isArchived: () => false,
    isMuted: () => false,
    pin: mocks.pin,
    unpin: mocks.unpin,
    archive: mocks.archive,
    unarchive: mocks.unarchive,
    mute: mocks.mute,
    setMode: mocks.setMode,
    get: () => ({ notification_mode: "all", muted_until: null }),
  }),
}));

vi.mock("@/hooks/useChatPrefs", () => ({
  useChatPrefs: () => ({
    isPinned: () => false,
    isArchived: () => false,
    isMuted: () => false,
    isMarkedUnread: () => false,
    togglePin: mocks.togglePin,
    toggleArchive: mocks.toggleArchive,
    toggleMute: mocks.toggleMute,
    toggleMarkUnread: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSignedMedia", () => ({
  useSignedMedia: (value: string | null | undefined) => value || null,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, whileTap, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

vi.mock("./ChatBackupExport", () => ({
  default: () => null,
}));

vi.mock("./MuteDurationSheet", () => ({
  default: () => null,
}));

function renderContactInfo(overrides: Partial<ComponentProps<typeof ChatContactInfo>> = {}) {
  return render(
    <ChatContactInfo
      recipientId="peer"
      recipientName="Alex"
      recipientAvatar={null}
      onClose={vi.fn()}
      onOpenMediaGallery={vi.fn()}
      onOpenGifs={vi.fn()}
      onOpenMusic={vi.fn()}
      onOpenFiles={vi.fn()}
      onOpenLinks={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ChatContactInfo", () => {
  beforeEach(() => {
    mocks.sharedMedia = [];
    mocks.navigate.mockReset();
    for (const mock of [
      mocks.pin,
      mocks.unpin,
      mocks.archive,
      mocks.unarchive,
      mocks.mute,
      mocks.setMode,
      mocks.togglePin,
      mocks.toggleArchive,
      mocks.toggleMute,
      mocks.toastSuccess,
      mocks.toastError,
    ]) {
      mock.mockReset();
    }
    mocks.pin.mockResolvedValue(undefined);
    mocks.unpin.mockResolvedValue(undefined);
    mocks.archive.mockResolvedValue(undefined);
    mocks.unarchive.mockResolvedValue(undefined);
    mocks.mute.mockResolvedValue(undefined);
    mocks.setMode.mockResolvedValue(undefined);
  });

  it("keeps Media, GIFs, Music, Files, and Links reachable when media preview exists", () => {
    const onOpenMediaGallery = vi.fn();
    const onOpenGifs = vi.fn();
    const onOpenMusic = vi.fn();
    const onOpenFiles = vi.fn();
    const onOpenLinks = vi.fn();
    mocks.sharedMedia = [{
      id: "media-1",
      sender_id: "peer",
      image_url: "peer/photo.jpg",
      video_url: null,
      voice_url: null,
      message_type: "image",
      message: null,
      file_payload: null,
      created_at: "2026-05-27T10:00:00Z",
    }];

    renderContactInfo({ onOpenMediaGallery, onOpenGifs, onOpenMusic, onOpenFiles, onOpenLinks });

    expect(screen.getByText("Shared Media")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Media$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^GIFs$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Music$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Files$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Links$/i }));

    expect(onOpenMediaGallery).toHaveBeenCalledTimes(1);
    expect(onOpenGifs).toHaveBeenCalledTimes(1);
    expect(onOpenMusic).toHaveBeenCalledTimes(1);
    expect(onOpenFiles).toHaveBeenCalledTimes(1);
    expect(onOpenLinks).toHaveBeenCalledTimes(1);
  });

  it("connects top contact actions to chat workflows", () => {
    const onStartCall = vi.fn();
    const onOpenSearch = vi.fn();

    renderContactInfo({ onStartCall, onOpenSearch });

    fireEvent.click(screen.getByRole("button", { name: "Audio" }));
    fireEvent.click(screen.getByRole("button", { name: "Video" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Profile" }));

    expect(onStartCall).toHaveBeenNthCalledWith(1, "voice");
    expect(onStartCall).toHaveBeenNthCalledWith(2, "video");
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("/user/peer");
  });

  it("does not update local pin state or announce success when the server rejects", async () => {
    mocks.pin.mockRejectedValueOnce(new Error("save failed"));
    renderContactInfo();

    fireEvent.click(screen.getByRole("button", { name: "Pin Conversation" }));

    await waitFor(() => expect(mocks.pin).toHaveBeenCalledWith("dm:peer"));
    expect(mocks.togglePin).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith("Pinned to top");
  });

  it("updates local pin state only after the server confirms", async () => {
    let confirmSave: (() => void) | undefined;
    mocks.pin.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        confirmSave = resolve;
      }),
    );
    renderContactInfo();

    fireEvent.click(screen.getByRole("button", { name: "Pin Conversation" }));
    expect(mocks.togglePin).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith("Pinned to top");

    confirmSave?.();

    await waitFor(() => expect(mocks.togglePin).toHaveBeenCalledWith("peer"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Pinned to top");
  });
});
