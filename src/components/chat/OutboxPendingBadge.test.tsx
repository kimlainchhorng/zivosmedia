import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

const OWNER_A = "account-a";
const OWNER_B = "account-b";

const item = (
  id: string,
  ownerId: string,
  chatKey: string,
  message: string,
  filename?: string,
) => ({
  id,
  table: "direct_messages" as const,
  chatKey,
  payload: {
    sender_id: ownerId,
    receiver_id: chatKey,
    message,
    ...(filename ? { file_payload: { filename } } : {}),
  },
});

describe("OutboxPendingBadge", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: OWNER_B } } });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("renders and retries only the active owner's queued messages", async () => {
    const accountAText = item(
      "a-text",
      OWNER_A,
      "chat-1",
      "account A private plaintext",
    );
    const accountAFile = item(
      "a-file",
      OWNER_A,
      "chat-1",
      "file upload",
      "account-a-secret.pdf",
    );
    const accountBChat = item("b-chat", OWNER_B, "chat-1", "account B pending");
    const accountBOtherChat = item(
      "b-other",
      OWNER_B,
      "chat-2",
      "account B other chat",
    );

    act(() => {
      enqueue(OWNER_A, accountAText);
      enqueue(OWNER_A, accountAFile);
    });

    render(<OutboxPendingBadge ownerId={OWNER_B} chatKey="chat-1" />);

    expect(
      screen.queryByRole("button", { name: /pending/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("account A private plaintext"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("account-a-secret.pdf")).not.toBeInTheDocument();

    act(() => {
      enqueue(OWNER_B, accountBChat);
    });

    const button = await screen.findByRole("button", { name: /1 pending/i });
    expect(button).toHaveTextContent("1 pending");

    act(() => {
      enqueue(OWNER_B, accountBOtherChat);
    });

    expect(
      screen.getByRole("button", { name: /1 pending/i }),
    ).toHaveTextContent("1 pending");

    fireEvent.click(button);
    expect(await screen.findByText("Pending outbox")).toBeInTheDocument();
    expect(screen.getByText("account B pending")).toBeInTheDocument();
    expect(
      screen.queryByText("account A private plaintext"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("account-a-secret.pdf")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry now" }));

    await waitFor(() => {
      expect(mocks.insert).toHaveBeenCalledWith(accountBChat.payload);
    });
    expect(mocks.insert).toHaveBeenCalledWith(accountBOtherChat.payload);
    expect(mocks.insert).not.toHaveBeenCalledWith(accountAText.payload);
    expect(mocks.insert).not.toHaveBeenCalledWith(accountAFile.payload);
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /pending/i }),
      ).not.toBeInTheDocument();
    });
    expect(list(OWNER_B)).toHaveLength(0);
    expect(list(OWNER_A)).toHaveLength(2);
  });

  it("discards only the active owner's queued item", async () => {
    const accountAItem = item(
      "shared-id",
      OWNER_A,
      "chat-1",
      "account A keep me",
    );
    const accountBItem = item(
      "shared-id",
      OWNER_B,
      "chat-1",
      "account B discard me",
    );

    act(() => {
      enqueue(OWNER_A, accountAItem);
      enqueue(OWNER_B, accountBItem);
    });

    render(<OutboxPendingBadge ownerId={OWNER_B} chatKey="chat-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /1 pending/i }));
    expect(screen.queryByText("account A keep me")).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", {
        name: /discard account B discard me/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /pending/i }),
      ).not.toBeInTheDocument();
    });
    expect(list(OWNER_B, { chatKey: "chat-1" })).toHaveLength(0);
    expect(list(OWNER_A, { chatKey: "chat-1" })).toEqual([
      expect.objectContaining({
        id: "shared-id",
        payload: accountAItem.payload,
      }),
    ]);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
