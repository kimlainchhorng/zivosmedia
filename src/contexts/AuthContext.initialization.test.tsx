import { act, fireEvent, render, screen } from "@testing-library/react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authCallback: null as
    null | ((event: AuthChangeEvent, session: Session | null) => void),
  clearNativeRestoreCredential: vi.fn(),
  clearSessionArtifacts: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  provisionNativeRestoreCredential: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  tryRestoreNativeSession: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: mocks.signOut,
      getUser: vi.fn(),
    },
    functions: { invoke: vi.fn() },
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/nativeRestoreCredentials", () => ({
  clearNativeRestoreCredential: mocks.clearNativeRestoreCredential,
  provisionNativeRestoreCredential: mocks.provisionNativeRestoreCredential,
  tryRestoreNativeSession: mocks.tryRestoreNativeSession,
}));

vi.mock("@/lib/security/sessionSecurity", () => ({
  clearSessionArtifacts: mocks.clearSessionArtifacts,
  setupActivityTracking: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/perfTrace", () => ({
  perfMeasure: vi.fn(),
  perfNow: vi.fn(() => 0),
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function sessionFor(userId: string) {
  const user = { id: userId } as User;
  return { user } as Session;
}

function AuthStateProbe() {
  const {
    adminRoleError,
    authInitializationError,
    isAdmin,
    isAdminLoading,
    isLoading,
    retryAuthInitialization,
    session,
    signOut,
    user,
  } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="admin-loading">{String(isAdminLoading)}</span>
      <span data-testid="user">{user?.id ?? "anonymous"}</span>
      <span data-testid="session">{session?.user.id ?? "none"}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="admin-error">{adminRoleError ?? "none"}</span>
      <span data-testid="error">{authInitializationError ?? "none"}</span>
      <button type="button" onClick={retryAuthInitialization}>
        Retry auth
      </button>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>,
  );
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("AuthProvider startup recovery", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.authCallback = null;
    mocks.onAuthStateChange.mockImplementation((callback) => {
      mocks.authCallback = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    mocks.clearNativeRestoreCredential.mockResolvedValue(undefined);
    mocks.provisionNativeRestoreCredential.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.tryRestoreNativeSession.mockResolvedValue(null);
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleLog.mockRestore();
    consoleWarn.mockRestore();
    vi.useRealTimers();
  });

  it("shows an honest retry state when session restoration rejects", async () => {
    mocks.getSession.mockRejectedValueOnce(new Error("storage unavailable"));

    renderProvider();
    await act(flushMicrotasks);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not let an early empty INITIAL_SESSION mask a failed restore", async () => {
    mocks.getSession.mockRejectedValueOnce(new Error("storage unavailable"));

    renderProvider();
    await act(async () => {
      mocks.authCallback?.("INITIAL_SESSION", null);
      await flushMicrotasks();
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );
  });

  it("does not let a late empty INITIAL_SESSION erase a restore failure", async () => {
    mocks.getSession.mockReturnValueOnce(new Promise(() => undefined));

    renderProvider();
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );

    await act(async () => {
      mocks.authCallback?.("INITIAL_SESSION", null);
      await flushMicrotasks();
    });

    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );
  });

  it("stops loading when session restoration never settles", async () => {
    mocks.getSession.mockReturnValueOnce(new Promise(() => undefined));

    renderProvider();
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );
  });

  it("keeps normal pages ready while a bounded admin-role check is pending", async () => {
    const session = sessionFor("user-1");
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    mocks.rpc.mockReturnValueOnce(new Promise(() => undefined));

    renderProvider();
    await act(flushMicrotasks);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("admin-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("user")).toHaveTextContent("user-1");

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await flushMicrotasks();
    });

    expect(mocks.rpc).toHaveBeenCalledWith("check_user_role", {
      _user_id: "user-1",
      _role: "admin",
    });
    expect(screen.getByTestId("admin-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("user-1");
    expect(screen.getByTestId("session")).toHaveTextContent("user-1");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("admin-error")).toHaveTextContent(
      "verify your access",
    );
    expect(mocks.provisionNativeRestoreCredential).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("restores a missing persisted session through the native Android bridge", async () => {
    const restoredSession = sessionFor("restored-user");
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    mocks.tryRestoreNativeSession.mockResolvedValueOnce(restoredSession);

    renderProvider();
    await act(flushMicrotasks);

    expect(mocks.tryRestoreNativeSession).toHaveBeenCalledOnce();
    expect(screen.getByTestId("user")).toHaveTextContent("restored-user");
    expect(screen.getByTestId("session")).toHaveTextContent("restored-user");
    expect(mocks.provisionNativeRestoreCredential).toHaveBeenCalledWith(
      "restored-user",
    );
  });

  it("clears the native restore key before explicit local sign-out", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: sessionFor("sign-out-user") },
      error: null,
    });

    renderProvider();
    await act(flushMicrotasks);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      await flushMicrotasks();
    });

    expect(mocks.clearNativeRestoreCredential).toHaveBeenCalledWith(
      "sign-out-user",
    );
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(
      mocks.clearNativeRestoreCredential.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
  });

  it("uses an early INITIAL_SESSION event when storage restoration stalls", async () => {
    const session = sessionFor("event-user");
    mocks.getSession.mockReturnValueOnce(new Promise(() => undefined));

    renderProvider();
    await act(async () => {
      mocks.authCallback?.("INITIAL_SESSION", session);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("event-user");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("preserves fresh-sign-in security semantics for an early SIGNED_IN event", async () => {
    const session = sessionFor("fresh-user");
    mocks.getSession.mockReturnValueOnce(new Promise(() => undefined));

    renderProvider();
    await act(async () => {
      mocks.authCallback?.("SIGNED_IN", session);
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(screen.getByTestId("user")).toHaveTextContent("fresh-user");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(mocks.clearSessionArtifacts).toHaveBeenCalled();
  });

  it("does not restore an old snapshot after an explicit sign-out during startup", async () => {
    const restore = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    mocks.getSession.mockReturnValueOnce(restore.promise);

    renderProvider();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      mocks.authCallback?.("SIGNED_OUT", null);
      restore.resolve({
        data: { session: sessionFor("old-session-user") },
        error: null,
      });
      await flushMicrotasks();
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("keeps the prior session blocked and recoverable when every sign-out verification read fails", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: sessionFor("still-signed-in") },
      error: null,
    });

    renderProvider();
    await act(flushMicrotasks);
    mocks.getSession.mockRejectedValue(new Error("network unavailable"));

    await act(async () => {
      mocks.authCallback?.("SIGNED_OUT", null);
      await vi.runAllTimersAsync();
      await flushMicrotasks();
    });

    expect(mocks.getSession).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("still-signed-in");
    expect(screen.getByTestId("session")).toHaveTextContent("still-signed-in");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );
  });

  it("accepts sign-out only after three successful empty recovery reads", async () => {
    mocks.getSession
      .mockResolvedValueOnce({
        data: { session: sessionFor("signed-out-user") },
        error: null,
      })
      .mockResolvedValue({ data: { session: null }, error: null });

    renderProvider();
    await act(flushMicrotasks);

    await act(async () => {
      mocks.authCallback?.("SIGNED_OUT", null);
      await vi.runAllTimersAsync();
      await flushMicrotasks();
    });

    expect(mocks.getSession).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("ignores a stale admin result after the account changes", async () => {
    const userAAdmin = deferred<{ data: boolean; error: null }>();
    const userBAdmin = deferred<{ data: boolean; error: null }>();
    mocks.getSession.mockResolvedValueOnce({
      data: { session: sessionFor("user-a") },
      error: null,
    });
    mocks.rpc
      .mockReturnValueOnce(userAAdmin.promise)
      .mockReturnValueOnce(userBAdmin.promise);

    renderProvider();
    await act(flushMicrotasks);

    await act(async () => {
      mocks.authCallback?.("SIGNED_IN", sessionFor("user-b"));
      vi.advanceTimersByTime(0);
      await flushMicrotasks();
    });

    userAAdmin.resolve({ data: true, error: null });
    await act(flushMicrotasks);

    expect(screen.getByTestId("user")).toHaveTextContent("user-b");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("admin-loading")).toHaveTextContent("true");

    userBAdmin.resolve({ data: false, error: null });
    await act(flushMicrotasks);

    expect(screen.getByTestId("user")).toHaveTextContent("user-b");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("admin-loading")).toHaveTextContent("false");
  });

  it("retries initialization without treating an unavailable read as signed out", async () => {
    mocks.getSession
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { session: null }, error: null });

    renderProvider();
    await act(flushMicrotasks);
    expect(screen.getByTestId("error")).toHaveTextContent(
      "verify your session",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry auth" }));
    await act(flushMicrotasks);

    expect(mocks.getSession).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
  });
});
