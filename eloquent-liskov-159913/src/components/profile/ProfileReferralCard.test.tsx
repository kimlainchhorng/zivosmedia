import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileReferralCard from "./ProfileReferralCard";

const handlers = () => ({ onCopy: vi.fn(), onShare: vi.fn() });

describe("ProfileReferralCard", () => {
  it("renders title, subtitle and stat tiles", () => {
    render(
      <ProfileReferralCard
        code="ABC123"
        totalReferrals={3}
        totalEarnings={15}
        {...handlers()}
      />,
    );
    expect(screen.getByText("Invite friends, earn credits")).toBeInTheDocument();
    expect(screen.getByText("Share your referral code with friends")).toBeInTheDocument();
    expect(screen.getByText("Referrals")).toBeInTheDocument();
    expect(screen.getByText("Earned")).toBeInTheDocument();
  });

  it("displays the referral code in the code chip", () => {
    render(
      <ProfileReferralCard code="ZIVO42" totalReferrals={0} totalEarnings={0} {...handlers()} />,
    );
    expect(screen.getByLabelText("Your referral code")).toHaveTextContent("ZIVO42");
  });

  it("falls back to 'GET CODE' when code is missing and not loading", () => {
    render(
      <ProfileReferralCard code={null} totalReferrals={0} totalEarnings={0} {...handlers()} />,
    );
    expect(screen.getByLabelText("Your referral code")).toHaveTextContent("GET CODE");
  });

  it("formats earnings as currency, no decimals when whole, with decimals when fractional", () => {
    const { rerender } = render(
      <ProfileReferralCard code="X" totalEarnings={50} {...handlers()} />,
    );
    expect(screen.getByText("$50")).toBeInTheDocument();

    rerender(<ProfileReferralCard code="X" totalEarnings={12.5} {...handlers()} />);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("formats referrals compactly", () => {
    const { rerender } = render(
      <ProfileReferralCard code="X" totalReferrals={1500} {...handlers()} />,
    );
    expect(screen.getByText("1.5K")).toBeInTheDocument();

    rerender(<ProfileReferralCard code="X" totalReferrals={42_000} {...handlers()} />);
    expect(screen.getByText("42K")).toBeInTheDocument();
  });

  it("disables Copy and Share buttons when there is no code", () => {
    render(
      <ProfileReferralCard code={null} totalReferrals={0} totalEarnings={0} {...handlers()} />,
    );
    expect(screen.getByLabelText("Copy referral link")).toBeDisabled();
    expect(screen.getByLabelText("Share referral link")).toBeDisabled();
  });

  it("disables Copy and Share buttons while loading", () => {
    render(
      <ProfileReferralCard code="ABC" loading {...handlers()} />,
    );
    expect(screen.getByLabelText("Copy referral link")).toBeDisabled();
    expect(screen.getByLabelText("Share referral link")).toBeDisabled();
  });

  it("calls onCopy and onShare when buttons are clicked", () => {
    const h = handlers();
    render(<ProfileReferralCard code="ABC" {...h} />);
    fireEvent.click(screen.getByLabelText("Copy referral link"));
    fireEvent.click(screen.getByLabelText("Share referral link"));
    expect(h.onCopy).toHaveBeenCalledTimes(1);
    expect(h.onShare).toHaveBeenCalledTimes(1);
  });

  it("renders skeletons when loading", () => {
    const { container } = render(
      <ProfileReferralCard code="X" loading {...handlers()} />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(3);
  });
});
