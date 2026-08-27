import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: "admin-user" } as User,
    isLoading: false,
    isAdmin: false,
    isAdminLoading: true,
    adminRoleError: null as string | null,
    authInitializationError: null as string | null,
    retryAuthInitialization: vi.fn(),
  },
  ownerQuery: {
    data: undefined as boolean | undefined,
    isError: false,
    isSuccess: false,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey[0] === "protected-route-store-owner"
      ? mocks.ownerQuery
      : {
          data: undefined,
          isError: false,
          isSuccess: false,
        },
}));

vi.mock("@/hooks/useUserAccess", () => ({
  useUserAccess: () => ({
    data: undefined,
    isError: false,
    isSuccess: false,
  }),
}));

vi.mock("@/hooks/useSoftwareSubscription", () => ({
  useSoftwareSubscription: () => ({
    data: undefined,
    isError: false,
    isSuccess: false,
  }),
}));

import ProtectedRoute from "@/components/auth/ProtectedRoute";

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <ProtectedRoute requireAdmin>
        <div>Protected admin content</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

function renderOwnerRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin/stores/store-1"]}>
      <Routes>
        <Route
          path="/admin/stores/:storeId"
          element={
            <ProtectedRoute requireAdmin allowStoreOwner>
              <div>Protected owner content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute auth availability", () => {
  beforeEach(() => {
    mocks.auth.user = { id: "admin-user" } as User;
    mocks.auth.isLoading = false;
    mocks.auth.isAdmin = false;
    mocks.auth.isAdminLoading = true;
    mocks.auth.adminRoleError = null;
    mocks.auth.authInitializationError = null;
    mocks.auth.retryAuthInitialization.mockClear();
    mocks.ownerQuery.data = undefined;
    mocks.ownerQuery.isError = false;
    mocks.ownerQuery.isSuccess = false;
  });

  it("blocks admin content until the role check resolves", () => {
    const view = renderAdminRoute();

    expect(screen.getByText("Checking access...")).toBeInTheDocument();
    expect(
      screen.queryByText("Protected admin content"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/don't have permission/i),
    ).not.toBeInTheDocument();

    mocks.auth.isAdminLoading = false;
    mocks.auth.isAdmin = true;
    view.rerender(
      <MemoryRouter initialEntries={["/protected"]}>
        <ProtectedRoute requireAdmin>
          <div>Protected admin content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected admin content")).toBeInTheDocument();
    expect(screen.queryByText("Checking access...")).not.toBeInTheDocument();
  });

  it("shows Retry instead of false access denial when the role read is unavailable", () => {
    mocks.auth.isAdminLoading = false;
    mocks.auth.adminRoleError = "We couldn't verify your access.";

    renderAdminRoute();

    expect(
      screen.getByRole("heading", { name: "Access check unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.queryByText("Protected admin content"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/don't have permission/i),
    ).not.toBeInTheDocument();
  });

  it("denies a confirmed non-admin after the role check resolves", () => {
    mocks.auth.isAdminLoading = false;

    renderAdminRoute();

    expect(
      screen.getByText(/don't have permission to access this page/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Protected admin content"),
    ).not.toBeInTheDocument();
  });

  it("keeps verified store-owner access when the unrelated admin read is unavailable", () => {
    mocks.auth.isAdminLoading = false;
    mocks.auth.adminRoleError = "We couldn't verify your access.";
    mocks.ownerQuery.data = true;
    mocks.ownerQuery.isSuccess = true;

    renderOwnerRoute();

    expect(screen.getByText("Protected owner content")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Access check unavailable" }),
    ).not.toBeInTheDocument();
  });
});
