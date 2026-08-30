import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBroadcastLists, type BroadcastList } from "./useBroadcastLists";

const mocks = vi.hoisted(() => ({
  captureListInsert: vi.fn(),
  insertList: vi.fn(),
  insertMembers: vi.fn(),
  deleteReturningList: vi.fn(),
  loadLists: vi.fn(),
  loadRecipients: vi.fn(),
  insertMessages: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "broadcast_lists") {
        return {
          select: () => ({
            eq: () => ({ order: mocks.loadLists }),
          }),
          insert: (values: unknown) => {
            mocks.captureListInsert(values);
            return {
              select: () => ({ single: mocks.insertList }),
            };
          },
          delete: () => ({
            eq: () => ({
              select: () => ({ maybeSingle: mocks.deleteReturningList }),
            }),
          }),
        };
      }

      if (table === "broadcast_list_members") {
        return {
          insert: mocks.insertMembers,
          select: () => ({ eq: mocks.loadRecipients }),
        };
      }

      if (table === "direct_messages") {
        return { insert: mocks.insertMessages };
      }

      throw new Error(`Unexpected Supabase table: ${table}`);
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

const createdList = {
  id: "list-1",
  name: "Family",
  owner_id: "owner-1",
  created_at: "2026-07-18T00:00:00.000Z",
};

function renderBroadcastListsHook() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useBroadcastLists(), { wrapper });
}

describe("useBroadcastLists", () => {
  beforeEach(() => {
    mocks.captureListInsert.mockReset();
    mocks.insertList.mockReset().mockResolvedValue({ data: createdList, error: null });
    mocks.insertMembers.mockReset().mockResolvedValue({ error: null });
    mocks.deleteReturningList.mockReset().mockResolvedValue({
      data: { id: createdList.id },
      error: null,
    });
    mocks.loadLists.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.loadRecipients.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.insertMessages.mockReset().mockResolvedValue({ error: null });
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a list only after its members are persisted", async () => {
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let list: BroadcastList | null = null;
    await act(async () => {
      list = await result.current.createList("  Family  ", ["member-1", "member-2"]);
    });

    expect(list).toEqual(createdList);
    expect(mocks.captureListInsert).toHaveBeenCalledWith({ owner_id: "owner-1", name: "Family" });
    expect(mocks.insertMembers).toHaveBeenCalledWith([
      { list_id: "list-1", member_id: "member-1" },
      { list_id: "list-1", member_id: "member-2" },
    ]);
    expect(mocks.deleteReturningList).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("rolls back the new list when the member insert fails", async () => {
    mocks.insertMembers.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let list: BroadcastList | null = createdList;
    await act(async () => {
      list = await result.current.createList("Family", ["member-1"]);
    });

    expect(list).toBeNull();
    expect(mocks.deleteReturningList).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not create broadcast list. Please try again.",
    );
  });

  it("reports when a partial list could not be removed", async () => {
    mocks.insertMembers.mockRejectedValue(new Error("network unavailable"));
    mocks.deleteReturningList.mockResolvedValue({ data: null, error: null });
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let list: BroadcastList | null = createdList;
    await act(async () => {
      list = await result.current.createList("Family", ["member-1"]);
    });

    expect(list).toBeNull();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Couldn't finish creating the list. A partial list may remain; delete it and try again.",
    );
  });

  it("reports a delete that affects no visible list row", async () => {
    mocks.deleteReturningList.mockResolvedValue({ data: null, error: null });
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleted = true;
    await act(async () => {
      deleted = await result.current.deleteList("list-1");
    });

    expect(deleted).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not delete broadcast list. Please try again.",
    );
  });

  it("does not call an unreadable recipient list empty", async () => {
    mocks.loadRecipients.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let sent = true;
    await act(async () => {
      sent = await result.current.sendBroadcast("list-1", "Hello everyone");
    });

    expect(sent).toBe(false);
    expect(mocks.insertMessages).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not load broadcast recipients. Please try again.",
    );
    expect(mocks.toastError).not.toHaveBeenCalledWith("No members in this list");
  });

  it("keeps the composer retryable when the message insert fails", async () => {
    mocks.loadRecipients.mockResolvedValue({
      data: [{ member_id: "member-1" }],
      error: null,
    });
    mocks.insertMessages.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });
    const { result } = renderBroadcastListsHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let sent = true;
    await act(async () => {
      sent = await result.current.sendBroadcast("list-1", "  Hello  ");
    });

    expect(sent).toBe(false);
    expect(mocks.insertMessages).toHaveBeenCalledWith([
      {
        sender_id: "owner-1",
        receiver_id: "member-1",
        message: "Hello",
        message_type: "text",
      },
    ]);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not send broadcast. Please try again.",
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
