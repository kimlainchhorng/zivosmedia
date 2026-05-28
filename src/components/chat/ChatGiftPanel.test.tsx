import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChatGiftPanel from "./ChatGiftPanel";

const mocks = vi.hoisted(() => ({
  balance: 0,
  enqueue: vi.fn(),
  invoke: vi.fn(),
  navigate: vi.fn(),
  openWallet: vi.fn(),
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

vi.mock("@/lib/urlSafety", () => ({
  isAllowedCheckoutUrl: () => true,
}));

vi.mock("@/lib/openExternalUrl", () => ({
  openExternalUrl: vi.fn(),
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

const renderGiftPanel = (onClose = vi.fn(), onOpenWallet?: () => void) => {
  render(
    <ChatGiftPanel
      open
      onClose={onClose}
      onOpenWallet={onOpenWallet}
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
    mocks.openWallet.mockReset();
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

    expect(screen.getByText("What they get")).toBeInTheDocument();
    expect(screen.getByText(/Gift receipt appears in this chat/i)).toBeInTheDocument();
    expect(screen.getByText("Choose duration")).toBeInTheDocument();
    expect(screen.getByText("Choose payment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select 3 months premium gift plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select 6 months premium gift plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select 1 year premium gift plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pay \$15\.99 by card/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pay 1500 coins/i })).toBeInTheDocument();
    expect(screen.getByText("$11.99")).toBeInTheDocument();
    expect(screen.getAllByText("$15.99").length).toBeGreaterThan(0);
    expect(screen.getByText("$28.99")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "2,500" })).toBeInTheDocument();
    expect(screen.getByText("Pick a coin gift")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse gifts/i })).toBeInTheDocument();
  });

  it("opens premium coin confirmation without invoking the send function", () => {
    mocks.balance = 500;
    renderGiftPanel(vi.fn(), mocks.openWallet);

    fireEvent.click(screen.getByRole("button", { name: /select 3 months premium gift plan/i }));
    fireEvent.click(screen.getByRole("button", { name: /pay 1000 coins/i }));
    fireEvent.click(screen.getByRole("button", { name: /top up coins/i }));

    expect(mocks.openWallet).toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("sends a premium coin gift only after confirmation", async () => {
    mocks.balance = 2_000;
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const onClose = renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /pay 1500 coins/i }));
    fireEvent.click(screen.getByRole("button", { name: /review 6 months coin gift/i }));
    expect(mocks.invoke).not.toHaveBeenCalled();

    const confirmation = screen.getByTestId("premium-gift-confirm");
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

  it("starts card checkout only after confirmation", async () => {
    mocks.invoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/c/pay/test" }, error: null });
    const onClose = renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /select 3 months premium gift plan/i }));
    fireEvent.click(screen.getByRole("button", { name: /review 3 months checkout/i }));
    expect(mocks.invoke).not.toHaveBeenCalled();

    const confirmation = screen.getByTestId("premium-gift-confirm");
    expect(within(confirmation).getByText(/secure checkout/i)).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("create-zivo-plus-checkout", {
        body: {
          plan: "monthly",
          gift_recipient_id: "recipient-1",
          gift_recipient_name: "Kongkea",
          gift_duration: "three-months",
        },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("expands regular gifts and sends through the chat gift hook", async () => {
    renderGiftPanel();

    fireEvent.click(screen.getByRole("button", { name: /browse gifts/i }));
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

  it("routes short coin gift balance to wallet top-up", () => {
    mocks.balance = 0;
    renderGiftPanel(vi.fn(), mocks.openWallet);

    fireEvent.click(screen.getByRole("button", { name: /browse gifts/i }));
    fireEvent.click(screen.getByText("Lucky Cat").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /top up 1/i }));

    expect(mocks.openWallet).toHaveBeenCalled();
    expect(mocks.sendGift).not.toHaveBeenCalled();
  });
});
