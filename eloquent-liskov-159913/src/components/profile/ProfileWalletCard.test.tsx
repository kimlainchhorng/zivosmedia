import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileWalletCard from "./ProfileWalletCard";

describe("ProfileWalletCard", () => {
  it("renders title, subtitle and the three stat tiles", () => {
    render(
      <ProfileWalletCard
        balance={120}
        credits={5}
        transactionCount={3}
        onOpenWallet={vi.fn()}
      />,
    );
    expect(screen.getByText("Your wallet")).toBeInTheDocument();
    expect(screen.getByText("Coins, credits & spend")).toBeInTheDocument();
    expect(screen.getByText("Coins")).toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
  });

  it("formats coin balance compactly", () => {
    const { rerender } = render(
      <ProfileWalletCard balance={999} onOpenWallet={vi.fn()} />,
    );
    expect(screen.getByText("999")).toBeInTheDocument();

    rerender(<ProfileWalletCard balance={1500} onOpenWallet={vi.fn()} />);
    expect(screen.getByText("1.5K")).toBeInTheDocument();

    rerender(<ProfileWalletCard balance={42_000} onOpenWallet={vi.fn()} />);
    expect(screen.getByText("42K")).toBeInTheDocument();

    rerender(<ProfileWalletCard balance={2_500_000} onOpenWallet={vi.fn()} />);
    expect(screen.getByText("2.5M")).toBeInTheDocument();
  });

  it("formats credits as currency with no decimals when whole", () => {
    render(
      <ProfileWalletCard balance={0} credits={25} onOpenWallet={vi.fn()} />,
    );
    expect(screen.getByText("$25")).toBeInTheDocument();
  });

  it("formats credits with decimals when fractional", () => {
    render(
      <ProfileWalletCard balance={0} credits={12.5} onOpenWallet={vi.fn()} />,
    );
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("shows skeletons while loading and hides numeric values", () => {
    const { container } = render(
      <ProfileWalletCard
        balance={100}
        credits={50}
        transactionCount={3}
        loading
        onOpenWallet={vi.fn()}
      />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
    expect(screen.queryByText("100")).not.toBeInTheDocument();
    expect(screen.queryByText("$50")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("calls onOpenWallet when 'Open' button or stat tiles are clicked", () => {
    const onOpenWallet = vi.fn();
    render(
      <ProfileWalletCard balance={10} credits={5} transactionCount={2} onOpenWallet={onOpenWallet} />,
    );
    fireEvent.click(screen.getByLabelText("Open wallet"));
    fireEvent.click(screen.getByText("Coins").closest("button")!);
    fireEvent.click(screen.getByText("Credits").closest("button")!);
    fireEvent.click(screen.getByText("Activity").closest("button")!);
    expect(onOpenWallet).toHaveBeenCalledTimes(4);
  });

  it("renders Buy ZIVO Coins button only when onBuyCoins prop is provided", () => {
    const { rerender } = render(
      <ProfileWalletCard balance={0} onOpenWallet={vi.fn()} />,
    );
    expect(screen.queryByText("Buy ZIVO Coins")).not.toBeInTheDocument();

    const onBuyCoins = vi.fn();
    rerender(
      <ProfileWalletCard balance={0} onOpenWallet={vi.fn()} onBuyCoins={onBuyCoins} />,
    );
    fireEvent.click(screen.getByText("Buy ZIVO Coins"));
    expect(onBuyCoins).toHaveBeenCalledTimes(1);
  });

  it("falls back to 0 when transactionCount is undefined", () => {
    render(<ProfileWalletCard balance={0} onOpenWallet={vi.fn()} />);
    const activityTile = screen.getByText("Activity").closest("button")!;
    expect(activityTile).toHaveTextContent("0");
  });
});
