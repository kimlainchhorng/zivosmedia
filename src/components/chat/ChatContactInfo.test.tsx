import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import ChatContactInfo from "./ChatContactInfo";

const mocks = vi.hoisted(() => ({
  sharedMedia: [] as Array<{ id: string; image_url: string | null; video_url: string | null; message_type: string | null; created_at: string }>,
  navigate: vi.fn(),
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
    pin: vi.fn(),
    unpin: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    mute: vi.fn(),
    setMode: vi.fn(),
    get: () => ({ notification_mode: "all", muted_until: null }),
  }),
}));

vi.mock("@/hooks/useChatPrefs", () => ({
  useChatPrefs: () => ({
    isPinned: () => false,
    isArchived: () => false,
    isMuted: () => false,
    isMarkedUnread: () => false,
    togglePin: vi.fn(),
    toggleArchive: vi.fn(),
    toggleMute: vi.fn(),
    toggleMarkUnread: vi.fn(),
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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
  });

  it("keeps Media, GIFs, Music, Files, and Links reachable when media preview exists", () => {
    const onOpenMediaGallery = vi.fn();
    const onOpenGifs = vi.fn();
    const onOpenMusic = vi.fn();
    const onOpenFiles = vi.fn();
    const onOpenLinks = vi.fn();
    mocks.sharedMedia = [{
      id: "media-1",
      image_url: "peer/photo.jpg",
      video_url: null,
      message_type: "image",
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
});
