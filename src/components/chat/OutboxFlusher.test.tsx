import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutboxFlusher from "./OutboxFlusher";

const mocks = vi.hoisted(() => ({
  flush: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  user: null as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/lib/chat/messageOutbox", () => ({
  flush: mocks.flush,
}));

describe("OutboxFlusher", () => {
  beforeEach(() => {
    mocks.flush.mockClear();
    mocks.user = null;
  });

  it("drains only the currently authenticated owner's queue", async () => {
    const { rerender } = render(<OutboxFlusher />);
    expect(mocks.flush).not.toHaveBeenCalled();

    mocks.user = { id: "owner-a" };
    rerender(<OutboxFlusher />);
    await waitFor(() => expect(mocks.flush).toHaveBeenCalledWith("owner-a"));

    mocks.flush.mockClear();
    mocks.user = { id: "owner-b" };
    rerender(<OutboxFlusher />);
    await waitFor(() => expect(mocks.flush).toHaveBeenCalledWith("owner-b"));

    mocks.flush.mockClear();
    act(() => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(mocks.flush).toHaveBeenCalledTimes(2));
    expect(mocks.flush).toHaveBeenNthCalledWith(1, "owner-b");
    expect(mocks.flush).toHaveBeenNthCalledWith(2, "owner-b");
  });
});
