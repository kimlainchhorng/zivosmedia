import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import ChatAttachMenu from "./ChatAttachMenu";

const mocks = vi.hoisted(() => ({
  isPlus: true,
  plan: "chat" as string | null,
  isOFMode: false,
  navigate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/contexts/ZivoPlusContext", () => ({
  useZivoPlus: () => ({ isPlus: mocks.isPlus, plan: mocks.plan }),
}));

vi.mock("@/hooks/useZivoOFMode", () => ({
  useZivoOFMode: () => ({ isOFMode: mocks.isOFMode }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("framer-motion", () => {
  const MotionDiv = ({
    animate,
    exit,
    initial,
    transition,
    whileTap,
    ...props
  }: any) => <div {...props} />;

  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: MotionDiv,
    },
  };
});

function renderMenu(overrides: Partial<ComponentProps<typeof ChatAttachMenu>> = {}) {
  const callbacks = {
    onClose: vi.fn(),
    onImageSelect: vi.fn(),
    onVideoSelect: vi.fn(),
    onLocationShare: vi.fn(),
    onToggleDisappearing: vi.fn(),
    onLockedImageSelect: vi.fn(),
    onToggleSensitiveMedia: vi.fn(),
    onSendGift: vi.fn(),
    onOpenWallet: vi.fn(),
    onScanDocument: vi.fn(),
    onFileSelect: vi.fn(),
    onCreatePoll: vi.fn(),
    onShareContact: vi.fn(),
    onShareSocial: vi.fn(),
    onShareZivoCard: vi.fn(),
  };

  render(
    <>
      <button type="button" data-attach-trigger>
        Attach
      </button>
      <ChatAttachMenu
        open
        disappearingEnabled={false}
        disappearingLabel="Off"
        {...callbacks}
        {...overrides}
      />
    </>,
  );

  return callbacks;
}

function clickAction(name: string | RegExp) {
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
}

describe("ChatAttachMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.isPlus = true;
    mocks.plan = "chat";
    mocks.isOFMode = false;
    mocks.navigate.mockReset();
    mocks.toast.mockReset();
  });

  it("routes every available attachment action to its workflow callback", async () => {
    const callbacks = renderMenu();

    await screen.findByRole("dialog", { name: /attachment menu/i });

    clickAction("Photo");
    clickAction("Video");
    clickAction("18+");
    clickAction("File");
    clickAction("Scan");
    clickAction("Location");
    clickAction("Contact");
    clickAction("Poll");
    clickAction(/show more actions/i);
    clickAction("Social");
    clickAction("ZIVO");
    clickAction("Gift");
    clickAction("Money");
    clickAction("Locked");
    clickAction("24h");

    expect(callbacks.onImageSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onVideoSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleSensitiveMedia).toHaveBeenCalledTimes(1);
    expect(callbacks.onFileSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onScanDocument).toHaveBeenCalledTimes(1);
    expect(callbacks.onLocationShare).toHaveBeenCalledTimes(1);
    expect(callbacks.onShareContact).toHaveBeenCalledTimes(1);
    expect(callbacks.onCreatePoll).toHaveBeenCalledTimes(1);
    expect(callbacks.onShareSocial).toHaveBeenCalledTimes(1);
    expect(callbacks.onShareZivoCard).toHaveBeenCalledTimes(1);
    expect(callbacks.onSendGift).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenWallet).toHaveBeenCalledTimes(1);
    expect(callbacks.onLockedImageSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleDisappearing).toHaveBeenCalledTimes(1);
  });

  it("keeps scan disabled instead of falling back to photo when scanner is unavailable", async () => {
    const callbacks = renderMenu({ onScanDocument: undefined });

    await screen.findByRole("dialog", { name: /attachment menu/i });

    const scan = screen.getByRole("button", { name: /scan \(not available here\)/i });
    expect((scan as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(scan);

    expect(callbacks.onScanDocument).not.toHaveBeenCalled();
    expect(callbacks.onImageSelect).not.toHaveBeenCalled();
  });
});
