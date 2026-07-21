import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatMessageNavigator from "./ChatMessageNavigator";
import type { ChatMessageNavigationRow } from "./chatMessageNavigatorModel";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rowsByTable: {} as Record<string, ChatMessageNavigationRow[]>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

function installQueryMock() {
  mocks.from.mockImplementation((table: string) => {
    const query: Record<string, any> = { table };
    for (const method of ["select", "or", "is", "eq", "ilike", "order", "in", "gt", "lte"]) {
      query[method] = vi.fn(() => query);
    }
    query.limit = vi.fn(async () => ({ data: mocks.rowsByTable[table] || [], error: null }));
    return query;
  });
}

describe("ChatMessageNavigator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rowsByTable = {};
    installQueryMock();
  });

  it("loads pinned DM rows and jumps to a message", async () => {
    mocks.rowsByTable.direct_messages = [
      {
        id: "pin-1",
        sender_id: "peer",
        receiver_id: "me",
        message: "important pinned message",
        message_type: "text",
        created_at: "2026-05-27T10:00:00Z",
        is_pinned: true,
      },
    ];
    const onJump = vi.fn();
    const onUnpin = vi.fn();

    render(
      <ChatMessageNavigator
        open
        initialMode="pinned"
        onClose={vi.fn()}
        source={{ type: "dm", chatId: "peer", peerName: "Alex" }}
        onJumpToMessage={onJump}
        onUnpinMessage={onUnpin}
      />,
    );

    expect(await screen.findByText("important pinned message")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /jump/i }));
    await waitFor(() => expect(onJump).toHaveBeenCalledWith("pin-1"));

    fireEvent.click(screen.getByRole("button", { name: /unpin/i }));
    await waitFor(() => expect(onUnpin).toHaveBeenCalledWith("pin-1"));
  });

  it("searches group history after the minimum query length", async () => {
    mocks.rowsByTable.group_messages = [
      {
        id: "group-hit",
        sender_id: "member-1",
        group_id: "group-1",
        message: "find this group note",
        message_type: "text",
        created_at: "2026-05-27T11:00:00Z",
      },
    ];

    render(
      <ChatMessageNavigator
        open
        initialMode="search"
        onClose={vi.fn()}
        source={{ type: "group", chatId: "group-1", groupName: "Team", senderLabelFor: () => "Nita" }}
        onJumpToMessage={vi.fn()}
      />,
    );

    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search messages/i), { target: { value: "fi" } });

    expect(await screen.findByText((_, node) => node?.textContent === "find this group note")).toBeInTheDocument();
    expect(screen.getByText("Nita")).toBeInTheDocument();
    expect(mocks.from).toHaveBeenCalledWith("group_messages");
  });
});
