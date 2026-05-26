import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GiftBubble from "./GiftBubble";

vi.mock("framer-motion", () => {
  const MotionDiv = ({ animate, initial, transition, ...props }: any) => <div {...props} />;

  return {
    motion: {
      div: MotionDiv,
    },
  };
});

describe("GiftBubble", () => {
  it("renders regular coin gifts", () => {
    render(
      <GiftBubble
        isMine
        payload={{
          icon: "Gift",
          name: "Lucky Cat",
          coins: 1,
          total_coins: 2,
          note: "thank you",
        }}
      />,
    );

    expect(screen.getByText("Gift sent")).toBeInTheDocument();
    expect(screen.getByText("Lucky Cat")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText('"thank you"')).toBeInTheDocument();
  });

  it("renders premium gift payloads", () => {
    render(
      <GiftBubble
        isMine={false}
        payload={{
          kind: "premium_gift",
          name: "6 months Premium",
          total_coins: 1500,
          premium_months: 6,
        }}
      />,
    );

    expect(screen.getByText("Premium received")).toBeInTheDocument();
    expect(screen.getByText("6 months Premium")).toBeInTheDocument();
    expect(screen.getByText("6 months of ZIVO Premium")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("does not crash on partial premium payloads", () => {
    render(<GiftBubble isMine={false} payload={{ kind: "premium_gift" }} />);

    expect(screen.getByText("Premium received")).toBeInTheDocument();
    expect(screen.getByText("Gift")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
