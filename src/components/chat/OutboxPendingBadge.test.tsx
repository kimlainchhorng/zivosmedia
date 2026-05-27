import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutboxPendingBadge from "./OutboxPendingBadge";
import { enqueue, list } from "@/lib/chat/messageOutbox";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.authGetUser,
    },
    from: mocks.from,
  },
}));

const item = (id: string, chatKey: string) => ({
  id,
  table: "direct_messages" as const,
  chatKey,
  payload: {
    sender_id: "sender-1",
    receiver_id: chatKey,
    content: "pending",
  },
});

describe("OutboxPendingBadge", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "sender-1" } } });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("shows a scoped pending count and flushes that queued send", async () => {
    render(<OutboxPendingBadge chatKey="chat-1" />);

    expect(screen.queryByRole("button", { name: /pending/i })).not.toBeInTheDocument();

    act(() => {
      enqueue(item("opt-1", "chat-1"));
    });

    const button = await screen.findByRole("button", { name: /1 pending/i });
    expect(button).toHaveTextContent("1 pending");

    act(() => {
      enqueue(item("opt-other", "chat-2"));
    });

    expect(screen.getByRole("button", { name: /1 pending/i })).toHaveTextContent("1 pending");

    fireEvent.click(button);

    await waitFor(() => {
      expect(mocks.insert).toHaveBeenCalledWith(item("opt-1", "chat-1").payload);
    });
    expect(mocks.insert).toHaveBeenCalledWith(item("opt-other", "chat-2").payload);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /pending/i })).not.toBeInTheDocument();
    });
    expect(list({ chatKey: "chat-2" })).toHaveLength(0);
  });
});
