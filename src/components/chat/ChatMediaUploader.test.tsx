import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMediaUploader } from "./ChatMediaUploader";

const mocks = vi.hoisted(() => ({
  dbFrom: vi.fn(),
  dbInsert: vi.fn(),
  signedUrlFor: vi.fn(),
  storageFrom: vi.fn(),
  storageUpload: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "sender-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.dbFrom,
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

vi.mock("@/lib/security/signedMedia", () => ({
  signedUrlFor: mocks.signedUrlFor,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("framer-motion", () => {
  const MotionDiv = ({
    animate,
    exit,
    initial,
    transition,
    ...props
  }: any) => <div {...props} />;

  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: MotionDiv,
    },
  };
});

async function renderUploader() {
  const onMediaSent = vi.fn();
  let openPicker: ((kind?: "document" | "audio") => void) | null = null;
  const view = render(
    <ChatMediaUploader
      recipientId="receiver-1"
      onMediaSent={onMediaSent}
      renderTrigger={(open) => {
        openPicker = open;
        return null;
      }}
    />,
  );
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  if (!input) throw new Error("file input missing");
  await waitFor(() => {
    expect(openPicker).toBeTypeOf("function");
  });
  const getOpenPicker = () => {
    if (!openPicker) throw new Error("file picker callback missing");
    return openPicker;
  };
  return { ...view, input, onMediaSent, getOpenPicker };
}

describe("ChatMediaUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageFrom.mockReturnValue({ upload: mocks.storageUpload });
    mocks.storageUpload.mockResolvedValue({ error: null });
    mocks.dbFrom.mockReturnValue({ insert: mocks.dbInsert });
    mocks.dbInsert.mockResolvedValue({ error: null });
    mocks.signedUrlFor.mockResolvedValue("https://signed.example/audio.mp3");
  });

  it("opens document and audio pickers with distinct accept filters", async () => {
    const { input, getOpenPicker } = await renderUploader();

    getOpenPicker()();
    expect(input.accept).toContain(".pdf");
    expect(input.accept).toContain(".docx");

    getOpenPicker()("audio");
    expect(input.accept).toBe("audio/*");
  });

  it("keeps renderTrigger as the picker handoff API", () => {
    const trigger = vi.fn(() => null);

    const view = render(
      <ChatMediaUploader
        recipientId="receiver-1"
        onMediaSent={vi.fn()}
        renderTrigger={trigger}
      />,
    );

    expect(trigger).toHaveBeenCalledWith(expect.any(Function));
    expect(view.container.querySelector('input[type="file"]')).toBeTruthy();
  });

  it("uploads music as a file attachment payload", async () => {
    const { input, onMediaSent, getOpenPicker } = await renderUploader();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });

    getOpenPicker()("audio");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onMediaSent).toHaveBeenCalledWith({
        fileUrl: "https://signed.example/audio.mp3",
        fileName: "track.mp3",
        fileType: "audio/mpeg",
        fileSize: file.size,
      });
    });

    expect(mocks.storageFrom).toHaveBeenCalledWith("chat-media-files");
    expect(mocks.storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^sender-1\/\d+\.mp3$/),
      file,
      { contentType: "audio/mpeg" },
    );
    expect(mocks.dbFrom).toHaveBeenCalledWith("chat_media");
    expect(mocks.dbInsert).toHaveBeenCalledWith(expect.objectContaining({
      chat_partner_id: "receiver-1",
      file_name: "track.mp3",
      file_type: "audio",
      mime_type: "audio/mpeg",
      sender_id: "sender-1",
    }));
    expect(mocks.signedUrlFor).toHaveBeenCalledWith("chat-media-files", expect.stringMatching(/^sender-1\/\d+\.mp3$/), "display");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("File sent");
  });

  it("rejects oversized audio before uploading", async () => {
    const { input, onMediaSent, getOpenPicker } = await renderUploader();
    const file = new File(["audio"], "too-large.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 26 * 1024 * 1024 });

    getOpenPicker()("audio");
    fireEvent.change(input, { target: { files: [file] } });

    expect(mocks.toastError).toHaveBeenCalledWith("File must be under 25.0 MB");
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    expect(onMediaSent).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("does not reopen the picker while an upload is in progress", async () => {
    let finishUpload!: (value: { error: null }) => void;
    mocks.storageUpload.mockReturnValue(new Promise((resolve) => {
      finishUpload = resolve;
    }));
    const { input, onMediaSent, getOpenPicker } = await renderUploader();
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });

    getOpenPicker()("audio");
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText("track.mp3");
    clickSpy.mockClear();
    getOpenPicker()("audio");

    expect(clickSpy).not.toHaveBeenCalled();

    finishUpload({ error: null });
    await waitFor(() => {
      expect(onMediaSent).toHaveBeenCalled();
    });
  });
});
