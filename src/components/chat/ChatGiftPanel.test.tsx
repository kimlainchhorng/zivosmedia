import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChatGiftPanel from "./ChatGiftPanel";

const mocks = vi.hoisted(() => ({
  balance: 0,
  enqueue: vi.fn(),
  invoke: vi.fn(),
  navigate: vi.fn(),
  refreshCoinBalance: vi.fn(),
  sendGift: vi.fn(),
}));

vi.mock("@/hooks/useCoinBalance", () => ({
  useCoinBalance: () => ({
    balance: mocks.balance,
    loading: false,
    refresh: mocks.refreshCoinBalance,
    recharge: vi.fn(),
  }),
}));

vi.mock("@/hooks/useChatGifts", () => ({
  useChatGifts: () => ({
    sendGift: mocks.sendGift,
    sending: false,
  }),
}));

vi.mock("@/hooks/useGiftAnimationQueue", () => ({
  useGiftAnimationQueue: () => ({
    activeGift: null,
    comboCount: 0,
    enqueue: mocks.enqueue,
    onComplete: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mocks.invoke(...args),
    },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

const renderGiftPanel = (onClose = vi.fn()) => {
  render(
    <ChatGiftPanel
      open
      onClose={onClose}
      recipientId="recipient-1"
      recipientName="Kongkea"
      recipientAvatar="https://example.com/kongkea.jpg"
    />,
  );
  return onClose;
};

describe("ChatGiftPanel", () => {
  beforeEach(() => {
    mocks.balance = 2_500;
    mocks.enqueue.mockReset();
    mocks.invoke.mockReset();
    mocks.navigate.mockReset();
    mocks.refreshCoinBalance.mockReset();
    mocks.refreshCoinBalance.mockResolvedValue(undefined);
    mocks.sendGift.mockReset();
    mocks.sendGift.mockResolvedValue({ ok: true });
  });

  it("renders premium plans, recipient identity, balance, and all gifts entry", () => {
    renderGiftPanel();

    expect(screen.getByRole("dialog", { name: /gift premium to kongkea/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/kongkea avatar/i)).toBeInTheDocument();
    expect(screen.getByText("Gift Premium")).toBeInTheDocument();
    expect(screen.getByText(/Give Kongkea access/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /gift 3 months premium to kongkea by card/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gift 6 months premium to kongkea by card/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gift 1 year premium to kongkea by card/i })).toBeInTheDocument();
    expect(screen.getByText("$11.99")).toBeInTheDocument();
    expect(screen.getByText("$15.99")).toBeInTheDocument();
    expect(screen.getByText("$28.99")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "2,500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all gifts/i })).toBeInTheDocument();
  });

  it("opens premium coin confirmation without invoking the send function", () => {
    mocks.balance = 500;
    renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /gift 3 months premium to kongkea with 1000 coins/i }));

    const confirmation = screen.getByTestId("premium-coin-confirm");
    expect(within(confirmation).getByText("Send Premium Gift")).toBeInTheDocument();
    expect(within(confirmation).getByText("3 months for Kongkea")).toBeInTheDocument();
    expect(within(confirmation).getByRole("button", { name: /top up/i })).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("sends a premium coin gift only after confirmation", async () => {
    mocks.balance = 2_000;
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const onClose = renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /gift 6 months premium to kongkea with 1500 coins/i }));
    expect(mocks.invoke).not.toHaveBeenCalled();

    const confirmation = screen.getByTestId("premium-coin-confirm");
    fireEvent.click(within(confirmation).getByRole("button", { name: /send gift/i }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("chat-send-premium-gift", {
        body: {
          recipient_id: "recipient-1",
          recipient_name: "Kongkea",
          duration: "six-months",
        },
      });
    });
    await waitFor(() => expect(mocks.refreshCoinBalance).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("expands regular gifts and sends through the chat gift hook", async () => {
    renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /all gifts/i }));
    expect(screen.getAllByRole("button", { name: /popular/i }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Lucky Cat").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /send\s+1/i }));

    await waitFor(() => expect(mocks.sendGift).toHaveBeenCalledTimes(1));
    expect(mocks.sendGift).toHaveBeenCalledWith(
      "recipient-1",
      expect.objectContaining({ name: "Lucky Cat", coins: 1 }),
      { combo: 1, note: undefined },
    );
  });
});
