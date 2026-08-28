import { authSupabase } from "@/integrations/supabase/client";

const NATIVE_ZIVO_PARENT_ORIGINS = new Set([
  "capacitor://localhost",
  "https://localhost",
]);
const AUTH_CODE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const NATIVE_AUTH_TIMEOUT_MS = 8_000;
const INVOKE_TIMED_OUT = Symbol("native-ride-authorization-timeout");

type IssueCodeResponse = {
  code?: unknown;
  redirect_uri?: unknown;
  state?: unknown;
};

export type NativeRideAuthorizationResult =
  | {
      type: "zivo-ride:authorize-result";
      ok: true;
      code: string;
      state: string;
      redirect_uri: string;
    }
  | {
      type: "zivo-ride:authorize-result";
      ok: false;
      state: string;
      error: "authorization_unavailable";
    };

export function isNativeRideAuthorizationParent(origin: string): boolean {
  return NATIVE_ZIVO_PARENT_ORIGINS.has(origin);
}

function unavailable(state: string): NativeRideAuthorizationResult {
  return {
    type: "zivo-ride:authorize-result",
    ok: false,
    state,
    error: "authorization_unavailable",
  };
}

async function hasExpectedMainSession(expectedUserId: string) {
  const { data, error } = await authSupabase.auth.getSession();
  return !error && data.session?.user.id === expectedUserId;
}

function isExactRideCallback(candidate: string, rideOrigin: string): boolean {
  try {
    const callback = new URL(candidate);
    const callbackParams = [...callback.searchParams.entries()];
    return (
      callback.origin === rideOrigin &&
      !callback.username &&
      !callback.password &&
      callback.pathname === "/auth/callback" &&
      !callback.hash &&
      callbackParams.length === 1 &&
      callbackParams[0][0] === "source" &&
      callbackParams[0][1] === "zivosmedia"
    );
  } catch {
    return false;
  }
}

/**
 * Mints the existing one-time PKCE authorization code inside the authenticated
 * native ZIVO WebView. The Edge Function remains authoritative for the user,
 * registered app, redirect, scopes, and one-time code record.
 */
export async function issueNativeRideAuthorization(
  authorizeUrl: URL,
  rideOrigin: string,
  expectedUserId: string,
  signal?: AbortSignal,
): Promise<NativeRideAuthorizationResult> {
  const appKey = authorizeUrl.searchParams.get("app_key") ?? "";
  const redirectUri = authorizeUrl.searchParams.get("redirect_uri") ?? "";
  const state = authorizeUrl.searchParams.get("state") ?? "";
  const codeChallenge = authorizeUrl.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod =
    authorizeUrl.searchParams.get("code_challenge_method") ?? "";
  const scopesRaw = authorizeUrl.searchParams.get("scopes")?.trim();
  const scopes = scopesRaw
    ? scopesRaw.split(/[\s,]+/).filter(Boolean)
    : undefined;

  if (
    appKey !== "zivo_ride" ||
    !STATE_PATTERN.test(state) ||
    !CODE_CHALLENGE_PATTERN.test(codeChallenge) ||
    codeChallengeMethod !== "S256" ||
    !isExactRideCallback(redirectUri, rideOrigin)
  ) {
    return unavailable(STATE_PATTERN.test(state) ? state : "");
  }

  const invocationController = new AbortController();
  const abortInvocation = () => invocationController.abort();
  if (signal?.aborted) abortInvocation();
  else signal?.addEventListener("abort", abortInvocation, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    if (
      invocationController.signal.aborted ||
      !(await hasExpectedMainSession(expectedUserId)) ||
      invocationController.signal.aborted
    ) {
      return unavailable(state);
    }

    const invocation = authSupabase.functions.invoke<IssueCodeResponse>(
      "zivosmedia-auth-issue-code",
      {
        body: {
          app_key: appKey,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          scopes,
        },
        signal: invocationController.signal,
        timeout: NATIVE_AUTH_TIMEOUT_MS,
      },
    );
    const timeout = new Promise<typeof INVOKE_TIMED_OUT>((resolve) => {
      timeoutId = setTimeout(() => {
        invocationController.abort();
        resolve(INVOKE_TIMED_OUT);
      }, NATIVE_AUTH_TIMEOUT_MS);
    });
    const response = await Promise.race([invocation, timeout]);
    if (response === INVOKE_TIMED_OUT) return unavailable(state);

    const { data, error } = response;

    if (
      error ||
      !data ||
      typeof data.code !== "string" ||
      !AUTH_CODE_PATTERN.test(data.code) ||
      data.state !== state ||
      typeof data.redirect_uri !== "string" ||
      data.redirect_uri !== redirectUri ||
      !isExactRideCallback(data.redirect_uri, rideOrigin) ||
      invocationController.signal.aborted ||
      !(await hasExpectedMainSession(expectedUserId)) ||
      invocationController.signal.aborted
    ) {
      return unavailable(state);
    }

    return {
      type: "zivo-ride:authorize-result",
      ok: true,
      code: data.code,
      state,
      redirect_uri: data.redirect_uri,
    };
  } catch {
    return unavailable(state);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortInvocation);
  }
}
