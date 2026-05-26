import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// Mock Capacitor
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Auth Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export AuthProvider and useAuth", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    expect(AuthProvider).toBeDefined();
    expect(useAuth).toBeDefined();
  });

  it("should return a safe fallback when useAuth is used outside provider", async () => {
    const { useAuth } = await import("@/contexts/AuthContext");
    const TestComponent = () => {
      const { user, isLoading, isAdmin } = useAuth();
      return (
        <div>
          <span data-testid="fallback-user">{user ? "logged-in" : "anonymous"}</span>
          <span data-testid="fallback-loading">{String(isLoading)}</span>
          <span data-testid="fallback-admin">{String(isAdmin)}</span>
        </div>
      );
    };
    render(<TestComponent />);
    expect(screen.getByTestId("fallback-user").textContent).toBe("anonymous");
    expect(screen.getByTestId("fallback-loading").textContent).toBe("true");
    expect(screen.getByTestId("fallback-admin").textContent).toBe("false");
  });

  it("should render children and start with loading state", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const TestChild = () => {
      const { isLoading, user } = useAuth();
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="user">{user ? "logged-in" : "anonymous"}</span>
        </div>
      );
    };
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestChild />
        </AuthProvider>
      </BrowserRouter>
    );
    // Initially loading or resolves to false
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("anonymous");
    });
  });
});

describe("useProfiles hook", () => {
  it("should be importable", async () => {
    const { useProfiles } = await import("@/hooks/useProfiles");
    expect(useProfiles).toBeDefined();
  });
});

describe("Route Prefetcher", () => {
  it("should render without crashing", async () => {
    const { default: RoutePrefetcher } = await import(
      "@/components/shared/RoutePrefetcher"
    );
    const Wrapper = createTestWrapper();
    const { container } = render(
      <Wrapper>
        <RoutePrefetcher />
      </Wrapper>
    );
    // RoutePrefetcher renders null
    expect(container.innerHTML).toBe("");
  });
});

describe("Error Reporting", () => {
  it("should export setupGlobalErrorHandlers", async () => {
    const { setupGlobalErrorHandlers } = await import(
      "@/lib/security/errorReporting"
    );
    expect(setupGlobalErrorHandlers).toBeDefined();
    expect(typeof setupGlobalErrorHandlers).toBe("function");
  });
});
