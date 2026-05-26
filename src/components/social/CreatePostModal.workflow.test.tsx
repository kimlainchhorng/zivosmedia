import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps } from "react";
import CreatePostModal from "./CreatePostModal";

const mocks = vi.hoisted(() => ({
  insertCalls: [] as Array<{ table: string; payload: any }>,
  uploadWithProgress: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({ data: [] }),
        }),
      }),
      insert: (payload: any) => {
        mocks.insertCalls.push({ table, payload });
        return {
          select: () => ({
            single: async () => ({ data: { id: `${table}-new-id` }, error: null }),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/hooks/useZivoOFMode", () => ({
  useZivoOFMode: () => ({ zivoOFMode: false }),
}));

vi.mock("@/utils/uploadWithProgress", () => ({
  uploadWithProgress: mocks.uploadWithProgress,
}));

vi.mock("@/utils/stripImageMetadata", () => ({
  stripImageMetadata: vi.fn(async (file: File) => file),
}));

vi.mock("@/lib/native/dialog", () => ({
  nativeConfirm: vi.fn(async () => true),
}));

type ComposerProps = ComponentProps<typeof CreatePostModal>;

const publicVideoUrl = "https://cdn.zivo.test/reels/uploaded-reel.mp4";

const renderComposer = (
  initialMode: "photo" | "reel" | "poll" | "story" | "shop" | "live" = "reel",
  props: Partial<ComposerProps> = {},
) => {
  return render(
    <MemoryRouter>
      <CreatePostModal
        userId="user-1"
        userProfile={{ name: "Chhorng", avatar: null }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        initialMode={initialMode}
        {...props}
      />
    </MemoryRouter>,
  );
};

const attachVideo = (fileName = "reel.mp4") => {
  const video = new File(["mock-video"], fileName, { type: "video/mp4" });
  fireEvent.change(screen.getByLabelText("Select media files"), {
    target: { files: [video] },
  });
  return video;
};

const publishReel = async () => {
  const shareButton = screen.getByRole("button", { name: "Share Reel" });
  await waitFor(() => expect(shareButton).toBeEnabled());
  fireEvent.click(shareButton);
  await waitFor(() => expect(mocks.insertCalls.some((call) => call.table === "user_posts")).toBe(true));
  return mocks.insertCalls.find((call) => call.table === "user_posts")?.payload;
};

beforeEach(() => {
  mocks.insertCalls.length = 0;
  mocks.uploadWithProgress.mockReset();
  mocks.uploadWithProgress.mockResolvedValue(publicVideoUrl);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:mock-video"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  localStorage.clear();
});

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

  it("shows attached Duet source metadata", () => {
    renderComposer("reel", {
      remixType: "duet",
      sharedPostId: "source-post-1",
      sharedPostAuthorId: "creator-1",
      sharedPostAuthorName: "xixi24362",
    });

    expect(screen.getByText("Duet with xixi24362")).toBeInTheDocument();
  });

  it("publishes a normal reel with an uploaded video payload", async () => {
    const onCreated = vi.fn();
    renderComposer("reel", {
      initialCaption: "Fresh reel drop",
      initialAudioName: "Original Sound - Chhorng",
      onCreated,
    });

    const video = attachVideo("normal-reel.mp4");
    const payload = await publishReel();

    expect(mocks.uploadWithProgress).toHaveBeenCalledWith(
      "user-posts",
      expect.stringMatching(/^user-1\/.+\.mp4$/),
      video,
      expect.any(Function),
    );
    expect(payload).toMatchObject({
      user_id: "user-1",
      media_type: "video",
      media_url: publicVideoUrl,
      media_urls: [publicVideoUrl],
      caption: "Fresh reel drop",
      audio_name: "Original Sound - Chhorng",
      is_published: true,
      visibility: "everyone",
    });
    expect(payload).not.toHaveProperty("shared_from_post_id");
    expect(payload).not.toHaveProperty("shared_from_user_id");
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["duet", "Duet with xixi24362"] as const,
    ["stitch", "Stitch with xixi24362"] as const,
  ])("publishes a %s reel with source metadata preserved for reload", async (remixType, expectedCaption) => {
    const onCreated = vi.fn();
    renderComposer("reel", {
      remixType,
      sharedPostId: "source-post-1",
      sharedPostAuthorId: "creator-1",
      sharedPostAuthorName: "xixi24362",
      initialAudioName: "Original Sound - xixi24362",
      onCreated,
    });

    attachVideo(`${remixType}-reel.mp4`);
    const payload = await publishReel();

    expect(payload).toMatchObject({
      media_type: "video",
      media_url: publicVideoUrl,
      media_urls: [publicVideoUrl],
      caption: expectedCaption,
      audio_name: "Original Sound - xixi24362",
      shared_from_post_id: "source-post-1",
      shared_from_user_id: "creator-1",
    });
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("prepends the remix label when a Duet creator writes a custom caption", async () => {
    renderComposer("reel", {
      remixType: "duet",
      sharedPostId: "source-post-1",
      sharedPostAuthorId: "creator-1",
      sharedPostAuthorName: "xixi24362",
      initialCaption: "My take on this",
    });

    attachVideo("captioned-duet.mp4");
    const payload = await publishReel();

    expect(payload).toMatchObject({
      caption: "Duet with xixi24362\n\nMy take on this",
      shared_from_post_id: "source-post-1",
      shared_from_user_id: "creator-1",
    });
  });
});
