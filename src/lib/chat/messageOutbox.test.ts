import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginSend,
  enqueue,
  finishSend,
  flush,
  list,
  remove,
} from "./messageOutbox";

const STORAGE_KEY = "zivo.chat.outbox.v1";

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

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const directItem = (ownerId: string, id: string, chatKey = "chat-1") => ({
  id,
  table: "direct_messages" as const,
  chatKey,
  payload: {
    sender_id: ownerId,
    receiver_id: chatKey,
    message: `hello from ${ownerId}`,
  },
  optimistic: {
    id,
    sender_id: ownerId,
    message: `hello from ${ownerId}`,
    _upload_status: "failed",
  },
});

const storedItem = (
  ownerId: string,
  id: string,
  overrides: Record<string, unknown> = {},
) => ({
  ownerId,
  revision: `revision-${ownerId}-${id}`,
  ...directItem(ownerId, id),
  createdAt: 1,
  attempts: 0,
  ...overrides,
});

describe("messageOutbox account isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "owner-a" } },
      error: null,
    });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("lists and removes only the requested owner, including when ids match", () => {
    enqueue("owner-a", directItem("owner-a", "same-id", "chat-a"));
    enqueue("owner-b", directItem("owner-b", "same-id", "chat-b"));

    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "same-id",
        chatKey: "chat-a",
      }),
    ]);
    expect(list("owner-b")).toEqual([
      expect.objectContaining({
        ownerId: "owner-b",
        id: "same-id",
        chatKey: "chat-b",
      }),
    ]);

    remove("owner-a", "same-id");

    expect(list("owner-a")).toHaveLength(0);
    expect(list("owner-b")).toEqual([
      expect.objectContaining({ ownerId: "owner-b", id: "same-id" }),
    ]);
  });

  it("scopes the in-flight send mutex by owner and id", () => {
    expect(beginSend("owner-a", "same-id")).toBe(true);
    expect(beginSend("owner-a", "same-id")).toBe(false);
    expect(beginSend("owner-b", "same-id")).toBe(true);

    finishSend("owner-a", "same-id");
    expect(beginSend("owner-a", "same-id")).toBe(true);

    finishSend("owner-a", "same-id");
    finishSend("owner-b", "same-id");
  });

  it("flushes only the requested authenticated owner and preserves the other queue", async () => {
    const ownerAItem = directItem("owner-a", "a-queued", "chat-a");
    const ownerBItem = directItem("owner-b", "b-queued", "chat-b");
    enqueue("owner-a", ownerAItem);
    enqueue("owner-b", ownerBItem);
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "owner-b" } },
      error: null,
    });

    const result = await flush("owner-b");

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(ownerBItem.payload);
    expect(mocks.insert).not.toHaveBeenCalledWith(ownerAItem.payload);
    expect(list("owner-a")).toEqual([
      expect.objectContaining({ ownerId: "owner-a", id: "a-queued" }),
    ]);
    expect(list("owner-b")).toHaveLength(0);
  });

  it("never flushes an owner's queue through a different authenticated account", async () => {
    enqueue("owner-a", directItem("owner-a", "a-private"));
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "owner-b" } },
      error: null,
    });

    const result = await flush("owner-a");

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "a-private",
        attempts: 0,
      }),
    ]);
  });

  it("stops before the next insert when the authenticated account switches", async () => {
    const first = directItem("owner-a", "a-first");
    const second = directItem("owner-a", "a-second");
    enqueue("owner-a", first);
    enqueue("owner-a", second);
    mocks.authGetUser
      .mockResolvedValueOnce({ data: { user: { id: "owner-a" } }, error: null })
      .mockResolvedValueOnce({
        data: { user: { id: "owner-b" } },
        error: null,
      });

    const result = await flush("owner-a");

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mocks.authGetUser).toHaveBeenCalledTimes(2);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(first.payload);
    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "a-second",
        attempts: 0,
      }),
    ]);
  });

  it("preserves a newer same-owner same-id replacement after the old insert succeeds", async () => {
    const pendingInsert = deferred<{ error: unknown }>();
    const oldItem = {
      ...directItem("owner-a", "same-id", "old-chat"),
      payload: {
        ...directItem("owner-a", "same-id", "old-chat").payload,
        message: "old payload",
      },
    };
    const replacement = {
      ...directItem("owner-a", "same-id", "new-chat"),
      payload: {
        ...directItem("owner-a", "same-id", "new-chat").payload,
        message: "replacement payload",
      },
    };
    mocks.insert.mockReturnValueOnce(pendingInsert.promise);
    enqueue("owner-a", oldItem);
    const oldRevision = list("owner-a")[0]?.revision;

    const pendingFlush = flush("owner-a");
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    enqueue("owner-a", replacement);
    const replacementRevision = list("owner-a")[0]?.revision;
    expect(replacementRevision).not.toBe(oldRevision);
    pendingInsert.resolve({ error: null });

    expect(await pendingFlush).toEqual({ sent: 1, failed: 0 });
    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "same-id",
        revision: replacementRevision,
        chatKey: "new-chat",
        payload: expect.objectContaining({ message: "replacement payload" }),
        attempts: 0,
      }),
    ]);
  });

  it("does not mark a newer same-owner same-id replacement when the old insert fails", async () => {
    const pendingInsert = deferred<{ error: unknown }>();
    const oldItem = {
      ...directItem("owner-a", "same-id", "old-chat"),
      payload: {
        ...directItem("owner-a", "same-id", "old-chat").payload,
        message: "old payload",
      },
    };
    const replacement = {
      ...directItem("owner-a", "same-id", "new-chat"),
      payload: {
        ...directItem("owner-a", "same-id", "new-chat").payload,
        message: "replacement payload",
      },
    };
    mocks.insert.mockReturnValueOnce(pendingInsert.promise);
    enqueue("owner-a", oldItem);

    const pendingFlush = flush("owner-a");
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    enqueue("owner-a", replacement);
    const replacementRevision = list("owner-a")[0]?.revision;
    pendingInsert.resolve({ error: { message: "offline" } });

    expect(await pendingFlush).toEqual({ sent: 0, failed: 1 });
    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "same-id",
        revision: replacementRevision,
        chatKey: "new-chat",
        payload: expect.objectContaining({ message: "replacement payload" }),
        attempts: 0,
      }),
    ]);
    expect(list("owner-a")[0]).not.toHaveProperty("lastError");
  });

  it("coalesces a follow-up flush and drains an item enqueued after the first snapshot", async () => {
    const pendingInsert = deferred<{ error: unknown }>();
    const first = directItem("owner-a", "first");
    const late = directItem("owner-a", "late");
    mocks.insert
      .mockReturnValueOnce(pendingInsert.promise)
      .mockResolvedValueOnce({ error: null });
    enqueue("owner-a", first);

    const firstFlush = flush("owner-a");
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    enqueue("owner-a", late);
    const followUpFlush = flush("owner-a");
    pendingInsert.resolve({ error: null });

    const [firstResult, followUpResult] = await Promise.all([
      firstFlush,
      followUpFlush,
    ]);
    expect(firstResult).toEqual({ sent: 2, failed: 0 });
    expect(followUpResult).toEqual(firstResult);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(mocks.insert).toHaveBeenNthCalledWith(1, first.payload);
    expect(mocks.insert).toHaveBeenNthCalledWith(2, late.payload);
    expect(list("owner-a")).toHaveLength(0);
  });

  it("runs a fresh final owner pass across an A to B to A auth switch", async () => {
    const firstAuth = deferred<{
      data: { user: { id: string } };
      error: null;
    }>();
    const ownerAItem = directItem("owner-a", "a-switch");
    const ownerBItem = directItem("owner-b", "b-switch");
    enqueue("owner-a", ownerAItem);
    enqueue("owner-b", ownerBItem);
    mocks.authGetUser
      .mockReturnValueOnce(firstAuth.promise)
      .mockResolvedValueOnce({ data: { user: { id: "owner-a" } }, error: null })
      .mockResolvedValueOnce({
        data: { user: { id: "owner-a" } },
        error: null,
      });

    const firstAFlush = flush("owner-a");
    await vi.waitFor(() => expect(mocks.authGetUser).toHaveBeenCalledTimes(1));
    const ownerBFlush = flush("owner-b");
    const finalAFlush = flush("owner-a");
    firstAuth.resolve({ data: { user: { id: "owner-b" } }, error: null });

    const [firstAResult, ownerBResult, finalAResult] = await Promise.all([
      firstAFlush,
      ownerBFlush,
      finalAFlush,
    ]);
    expect(firstAResult).toEqual({ sent: 1, failed: 0 });
    expect(finalAResult).toEqual(firstAResult);
    expect(ownerBResult).toEqual({ sent: 0, failed: 0 });
    expect(mocks.authGetUser).toHaveBeenCalledTimes(3);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(ownerAItem.payload);
    expect(mocks.insert).not.toHaveBeenCalledWith(ownerBItem.payload);
    expect(list("owner-a")).toHaveLength(0);
    expect(list("owner-b")).toEqual([
      expect.objectContaining({ ownerId: "owner-b", id: "b-switch" }),
    ]);
  });

  it("normalizes valid ownerless v1 rows from sender_id and preserves every owner", () => {
    const legacyA = storedItem("owner-a", "legacy-a");
    const legacyB = storedItem("owner-b", "legacy-b");
    delete (legacyA as { ownerId?: string }).ownerId;
    delete (legacyB as { ownerId?: string }).ownerId;
    delete (legacyA as { revision?: string }).revision;
    delete (legacyB as { revision?: string }).revision;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacyA, legacyB]));

    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        revision: expect.any(String),
        id: "legacy-a",
      }),
    ]);
    expect(list("owner-b")).toEqual([
      expect.objectContaining({
        ownerId: "owner-b",
        revision: expect.any(String),
        id: "legacy-b",
      }),
    ]);

    remove("owner-a", "legacy-a");
    expect(list("owner-b")).toEqual([
      expect.objectContaining({ ownerId: "owner-b", id: "legacy-b" }),
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")).toEqual([
      expect.objectContaining({
        ownerId: "owner-b",
        revision: expect.any(String),
        id: "legacy-b",
      }),
    ]);
  });

  it("quarantines malformed, arbitrary-table, and owner-mismatched rows", async () => {
    const missingSender = storedItem("owner-a", "missing-sender", {
      payload: { message: "no sender" },
    });
    delete (missingSender as { ownerId?: string }).ownerId;
    const invalidOwner = storedItem("owner-a", "invalid-owner", {
      ownerId: "",
    });
    const mismatchedOwner = storedItem("owner-a", "mismatch", {
      payload: { sender_id: "owner-b", message: "wrong owner" },
    });
    const arbitraryTable = storedItem("owner-a", "bad-table", {
      table: "profiles",
    });
    const validB = storedItem("owner-b", "valid-b");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        missingSender,
        invalidOwner,
        mismatchedOwner,
        arbitraryTable,
        validB,
      ]),
    );

    expect(list("owner-a")).toHaveLength(0);
    const result = await flush("owner-a");

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(list("owner-b")).toEqual([
      expect.objectContaining({ ownerId: "owner-b", id: "valid-b" }),
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")).toEqual([
      expect.objectContaining({ ownerId: "owner-b", id: "valid-b" }),
    ]);

    enqueue("owner-a", directItem("owner-b", "enqueue-mismatch"));
    expect(list("owner-a")).toHaveLength(0);
    expect(list("owner-b")).toHaveLength(1);
  });

  it("increments a failed item only for its owner when another owner shares the id", async () => {
    enqueue("owner-a", directItem("owner-a", "shared-id"));
    enqueue("owner-b", directItem("owner-b", "shared-id"));
    mocks.insert.mockResolvedValue({ error: { message: "offline" } });

    const result = await flush("owner-a");

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(list("owner-a")).toEqual([
      expect.objectContaining({
        ownerId: "owner-a",
        id: "shared-id",
        attempts: 1,
        lastError: "offline",
      }),
    ]);
    expect(list("owner-b")).toEqual([
      expect.objectContaining({
        ownerId: "owner-b",
        id: "shared-id",
        attempts: 0,
      }),
    ]);
  });

  it("successfully flushes and removes a valid owner-scoped item", async () => {
    const item = directItem("owner-a", "a-sent");
    enqueue("owner-a", item);

    const result = await flush("owner-a");

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mocks.from).toHaveBeenCalledWith("direct_messages");
    expect(mocks.insert).toHaveBeenCalledWith(item.payload);
    expect(list("owner-a")).toHaveLength(0);
  });
});
