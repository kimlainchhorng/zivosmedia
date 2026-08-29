import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  privacyMaybeSingle: vi.fn(),
  blockedUsersEq: vi.fn(),
  profilesIn: vi.fn(),
  getUser: vi.fn(),
  invoke: vi.fn(),
  navigate: vi.fn(),
  setBlurSensitiveMedia: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  authUser: { id: "user-1" },
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

vi.mock("@/hooks/useSensitiveMediaPreference", () => ({
  useSensitiveMediaPreference: () => ({
    blurSensitiveMedia: true,
    setBlurSensitiveMedia: mocks.setBlurSensitiveMedia,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  // useGoBack reads the location key to tell a deep-linked page (no history
  // to pop) from a normal in-app navigation.
  useLocation: () => ({ key: "test-key", pathname: "/account/privacy" }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mocks.toastError(...args),
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
  },
}));

import PrivacySettingsPage from "./PrivacySettingsPage";

const privacySettings = {
  allow_message_requests: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const renderWithClient = () => (
    <QueryClientProvider client={queryClient}>
      <PrivacySettingsPage />
    </QueryClientProvider>
  );
  const result = render(renderWithClient());

  return {
    ...result,
    queryClient,
    rerenderPage: () => result.rerender(renderWithClient()),
  };
}

function configureSupabaseTables() {
  mocks.from.mockImplementation((table: string) => {
    if (table === "privacy_settings") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mocks.privacyMaybeSingle,
          })),
        })),
      };
    }

    if (table === "blocked_users") {
      return {
        select: vi.fn(() => ({
          eq: mocks.blockedUsersEq,
        })),
      };
    }

    if (table === "public_profiles") {
      return {
        select: vi.fn(() => ({
          in: mocks.profilesIn,
        })),
      };
    }

    throw new Error(`Unexpected Supabase table: ${table}`);
  });
}

describe("PrivacySettingsPage truthful read and update states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authUser = { id: "user-1" };
    window.sessionStorage.removeItem("zivo_force_travel");
    window.history.replaceState(null, "", "/account/privacy");
    configureSupabaseTables();
    mocks.privacyMaybeSingle.mockResolvedValue({
      data: privacySettings,
      error: null,
    });
    mocks.blockedUsersEq.mockResolvedValue({ data: [], error: null });
    mocks.profilesIn.mockResolvedValue({ data: [], error: null });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    mocks.setBlurSensitiveMedia.mockResolvedValue(undefined);
  });

  it("shows the message-request preference as unavailable without presenting a default-on control when the read fails", async () => {
    mocks.privacyMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "privacy settings read failed" },
    });

    renderPage();

    expect(
      await screen.findByText(/message request preference unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry message request preference/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /show non-contact chat alerts/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Profile visibility")).toBeInTheDocument();
    expect(screen.getByText("Zivo Chat privacy")).toBeInTheDocument();
  });

  it("shows blocked users as unavailable instead of claiming the list is empty when its read fails", async () => {
    mocks.blockedUsersEq.mockResolvedValue({
      data: null,
      error: { message: "blocked users read failed" },
    });

    renderPage();

    expect(
      await screen.findByText(/blocked users unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry blocked users/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No blocked users")).not.toBeInTheDocument();
  });

  it("shows the empty state only after a successful blocked-users read", async () => {
    renderPage();

    expect(await screen.findByText("No blocked users")).toBeInTheDocument();
    expect(
      screen.queryByText(/blocked users unavailable/i),
    ).not.toBeInTheDocument();
    expect(mocks.blockedUsersEq).toHaveBeenCalledTimes(1);
  });

  it("keeps the page header and hash targets clear of responsive app chrome", async () => {
    const { container } = renderPage();

    await screen.findByRole("switch", {
      name: /show non-contact chat alerts/i,
    });

    expect(container.firstElementChild).toHaveClass("lg:pt-[83px]");
    const pageHeader = screen.getByRole("heading", {
      name: "Privacy & Safety",
    }).parentElement?.parentElement;
    expect(pageHeader).toHaveClass(
      "sticky",
      "top-0",
      "safe-area-top",
      "lg:relative",
      "lg:top-auto",
    );
    expect(pageHeader).toContainElement(
      screen.getByRole("button", { name: "Back" }),
    );

    for (const id of ["receipts", "message-requests", "sensitive", "blocked"]) {
      expect(container.querySelector(`#${id}`)).toHaveClass(
        "scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4.25rem)]",
        "lg:scroll-mt-[95px]",
      );
      expect(container.querySelector(`#${id}`)).not.toHaveAttribute("style");
    }
  });

  it("does not reserve the absent desktop social navigation on Zivo Travel", async () => {
    window.history.replaceState(null, "", "/account/privacy?zt=1");
    const { container } = renderPage();

    await screen.findByRole("switch", {
      name: /show non-contact chat alerts/i,
    });

    expect(container.firstElementChild).not.toHaveClass("lg:pt-[83px]");
    const pageHeader = screen.getByRole("heading", {
      name: "Privacy & Safety",
    }).parentElement?.parentElement;
    expect(pageHeader).toHaveClass("sticky", "top-0", "safe-area-top");
    expect(pageHeader).not.toHaveClass("lg:relative", "lg:top-auto");

    for (const id of ["receipts", "message-requests", "sensitive", "blocked"]) {
      expect(container.querySelector(`#${id}`)).toHaveClass(
        "scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4.25rem)]",
      );
      expect(container.querySelector(`#${id}`)).not.toHaveClass(
        "lg:scroll-mt-[95px]",
      );
    }
  });

  it.each([
    {
      label: "function error",
      response: { data: null, error: { message: "Privacy update denied" } },
    },
    {
      label: "unconfirmed response",
      response: { data: { ok: false }, error: null },
    },
  ])(
    "reports a $label without emitting a success message",
    async ({ response }) => {
      mocks.invoke.mockResolvedValue(response);

      renderPage();

      fireEvent.click(
        await screen.findByRole("switch", {
          name: /show non-contact chat alerts/i,
        }),
      );

      await waitFor(() =>
        expect(mocks.invoke).toHaveBeenCalledWith("privacy-settings-update", {
          body: { key: "allow_message_requests", value: true },
        }),
      );
      await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
      expect(mocks.toastSuccess).not.toHaveBeenCalled();
    },
  );

  it("refetches the message-request preference when its retry control is used", async () => {
    mocks.privacyMaybeSingle
      .mockResolvedValueOnce({
        data: null,
        error: { message: "privacy settings read failed" },
      })
      .mockResolvedValueOnce({ data: privacySettings, error: null });

    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /retry message request preference/i,
      }),
    );

    await waitFor(() =>
      expect(mocks.privacyMaybeSingle).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/message request preference unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("refetches blocked users when its retry control is used", async () => {
    mocks.blockedUsersEq
      .mockResolvedValueOnce({
        data: null,
        error: { message: "blocked users read failed" },
      })
      .mockResolvedValueOnce({ data: [], error: null });

    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /retry blocked users/i }),
    );

    await waitFor(() => expect(mocks.blockedUsersEq).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No blocked users")).toBeInTheDocument();
    expect(
      screen.queryByText(/blocked users unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("uses the documented default only after a successful no-row read", async () => {
    mocks.privacyMaybeSingle.mockResolvedValue({ data: null, error: null });

    renderPage();

    expect(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    ).toBeChecked();
    expect(
      screen.queryByText(/message request preference unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("routes duplicated privacy controls to their owning settings surfaces", async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /profile visibility open the profile control/i,
      }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/account/profile-edit#profile-visibility",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /zivo chat privacy.*sign-in may be required/i,
      }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith("/chat/settings/privacy-hub");
  });

  it("refreshes only the current account's page and alert caches after a confirmed update", async () => {
    const { queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    );

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["privacy-settings", "user-1"],
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["privacy-settings", "user-1", "allow_message_requests"],
      exact: true,
    });
    expect(invalidate.mock.calls).not.toContainEqual([
      expect.objectContaining({
        queryKey: expect.arrayContaining(["user-2"]),
      }),
    ]);
  });

  it("matches blocked profiles by user_id and keeps the block actionable", async () => {
    mocks.blockedUsersEq.mockResolvedValue({
      data: [
        {
          id: "block-row-1",
          blocked_id: "blocked-account-1",
          created_at: "2026-08-26T00:00:00.000Z",
        },
      ],
      error: null,
    });
    mocks.profilesIn.mockResolvedValue({
      data: [
        {
          user_id: "blocked-account-1",
          full_name: "Blocked Person",
          avatar_url: null,
        },
      ],
      error: null,
    });

    renderPage();

    expect(await screen.findByText("Blocked Person")).toBeInTheDocument();
    expect(mocks.profilesIn).toHaveBeenCalledWith("user_id", [
      "blocked-account-1",
    ]);
    expect(screen.getByRole("button", { name: "Unblock" })).toBeEnabled();
  });

  it("retains a blocked row when its public profile is unavailable", async () => {
    mocks.blockedUsersEq.mockResolvedValue({
      data: [
        {
          id: "block-row-1",
          blocked_id: "blocked-account-1",
          created_at: "2026-08-26T00:00:00.000Z",
        },
      ],
      error: null,
    });

    renderPage();

    expect(await screen.findByText("Profile unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeEnabled();
    expect(screen.queryByText("No blocked users")).not.toBeInTheDocument();
  });

  it("makes the blocked list unavailable when profile enrichment fails", async () => {
    mocks.blockedUsersEq.mockResolvedValue({
      data: [
        {
          id: "block-row-1",
          blocked_id: "blocked-account-1",
          created_at: "2026-08-26T00:00:00.000Z",
        },
      ],
      error: null,
    });
    mocks.profilesIn.mockResolvedValue({
      data: null,
      error: { message: "profile lookup failed" },
    });

    renderPage();

    expect(
      await screen.findByText(/blocked users unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("No blocked users")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile unavailable")).not.toBeInTheDocument();
  });

  it("suppresses an old account's late update result after the account changes", async () => {
    let resolveInvoke:
      ((value: { data: { ok: true }; error: null }) => void) | null = null;
    mocks.invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInvoke = resolve;
        }),
    );
    const view = renderPage();

    fireEvent.click(
      await screen.findByRole("switch", {
        name: /show non-contact chat alerts/i,
      }),
    );
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));

    mocks.authUser = { id: "user-2" };
    view.rerenderPage();
    resolveInvoke?.({ data: { ok: true }, error: null });

    await waitFor(() =>
      expect(
        screen.getByRole("switch", {
          name: /show non-contact chat alerts/i,
        }),
      ).toBeInTheDocument(),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
