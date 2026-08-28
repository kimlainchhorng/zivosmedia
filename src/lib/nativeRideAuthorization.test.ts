import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  authSupabase: {
    auth: {
      getSession: testState.getSession,
    },
    functions: {
      invoke: testState.invoke,
    },
  },
}));

import {
  isNativeRideAuthorizationParent,
  issueNativeRideAuthorization,
} from "./nativeRideAuthorization";

const rideOrigin = "https://ride.zivosmedia.com";
const redirectUri = `${rideOrigin}/auth/callback?source=zivosmedia`;
const state = "ride_state_".padEnd(32, "s");
const challenge = "c".repeat(43);
const code = "a".repeat(43);
const expectedUserId = "customer-a";

function authorizeUrl() {
  const url = new URL("https://zivosmedia.com/auth/zivosmedia/authorize");
  url.searchParams.set("app_key", "zivo_ride");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scopes", "openid profile,email");
  return url;
}

beforeEach(() => {
  testState.getSession.mockResolvedValue({
    data: { session: { user: { id: expectedUserId } } },
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  testState.getSession.mockReset();
  testState.invoke.mockReset();
});

describe("native Ride authorization", () => {
  it("recognizes only the two exact native ZIVO parent origins", () => {
    expect(isNativeRideAuthorizationParent("capacitor://localhost")).toBe(true);
    expect(isNativeRideAuthorizationParent("https://localhost")).toBe(true);

    for (const origin of [
      "http://localhost",
      "https://localhost:8443",
      "https://localhost/",
      "capacitor://localhost/",
      "capacitor://localhost.evil.example",
      "https://zivosmedia.com",
    ]) {
      expect(isNativeRideAuthorizationParent(origin), origin).toBe(false);
    }
  });

  it("issues a server-owned code with the exact validated PKCE request", async () => {
    const controller = new AbortController();
    testState.invoke.mockResolvedValue({
      data: { code, redirect_uri: redirectUri, state },
      error: null,
    });

    await expect(
      issueNativeRideAuthorization(
        authorizeUrl(),
        rideOrigin,
        expectedUserId,
        controller.signal,
      ),
    ).resolves.toEqual({
      type: "zivo-ride:authorize-result",
      ok: true,
      code,
      state,
      redirect_uri: redirectUri,
    });
    expect(testState.invoke).toHaveBeenCalledWith(
      "zivosmedia-auth-issue-code",
      {
        body: {
          app_key: "zivo_ride",
          redirect_uri: redirectUri,
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
          scopes: ["openid", "profile", "email"],
        },
        signal: expect.any(AbortSignal),
        timeout: 8_000,
      },
    );
  });

  it("returns only a bounded safe failure for function and response errors", async () => {
    const expectedFailure = {
      type: "zivo-ride:authorize-result",
      ok: false,
      state,
      error: "authorization_unavailable",
    };

    testState.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error("private server detail"),
    });
    await expect(
      issueNativeRideAuthorization(authorizeUrl(), rideOrigin, expectedUserId),
    ).resolves.toEqual(expectedFailure);

    testState.invoke.mockResolvedValueOnce({
      data: {
        code: "too-short",
        redirect_uri: redirectUri,
        state,
      },
      error: null,
    });
    await expect(
      issueNativeRideAuthorization(authorizeUrl(), rideOrigin, expectedUserId),
    ).resolves.toEqual(expectedFailure);

    testState.invoke.mockRejectedValueOnce(new Error("network detail"));
    await expect(
      issueNativeRideAuthorization(authorizeUrl(), rideOrigin, expectedUserId),
    ).resolves.toEqual(expectedFailure);
  });

  it("rejects mismatched state and any callback redirect variation", async () => {
    const invalidResponses = [
      { code, redirect_uri: redirectUri, state: "other-state" },
      {
        code,
        redirect_uri: `${redirectUri}&next=https://evil.example`,
        state,
      },
      {
        code,
        redirect_uri:
          "https://ride.zivosmedia.com.evil.example/auth/callback?source=zivosmedia",
        state,
      },
    ];

    for (const data of invalidResponses) {
      testState.invoke.mockResolvedValueOnce({ data, error: null });
      await expect(
        issueNativeRideAuthorization(
          authorizeUrl(),
          rideOrigin,
          expectedUserId,
        ),
      ).resolves.toEqual({
        type: "zivo-ride:authorize-result",
        ok: false,
        state,
        error: "authorization_unavailable",
      });
    }
  });

  it("returns a safe timeout and ignores a later function success", async () => {
    vi.useFakeTimers();
    let resolveInvocation: ((value: unknown) => void) | undefined;
    testState.invoke.mockReturnValue(
      new Promise((resolve) => {
        resolveInvocation = resolve;
      }),
    );

    const resultPromise = issueNativeRideAuthorization(
      authorizeUrl(),
      rideOrigin,
      expectedUserId,
    );
    await vi.advanceTimersByTimeAsync(0);
    const invocationSignal = testState.invoke.mock.calls[0]?.[1]
      ?.signal as AbortSignal;
    await vi.advanceTimersByTimeAsync(8_000);

    await expect(resultPromise).resolves.toEqual({
      type: "zivo-ride:authorize-result",
      ok: false,
      state,
      error: "authorization_unavailable",
    });
    expect(invocationSignal.aborted).toBe(true);

    resolveInvocation?.({
      data: { code, redirect_uri: redirectUri, state },
      error: null,
    });
    await Promise.resolve();
    await expect(resultPromise).resolves.toMatchObject({ ok: false });
  });

  it("rejects malformed state before invoking the broker", async () => {
    const invalid = authorizeUrl();
    invalid.searchParams.set("state", "short+state");

    await expect(
      issueNativeRideAuthorization(invalid, rideOrigin, expectedUserId),
    ).resolves.toEqual({
      type: "zivo-ride:authorize-result",
      ok: false,
      state: "",
      error: "authorization_unavailable",
    });
    expect(testState.invoke).not.toHaveBeenCalled();
  });

  it("rejects a main-session mismatch before and after code issuance", async () => {
    testState.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "customer-b" } } },
      error: null,
    });
    await expect(
      issueNativeRideAuthorization(authorizeUrl(), rideOrigin, expectedUserId),
    ).resolves.toMatchObject({ ok: false, state });
    expect(testState.invoke).not.toHaveBeenCalled();

    testState.getSession
      .mockResolvedValueOnce({
        data: { session: { user: { id: expectedUserId } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { session: { user: { id: "customer-b" } } },
        error: null,
      });
    testState.invoke.mockResolvedValueOnce({
      data: { code, redirect_uri: redirectUri, state },
      error: null,
    });

    await expect(
      issueNativeRideAuthorization(authorizeUrl(), rideOrigin, expectedUserId),
    ).resolves.toMatchObject({ ok: false, state });
  });
});
