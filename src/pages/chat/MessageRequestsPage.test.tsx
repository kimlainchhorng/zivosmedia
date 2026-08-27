import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: { id: "user-a" } as { id: string } | null,
  navigate: vi.fn(),
  goBack: vi.fn(),
  addContact: vi.fn(),
  from: vi.fn(),
  messageRead: vi.fn(),
  contactsRead: vi.fn(),
  profilesRead: vi.fn(),
  blocksRead: vi.fn(),
  getUser: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  refetchPreference: vi.fn(),
  setPreference: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  preference: {
    allow: false as boolean | null,
    isLoading: false,
    isFetching: false,
    isError: false,
    isUpdating: false,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/lib/smartBack", () => ({
  useSmartBack: () => mocks.goBack,
}));

vi.mock("@/hooks/useContacts", () => ({
  useContacts: () => ({ add: mocks.addContact }),
}));

vi.mock("@/hooks/useAllowMessageRequests", () => ({
  useAllowMessageRequests: () => ({
    ...mocks.preference,
    refetch: mocks.refetchPreference,
    setValue: mocks.setPreference,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
    auth: {
      getUser: (...args: unknown[]) => mocks.getUser(...args),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/services/chatRealtimePool", () => ({
  subscribeToPooledPostgresChanges: (...args: unknown[]) =>
    mocks.subscribe(...args),
}));

vi.mock("@/components/profile/ProfilePreviewSheet", () => ({
  default: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mocks.toastError(...args),
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
  },
}));

import MessageRequestsPage from "./MessageRequestsPage";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const page = () => (
    <QueryClientProvider client={queryClient}>
      <MessageRequestsPage />
    </QueryClientProvider>
  );
  const rendered = render(page());
  return {
    ...rendered,
    queryClient,
    rerenderPage: () => rendered.rerender(page()),
  };
}

function incomingMessage(
  senderId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `message-${senderId}`,
    sender_id: senderId,
    receiver_id: mocks.authUser?.id ?? "user-a",
    message: `Hello from ${senderId}`,
    message_type: "text",
    image_url: null,
    video_url: null,
    is_read: false,
    created_at: "2026-08-26T12:00:00.000Z",
    hidden_at: null,
    expires_at: null,
    ...overrides,
  };
}

function metadataBuilder(
  terminal: (details: Record<string, unknown>) => unknown,
) {
  const details: Record<string, unknown> = {};
  const builder: Record<string, any> = {};
  builder.select = vi.fn((columns: string) => {
    details.columns = columns;
    return builder;
  });
  builder.eq = vi.fn((column: string, value: unknown) => {
    details[column] = value;
    return builder;
  });
  builder.in = vi.fn((column: string, values: unknown[]) => {
    details[column] = values;
    return builder;
  });
  builder.abortSignal = vi.fn((signal: AbortSignal) =>
    terminal({ ...details, signal }),
  );
  return builder;
}

describe("MessageRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.authUser = { id: "user-a" };
    mocks.preference.allow = false;
    mocks.preference.isLoading = false;
    mocks.preference.isFetching = false;
    mocks.preference.isError = false;
    mocks.preference.isUpdating = false;
    mocks.from.mockImplementation((table: string) => {
      if (table === "direct_messages") {
        const details: Record<string, unknown> = {};
        const builder: Record<string, any> = { error: null };
        builder.select = vi.fn((columns: string, options?: unknown) => {
          details.columns = columns;
          details.options = options;
          return builder;
        });
        builder.or = vi.fn((filter: string) => {
          details.filter = filter;
          return builder;
        });
        builder.order = vi.fn(() => builder);
        builder.limit = vi.fn((limit: number) => {
          details.limit = limit;
          return builder;
        });
        builder.abortSignal = vi.fn((signal: AbortSignal) =>
          mocks.messageRead({ ...details, signal }),
        );
        builder.update = vi.fn(() => builder);
        builder.eq = vi.fn(() => builder);
        builder.in = vi.fn(() => builder);
        return builder;
      }
      if (table === "user_contacts") {
        return metadataBuilder((details) => mocks.contactsRead(details));
      }
      if (table === "profiles") {
        return metadataBuilder((details) => mocks.profilesRead(details));
      }
      if (table === "blocked_users") {
        return metadataBuilder((details) => mocks.blocksRead(details));
      }
      throw new Error(`Unexpected Supabase table: ${table}`);
    });
    mocks.messageRead.mockResolvedValue({ data: [], error: null, count: 0 });
    mocks.contactsRead.mockResolvedValue({ data: [], error: null });
    mocks.profilesRead.mockResolvedValue({ data: [], error: null });
    mocks.blocksRead.mockResolvedValue({ data: [], error: null });
    mocks.getUser.mockImplementation(async () => ({
      data: { user: mocks.authUser },
      error: null,
    }));
    mocks.subscribe.mockReturnValue(mocks.unsubscribe);
    mocks.refetchPreference.mockResolvedValue(undefined);
    mocks.setPreference.mockResolvedValue(true);
  });

  it("shows truthful alert-only copy and accessible switch semantics", async () => {
    renderPage();

    const preferenceSwitch = await screen.findByRole("switch", {
      name: /show non-contact chat alerts/i,
    });
    expect(preferenceSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText(/this does not block messages or remove them/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/message requests blocked/i),
    ).not.toBeInTheDocument();
  });

  it("does not announce success before the server confirmation resolves", async () => {
    const pending = deferred<boolean>();
    mocks.setPreference.mockReturnValue(pending.promise);
    renderPage();

    fireEvent.click(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    );

    expect(mocks.setPreference).toHaveBeenCalledWith(true);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(true);
      await pending.promise;
    });
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Non-contact chat alerts shown",
      ),
    );
  });

  it("reports a rejected update without showing success", async () => {
    mocks.setPreference.mockRejectedValue(new Error("update failed"));
    renderPage();

    fireEvent.click(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    );

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Couldn't update non-contact chat alerts",
      ),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("does not show success for a stale unconfirmed result", async () => {
    mocks.setPreference.mockResolvedValue(false);
    renderPage();

    fireEvent.click(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    );

    await waitFor(() => expect(mocks.setPreference).toHaveBeenCalledTimes(1));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("shows an unavailable state with retry instead of a default-on switch", async () => {
    mocks.preference.allow = null;
    mocks.preference.isError = true;
    renderPage();

    expect(
      await screen.findByText(/chat alert preference unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retry chat alert preference/i }),
    );
    expect(mocks.refetchPreference).toHaveBeenCalledTimes(1);
  });

  it("disables the switch while an update is pending", async () => {
    mocks.preference.isUpdating = true;
    renderPage();

    expect(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    ).toBeDisabled();
  });

  it("renders a confirmed empty inbox only after a successful message read", async () => {
    renderPage();

    expect(
      await screen.findByText("No message requests."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/message requests unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("shows unavailable with Retry when the message read fails", async () => {
    mocks.messageRead.mockResolvedValue({
      data: null,
      error: { message: "message read failed" },
      count: null,
    });

    renderPage();

    expect(
      await screen.findByText("Message requests unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No message requests.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry message requests/i }),
    ).toBeEnabled();
  });

  it.each([
    ["contact", () => mocks.contactsRead.mockResolvedValue({ data: null, error: { message: "contacts failed" } })],
    ["profile", () => mocks.profilesRead.mockResolvedValue({ data: null, error: { message: "profiles failed" } })],
    ["blocked-sender", () => mocks.blocksRead.mockResolvedValue({ data: null, error: { message: "blocks failed" } })],
  ])("fails the entire inbox closed when the %s read fails", async (_label, failRead) => {
    mocks.messageRead.mockResolvedValue({
      data: [incomingMessage("alice")],
      error: null,
      count: 1,
    });
    mocks.profilesRead.mockResolvedValue({
      data: [{ user_id: "alice", full_name: "Alice", avatar_url: null }],
      error: null,
    });
    failRead();

    renderPage();

    expect(
      await screen.findByText("Message requests unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("No message requests.")).not.toBeInTheDocument();
  });

  it("filters confirmed contacts, blocked senders, replies, hidden messages, and expired messages", async () => {
    const rows = [
      incomingMessage("alice"),
      incomingMessage("contact"),
      incomingMessage("blocked"),
      incomingMessage("replied"),
      incomingMessage("replied", {
        id: "reply-to-replied",
        sender_id: "user-a",
        receiver_id: "replied",
      }),
      incomingMessage("hidden", {
        hidden_at: "2026-08-26T11:00:00.000Z",
      }),
      incomingMessage("expired", {
        expires_at: "2020-01-01T00:00:00.000Z",
      }),
    ];
    mocks.messageRead.mockResolvedValue({
      data: rows,
      error: null,
      count: rows.length,
    });
    mocks.contactsRead.mockResolvedValue({
      data: [{ contact_user_id: "contact" }],
      error: null,
    });
    mocks.blocksRead.mockResolvedValue({
      data: [{ blocked_id: "blocked" }],
      error: null,
    });
    mocks.profilesRead.mockResolvedValue({
      data: [
        { user_id: "alice", full_name: "Alice", avatar_url: null },
        { user_id: "contact", full_name: "Contact", avatar_url: null },
        { user_id: "blocked", full_name: "Blocked", avatar_url: null },
        { user_id: "replied", full_name: "Replied", avatar_url: null },
      ],
      error: null,
    });

    renderPage();

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Contact")).not.toBeInTheDocument();
    expect(screen.queryByText("Blocked")).not.toBeInTheDocument();
    expect(screen.queryByText("Replied")).not.toBeInTheDocument();
    expect(screen.queryByText(/hello from hidden/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hello from expired/i)).not.toBeInTheDocument();
  });

  it("uses an explicit identity fallback after a successful missing-profile read", async () => {
    mocks.messageRead.mockResolvedValue({
      data: [incomingMessage("missing-profile")],
      error: null,
      count: 1,
    });

    renderPage();

    expect(await screen.findByText("Profile unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/^User$/)).not.toBeInTheDocument();
  });

  it("treats histories above the supported classifier window as unavailable", async () => {
    const rows = Array.from({ length: 201 }, (_, index) =>
      incomingMessage(`sender-${index}`, { id: `message-${index}` }),
    );
    mocks.messageRead.mockResolvedValue({
      data: rows,
      error: null,
      count: rows.length,
    });

    renderPage();

    expect(
      await screen.findByText("Message requests unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/history is larger than this page can classify safely/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("No message requests.")).not.toBeInTheDocument();
    expect(mocks.contactsRead).not.toHaveBeenCalled();
  });

  it("recovers from an unavailable read through Retry", async () => {
    mocks.messageRead
      .mockResolvedValueOnce({
        data: null,
        error: { message: "offline" },
        count: null,
      })
      .mockResolvedValue({ data: [], error: null, count: 0 });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /retry message requests/i }),
    );

    expect(
      await screen.findByText("No message requests."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/message requests unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("hides same-owner cached rows after a failed refetch", async () => {
    mocks.messageRead.mockResolvedValue({
      data: [incomingMessage("alice")],
      error: null,
      count: 1,
    });
    mocks.profilesRead.mockResolvedValue({
      data: [{ user_id: "alice", full_name: "Alice", avatar_url: null }],
      error: null,
    });
    const { queryClient } = renderPage();
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    mocks.messageRead.mockResolvedValueOnce({
      data: null,
      error: { message: "refresh failed" },
      count: null,
    });
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["message-requests", "user-a"],
        exact: true,
      });
    });

    expect(
      await screen.findByText("Message requests unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("No message requests.")).not.toBeInTheDocument();
  });

  it("reloads device-local dismissed state for the next authenticated owner", async () => {
    localStorage.setItem(
      "zivo:dismissed-message-requests:user-a",
      JSON.stringify(["alice"]),
    );
    mocks.messageRead.mockImplementation(async ({ filter }) => {
      const ownerId = String(filter).includes("user-b") ? "user-b" : "user-a";
      return {
        data: [incomingMessage("alice", { receiver_id: ownerId })],
        error: null,
        count: 1,
      };
    });
    mocks.profilesRead.mockResolvedValue({
      data: [{ user_id: "alice", full_name: "Alice", avatar_url: null }],
      error: null,
    });
    const { rerenderPage } = renderPage();
    await screen.findByRole("button", { name: /dismissed/i });
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();

    mocks.authUser = { id: "user-b" };
    rerenderPage();

    expect(await screen.findByText("Alice")).toBeInTheDocument();
  });

  it("never renders a late account-A result after switching to B", async () => {
    const accountARead = deferred<{
      data: ReturnType<typeof incomingMessage>[];
      error: null;
      count: number;
    }>();
    mocks.messageRead.mockImplementation(({ filter }) => {
      if (String(filter).includes("user-a")) return accountARead.promise;
      return Promise.resolve({
        data: [incomingMessage("bob", { receiver_id: "user-b" })],
        error: null,
        count: 1,
      });
    });
    mocks.profilesRead.mockImplementation(async ({ user_id }) => {
      const ids = user_id as string[];
      return {
        data: ids.map((id) => ({
          user_id: id,
          full_name: id === "bob" ? "Bob" : "Alice",
          avatar_url: null,
        })),
        error: null,
      };
    });
    const { rerenderPage } = renderPage();
    await waitFor(() => expect(mocks.messageRead).toHaveBeenCalledTimes(1));

    mocks.authUser = { id: "user-b" };
    rerenderPage();
    expect(await screen.findByText("Bob")).toBeInTheDocument();

    await act(async () => {
      accountARead.resolve({
        data: [incomingMessage("alice", { receiver_id: "user-a" })],
        error: null,
        count: 1,
      });
      await accountARead.promise;
    });

    await waitFor(() => expect(screen.queryByText("Alice")).not.toBeInTheDocument());
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
