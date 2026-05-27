import { beforeEach, describe, expect, it, vi } from "vitest";
import { beginSend, enqueue, finishSend, flush, list, remove } from "./messageOutbox";

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

const directItem = (id: string, chatKey = "chat-1") => ({
  id,
  table: "direct_messages" as const,
  chatKey,
  payload: {
    sender_id: "sender-1",
    receiver_id: chatKey,
    content: "hello",
  },
  optimistic: {
    id,
    content: "hello",
    _upload_status: "failed",
  },
});

describe("messageOutbox", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "sender-1" } } });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("lists and removes scoped queued messages", () => {
    enqueue(directItem("opt-1", "chat-1"));
    enqueue(directItem("opt-2", "chat-2"));

    expect(list({ table: "direct_messages", chatKey: "chat-1" })).toHaveLength(1);
    expect(list()).toHaveLength(2);

    remove("opt-1");

    expect(list({ table: "direct_messages", chatKey: "chat-1" })).toHaveLength(0);
    expect(list()).toHaveLength(1);
  });

  it("prevents duplicate sends while a message id is already claimed", () => {
    expect(beginSend("opt-claim")).toBe(true);
    expect(beginSend("opt-claim")).toBe(false);

    finishSend("opt-claim");

    expect(beginSend("opt-claim")).toBe(true);
    finishSend("opt-claim");
  });

  it("skips already claimed messages during background flush", async () => {
    enqueue(directItem("opt-locked"));
    expect(beginSend("opt-locked")).toBe(true);

    const result = await flush();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(list()).toHaveLength(1);

    finishSend("opt-locked");
  });

  it("removes successfully flushed messages from the queue", async () => {
    const item = directItem("opt-sent");
    enqueue(item);

    const result = await flush();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mocks.from).toHaveBeenCalledWith("direct_messages");
    expect(mocks.insert).toHaveBeenCalledWith(item.payload);
    expect(list()).toHaveLength(0);
  });
});
