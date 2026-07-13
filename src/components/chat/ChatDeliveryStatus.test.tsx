import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatDeliveryStatus from "./ChatDeliveryStatus";

describe("ChatDeliveryStatus", () => {
  it("renders sending and sent states", () => {
    const { rerender } = render(<ChatDeliveryStatus status="uploading" />);

    expect(screen.getByLabelText("Message delivery status: Sending")).toHaveTextContent("Sending");

    rerender(<ChatDeliveryStatus status="sent" />);

    expect(screen.getByLabelText("Message delivery status: Sent")).toHaveTextContent("Sent");
  });

  it("renders queued recovery controls", () => {
    const onResend = vi.fn();
    const onDiscard = vi.fn();

    render(
      <ChatDeliveryStatus
        status="failed"
        isQueued
        onResend={onResend}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByLabelText("Message delivery status: Queued")).toHaveTextContent("Queued");

    fireEvent.click(screen.getByRole("button", { name: "Resend failed message" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard failed message" }));

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
