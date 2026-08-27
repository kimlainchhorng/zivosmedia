import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: { id: "user-a" } as { id: string } | null,
  from: vi.fn(),
  preferenceMaybeSingle: vi.fn(),
  contactsEq: vi.fn(),
  getUser: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
    auth: {
      getUser: (...args: unknown[]) => mocks.getUser(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mocks.invoke(...args),
    },
  },
}));

import {
  shouldHideMessageRequestNotification,
  useAllowMessageRequests,
  useMessageRequestNotificationPrivacy,
} from "./useAllowMessageRequests";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderPreferenceHook() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useAllowMessageRequests(), { wrapper });
  return { ...rendered, queryClient };
}

describe("useAllowMessageRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authUser = { id: "user-a" };
    mocks.from.mockImplementation((table: string) => {
      if (table === "privacy_settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mocks.preferenceMaybeSingle,
            })),
          })),
        };
      }
      if (table === "user_contacts") {
        return {
          select: vi.fn(() => ({ eq: mocks.contactsEq })),
        };
      }
      throw new Error(`Unexpected Supabase table: ${table}`);
    });
    mocks.preferenceMaybeSingle.mockResolvedValue({
      data: { allow_message_requests: false },
      error: null,
    });
    mocks.contactsEq.mockResolvedValue({ data: [], error: null });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    mocks.invoke.mockResolvedValue({
      data: { ok: true, user_id: "user-a" },
      error: null,
    });
  });

  it("keeps a failed preference read unconfirmed instead of defaulting it on", async () => {
    mocks.preferenceMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "read failed" },
    });

    const { result } = renderPreferenceHook();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.allow).toBeNull();
  });

  it("uses the documented default only after a successful no-row read", async () => {
    mocks.preferenceMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderPreferenceHook();

    await waitFor(() => expect(result.current.allow).toBe(true));
    expect(result.current.isError).toBe(false);
  });

  it("returns a stored false preference without coercing it", async () => {
    const { result } = renderPreferenceHook();

    await waitFor(() => expect(result.current.allow).toBe(false));
  });

  it.each([
    {
      label: "function error",
      response: { data: null, error: { message: "denied" } },
    },
    {
      label: "unconfirmed response",
      response: { data: { ok: false, user_id: "user-a" }, error: null },
    },
    {
      label: "wrong owner response",
      response: { data: { ok: true, user_id: "user-b" }, error: null },
    },
  ])("rejects a $label without invalidating caches", async ({ response }) => {
    mocks.invoke.mockResolvedValue(response);
    const { result, queryClient } = renderPreferenceHook();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await waitFor(() => expect(result.current.allow).toBe(false));

    let update!: Promise<boolean>;
    act(() => {
      update = result.current.setValue(true);
    });

    await expect(update).rejects.toBeTruthy();
    await waitFor(() => expect(result.current.isUpdating).toBe(false));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("requires the current authenticated owner before invoking the update", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-b" } },
      error: null,
    });
    const { result } = renderPreferenceHook();
    await waitFor(() => expect(result.current.allow).toBe(false));

    await expect(result.current.setValue(true)).rejects.toBeTruthy();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("returns true only after an owner-matched confirmation and exact invalidations", async () => {
    const { result, queryClient } = renderPreferenceHook();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await waitFor(() => expect(result.current.allow).toBe(false));

    await expect(result.current.setValue(true)).resolves.toBe(true);

    expect(mocks.invoke).toHaveBeenCalledWith("privacy-settings-update", {
      body: { key: "allow_message_requests", value: true },
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["privacy-settings", "user-a"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["privacy-settings", "user-a", "allow_message_requests"],
      exact: true,
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ["privacy-settings"],
    });
  });

  it("coalesces duplicate updates while one owner request is pending", async () => {
    const pending = deferred<{
      data: { ok: true; user_id: string };
      error: null;
    }>();
    mocks.invoke.mockReturnValue(pending.promise);
    const { result } = renderPreferenceHook();
    await waitFor(() => expect(result.current.allow).toBe(false));

    let first!: Promise<boolean>;
    let duplicate!: Promise<boolean>;
    act(() => {
      first = result.current.setValue(true);
      duplicate = result.current.setValue(true);
    });

    await expect(duplicate).resolves.toBe(false);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    pending.resolve({
      data: { ok: true, user_id: "user-a" },
      error: null,
    });
    await expect(first).resolves.toBe(true);
  });

  it("suppresses a late account-A confirmation after switching to B", async () => {
    const pending = deferred<{
      data: { ok: true; user_id: string };
      error: null;
    }>();
    mocks.invoke.mockReturnValue(pending.promise);
    const { result, rerender, queryClient } = renderPreferenceHook();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await waitFor(() => expect(result.current.allow).toBe(false));

    let update!: Promise<boolean>;
    act(() => {
      update = result.current.setValue(true);
    });
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));

    mocks.authUser = { id: "user-b" };
    mocks.preferenceMaybeSingle.mockResolvedValue({
      data: { allow_message_requests: true },
      error: null,
    });
    rerender();
    pending.resolve({
      data: { ok: true, user_id: "user-a" },
      error: null,
    });

    await expect(update).resolves.toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("suppresses a late account-A confirmation after an A to B to A switch", async () => {
    const pending = deferred<{
      data: { ok: true; user_id: string };
      error: null;
    }>();
    mocks.invoke.mockReturnValue(pending.promise);
    const { result, rerender, queryClient } = renderPreferenceHook();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await waitFor(() => expect(result.current.allow).toBe(false));

    let update!: Promise<boolean>;
    act(() => {
      update = result.current.setValue(true);
    });
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));

    mocks.authUser = { id: "user-b" };
    rerender();
    mocks.authUser = { id: "user-a" };
    rerender();
    pending.resolve({
      data: { ok: true, user_id: "user-a" },
      error: null,
    });

    await expect(update).resolves.toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("keeps failed contact reads unavailable and fails chat alerts closed", async () => {
    mocks.contactsEq.mockResolvedValue({
      data: null,
      error: { message: "contacts failed" },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useMessageRequestNotificationPrivacy(),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPrivacyUnavailable).toBe(true));
    expect(result.current.shouldHideNotification("stranger-id")).toBe(true);
    expect(result.current.shouldHideNotification(null)).toBe(false);
  });
});

describe("shouldHideMessageRequestNotification", () => {
  const contacts = new Set(["contact-id"]);

  it.each([
    {
      label: "non-chat notification while unknown",
      threadId: null,
      allow: null,
      contactSet: undefined,
      hidden: false,
    },
    {
      label: "chat notification when alerts are confirmed on",
      threadId: "stranger-id",
      allow: true,
      contactSet: undefined,
      hidden: false,
    },
    {
      label: "chat notification while preference is unknown",
      threadId: "stranger-id",
      allow: null,
      contactSet: undefined,
      hidden: true,
    },
    {
      label: "chat notification while contacts are unresolved",
      threadId: "stranger-id",
      allow: false,
      contactSet: undefined,
      hidden: true,
    },
    {
      label: "confirmed contact while alerts are off",
      threadId: "contact-id",
      allow: false,
      contactSet: contacts,
      hidden: false,
    },
    {
      label: "non-contact while alerts are off",
      threadId: "stranger-id",
      allow: false,
      contactSet: contacts,
      hidden: true,
    },
  ])("handles $label", ({ threadId, allow, contactSet, hidden }) => {
    expect(
      shouldHideMessageRequestNotification(threadId, allow, contactSet),
    ).toBe(hidden);
  });
});
