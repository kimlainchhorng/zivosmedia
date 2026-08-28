import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent, User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setupActivityTracking, clearSessionArtifacts } from "@/lib/security/sessionSecurity";
import { getDeviceFingerprint } from "@/lib/security/deviceFingerprint";
import { getMfaChallenge, verifyMfaChallenge, type MfaState } from "@/lib/security/mfa";
import { clearSignedUrlCache } from "@/lib/security/signedMedia";
import { perfMeasure, perfNow } from "@/lib/perfTrace";
import { clearPendingSignup, savePendingSignup } from "@/lib/auth/pendingSignup";
import {
  clearNativeRestoreCredential,
  provisionNativeRestoreCredential,
  tryRestoreNativeSession,
} from "@/lib/nativeRestoreCredentials";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  adminRoleError: string | null;
  authInitializationError: string | null;
  retryAuthInitialization: () => void;
  /** When true, the user is signed in at AAL1 and must complete the MFA challenge */
  mfaPending: MfaState | null;
  signUp: (email: string, password: string, fullName: string, dateOfBirth?: string, phone?: string, signupSource?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Verify a 6-digit TOTP code; clears `mfaPending` on success */
  verifyMfa: (code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_FALLBACK: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  isAdmin: false,
  isAdminLoading: false,
  adminRoleError: null,
  authInitializationError: null,
  retryAuthInitialization: () => {},
  mfaPending: null,
  signUp: async () => ({ error: new Error("AuthProvider not mounted") }),
  signIn: async () => ({ error: new Error("AuthProvider not mounted") }),
  verifyMfa: async () => ({ error: new Error("AuthProvider not mounted") }),
  signOut: async () => {},
};

const AUTH_SESSION_RESTORE_TIMEOUT_MS = 10_000;
const AUTH_ADMIN_ROLE_TIMEOUT_MS = 5_000;
const AUTH_RECOVERY_ATTEMPT_TIMEOUT_MS = 4_000;
const AUTH_INITIALIZATION_ERROR_MESSAGE =
  "We couldn't verify your session. Check your connection and try again.";
const AUTH_ADMIN_ROLE_ERROR_MESSAGE =
  "We couldn't verify your access. Check your connection and try again.";

type AdminRoleResolution =
  | { available: true; isAdmin: boolean }
  | { available: false };

const withAuthTimeout = async <T,>(
  label: string,
  promise: PromiseLike<T>,
  timeoutMs = 15_000,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (import.meta.env.DEV) {
      // Surface the missing-provider warning once without crashing the tree —
      // HMR can briefly render children before AuthProvider re-mounts.
      console.warn("[useAuth] called outside <AuthProvider>; returning fallback");
    }
    return AUTH_FALLBACK;
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminRoleError, setAdminRoleError] = useState<string | null>(null);
  const [authInitializationError, setAuthInitializationError] = useState<string | null>(null);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [mfaPending, setMfaPending] = useState<MfaState | null>(null);
  const initializedRef = useRef(false);
  const authInitializationUnavailableRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const authRevisionRef = useRef(0);
  const loginGraceUntilRef = useRef(0);
  const explicitSignOutRef = useRef(false);
  // Cache the last user id whose admin role we resolved. TOKEN_REFRESHED fires
  // every ~hour (and bursts on iOS WKWebView during network churn) — without
  // this, we'd re-run the RPC and cascade re-renders through every consumer
  // of useAuth on every refresh.
  const checkedAdminForRef = useRef<string | null>(null);

  const checkAdminRole = async (userId: string) => {
    try {
      const adminRoleRequest = Promise.resolve(
        supabase.rpc("check_user_role", {
          _user_id: userId,
          _role: "admin",
        }),
      );
      const { data, error } = await withAuthTimeout(
        "Admin role check",
        adminRoleRequest,
        AUTH_ADMIN_ROLE_TIMEOUT_MS,
      );
      if (error) {
        console.error("Error checking admin role:", error);
        return { available: false } satisfies AdminRoleResolution;
      }
      return {
        available: true,
        isAdmin: data ?? false,
      } satisfies AdminRoleResolution;
    } catch (err) {
      console.error("Error checking admin role:", err);
      return { available: false } satisfies AdminRoleResolution;
    }
  };

  const retryAuthInitialization = useCallback(() => {
    authInitializationUnavailableRef.current = false;
    setAuthInitializationError(null);
    setAdminRoleError(null);
    setIsLoading(true);
    setInitializationAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let pendingStartupEvent:
      | {
          event: AuthChangeEvent;
          session: Session | null;
          wasExplicitSignOut: boolean;
        }
      | undefined;
    const deferredAuthTimers = new Set<number>();
    const authStartedAt = perfNow();
    initializedRef.current = false;

    const applySessionState = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = currentUserIdRef.current !== nextUserId;
      const revision = authRevisionRef.current + 1;

      authRevisionRef.current = revision;
      currentUserIdRef.current = nextUserId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (userChanged) {
        setIsAdmin(false);
        setAdminRoleError(null);
        checkedAdminForRef.current = null;
      }

      if (nextUserId) {
        if (checkedAdminForRef.current !== nextUserId) {
          setIsAdminLoading(true);
          setAdminRoleError(null);
        }
      } else {
        setIsAdmin(false);
        setIsAdminLoading(false);
        setAdminRoleError(null);
        checkedAdminForRef.current = null;
      }

      return revision;
    };

    const resolveAdminRole = async (userId: string, revision: number) => {
      const adminResolution = await checkAdminRole(userId);
      if (
        !active ||
        authRevisionRef.current !== revision ||
        currentUserIdRef.current !== userId
      ) {
        return;
      }

      setIsAdminLoading(false);
      if (!adminResolution.available) {
        setIsAdmin(false);
        setAdminRoleError(AUTH_ADMIN_ROLE_ERROR_MESSAGE);
        return;
      }

      setIsAdmin(adminResolution.isAdmin);
      setAdminRoleError(null);
      checkedAdminForRef.current = userId;
    };

    const deferAuthWork = (work: () => void | Promise<void>) => {
      const timerId = window.setTimeout(() => {
        deferredAuthTimers.delete(timerId);
        if (active) void work();
      }, 0);
      deferredAuthTimers.add(timerId);
    };

    // Subscribe before restoring so INITIAL_SESSION and account changes cannot
    // disappear while storage or token refresh work is still pending.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!active) return;
        if (!initializedRef.current) {
          pendingStartupEvent = {
            event,
            session: nextSession,
            wasExplicitSignOut: explicitSignOutRef.current,
          };
          return;
        }

        if (
          authInitializationUnavailableRef.current &&
          event === "INITIAL_SESSION" &&
          !nextSession
        ) {
          return;
        }

        if (import.meta.env.DEV) console.log("[Auth] onAuthStateChange", {
          event,
          hasSession: !!nextSession,
          userId: nextSession?.user?.id ?? null,
          expiresAt: nextSession?.expires_at ?? null,
        });

        authInitializationUnavailableRef.current = false;
        setAuthInitializationError(null);

        // iOS/WebView can emit transient SIGNED_OUT during network churn.
        // Unless this was an explicit user sign-out, rehydrate before accepting logout.
        if (event === "SIGNED_OUT" && !explicitSignOutRef.current) {
          console.warn("[Auth] Received SIGNED_OUT, verifying persisted session before logout");
          const recoveryRevision = authRevisionRef.current + 1;
          authRevisionRef.current = recoveryRevision;
          setIsLoading(true);
          setIsAdmin(false);
          setIsAdminLoading(Boolean(currentUserIdRef.current));
          setAdminRoleError(null);
          checkedAdminForRef.current = null;

          deferAuthWork(async () => {
            let failedReads = 0;
            for (let attempt = 0; attempt < 3; attempt += 1) {
              let recoveredSession: Session | null | undefined;
              try {
                const { data, error } = await withAuthTimeout(
                  "Session recovery",
                  supabase.auth.getSession(),
                  AUTH_RECOVERY_ATTEMPT_TIMEOUT_MS,
                );
                if (error) throw error;
                recoveredSession = data.session;
              } catch {
                failedReads += 1;
                recoveredSession = undefined;
              }

              if (!active || authRevisionRef.current !== recoveryRevision) return;

              if (recoveredSession?.user) {
                const revision = applySessionState(recoveredSession);
                setAuthInitializationError(null);
                setIsLoading(false);
                void resolveAdminRole(recoveredSession.user.id, revision);
                return;
              }

              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
              }
            }

            if (!active || authRevisionRef.current !== recoveryRevision) return;
            if (failedReads > 0) {
              setIsAdminLoading(false);
              authInitializationUnavailableRef.current = true;
              setAuthInitializationError(AUTH_INITIALIZATION_ERROR_MESSAGE);
              setIsLoading(false);
              return;
            }

            // Three successful empty reads confirm the persisted session is gone.
            clearSessionArtifacts();
            applySessionState(null);
            authInitializationUnavailableRef.current = false;
            setIsLoading(false);
          });
          return;
        }

        // Fresh logins should always start a fresh security window.
        // Keep INITIAL_SESSION untouched so persisted sessions still respect max age.
        if (event === "SIGNED_IN") {
          loginGraceUntilRef.current = Date.now() + 15_000;
          clearSessionArtifacts();
        }

        setIsLoading(false);
        const revision = applySessionState(nextSession);
        if (nextSession?.user) {
          // Only re-resolve admin role when the user actually changed (sign-in
          // / account switch). Skipping this on TOKEN_REFRESHED avoids a
          // bursty RPC + re-render cascade for every consumer of useAuth.
          if (checkedAdminForRef.current !== nextSession.user.id) {
            deferAuthWork(() => resolveAdminRole(nextSession.user.id, revision));
          }
          if (event === "SIGNED_IN") {
            const signedInUserId = nextSession.user.id;
            deferAuthWork(() => {
              if (
                explicitSignOutRef.current ||
                currentUserIdRef.current !== signedInUserId
              ) {
                return;
              }
              return provisionNativeRestoreCredential(signedInUserId, {
                afterInteractiveSignIn: true,
              });
            });
          }
        } else {
          clearSessionArtifacts();
        }
      }
    );

    const finishInitialization = (
      restoredSession: Session | null,
      initializationError: string | null,
    ) => {
      if (!active) return;

      const revision = applySessionState(restoredSession);
      initializedRef.current = true;
      authInitializationUnavailableRef.current = initializationError !== null;
      setAuthInitializationError(initializationError);
      setIsLoading(false);
      perfMeasure("auth ready", authStartedAt, {
        hasSession: Boolean(restoredSession),
        available: initializationError === null,
      });

      if (restoredSession?.user && initializationError === null) {
        void resolveAdminRole(restoredSession.user.id, revision);
        void provisionNativeRestoreCredential(restoredSession.user.id);
      } else if (initializationError) {
        setIsAdminLoading(false);
      }
    };

    const initializeAuth = async () => {
      let restoredSession: Session | null;

      try {
        const { data, error } = await withAuthTimeout(
          "Session restore",
          supabase.auth.getSession(),
          AUTH_SESSION_RESTORE_TIMEOUT_MS,
        );
        if (error) throw error;
        restoredSession = data.session;
      } catch (error) {
        if (!active) return;
        const eventSession = pendingStartupEvent?.session;
        if (eventSession?.user) {
          if (pendingStartupEvent?.event === "SIGNED_IN") {
            loginGraceUntilRef.current = Date.now() + 15_000;
            clearSessionArtifacts();
          }
          finishInitialization(eventSession, null);
          return;
        }

        console.error("[Auth] Session initialization failed:", error);
        finishInitialization(null, AUTH_INITIALIZATION_ERROR_MESSAGE);
        return;
      }

      if (
        !restoredSession?.user &&
        !explicitSignOutRef.current &&
        !pendingStartupEvent?.wasExplicitSignOut &&
        pendingStartupEvent?.event !== "SIGNED_OUT"
      ) {
        const nativeSession = await tryRestoreNativeSession();
        if (!active) return;
        if (nativeSession?.user) restoredSession = nativeSession;
      }

      if (pendingStartupEvent?.event === "SIGNED_OUT") {
        if (pendingStartupEvent.wasExplicitSignOut || !restoredSession?.user) {
          clearSessionArtifacts();
          finishInitialization(null, null);
        } else {
          finishInitialization(restoredSession, AUTH_INITIALIZATION_ERROR_MESSAGE);
        }
        return;
      }

      if (pendingStartupEvent?.event === "SIGNED_IN") {
        loginGraceUntilRef.current = Date.now() + 15_000;
        clearSessionArtifacts();
      }

      const effectiveSession = pendingStartupEvent?.session?.user
        ? pendingStartupEvent.session
        : restoredSession;
      finishInitialization(effectiveSession, null);
    };

    void initializeAuth();

    return () => {
      active = false;
      deferredAuthTimers.forEach((timerId) => window.clearTimeout(timerId));
      subscription.unsubscribe();
    };
  }, [initializationAttempt]);

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth?: string, phone?: string, signupSource?: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Keep credentials and profile data in this browser session until the
    // email recipient proves ownership. The public endpoint accepts email
    // only, so it cannot pre-create or pre-authorize an account.
    try {
      savePendingSignup({
        email: normalizedEmail,
        password,
        fullName,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(phone ? { phone } : {}),
        ...(signupSource ? { signupSource } : {}),
      });
    } catch {
      return { error: new Error("Could not securely start signup in this browser. Please enable session storage and try again.") };
    }

    try {
      const { data, error } = await supabase.functions.invoke("public-signup", {
        body: { email: normalizedEmail },
      });

      if (error) {
        clearPendingSignup();
        return { error: new Error(error.message || "Could not create account") };
      }

      if (!data?.success) {
        clearPendingSignup();
        return { error: new Error(data?.error || "Could not create account") };
      }

      return { error: null };
    } catch (err) {
      clearPendingSignup();
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const deviceFingerprint = `${navigator.userAgent}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${navigator.language}`;

      const isTransientPrecheckError = (message: string) => {
        const msg = message.toLowerCase();
        return (
          msg.includes("upstream connect") ||
          msg.includes("transport failure") ||
          msg.includes("delayed connect") ||
          msg.includes("failed to fetch") ||
          msg.includes("network") ||
          msg.includes("timeout") ||
          msg.includes("pgrst202") ||
          msg.includes("schema cache") ||
          (msg.includes("function") && msg.includes("not found"))
        );
      };

      const { data: precheckData, error: precheckError } = await withAuthTimeout(
        "Login security check",
        (supabase as any).rpc("auth_precheck_login", {
          _identifier: normalizedEmail,
          _device_fingerprint: deviceFingerprint,
        }) as Promise<{ data: any; error: { message?: string } | null }>,
        12_000,
      );

      if (precheckError) {
        const message = precheckError.message || "Security precheck failed";
        if (!isTransientPrecheckError(message)) {
          return { error: new Error(message) };
        }
        console.warn("[Auth] Precheck unavailable, continuing with direct sign-in", {
          message,
        });
      }

      const precheck = Array.isArray(precheckData) ? precheckData[0] : precheckData;
      if (precheck && precheck.allowed === false) {
        return { error: new Error(precheck.reason || "Too many failed attempts. Please try later.") };
      }

      const emailExists = precheck?.email_exists ?? true;

      const { error } = await withAuthTimeout(
        "Supabase sign-in",
        supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        }),
        20_000,
      );

      try {
        await withAuthTimeout(
          "Login audit write",
          (supabase as any).rpc("auth_record_login_attempt", {
            _identifier: normalizedEmail,
            _success: !error,
            _device_fingerprint: deviceFingerprint,
          }),
          8_000,
        );
      } catch {
        // non-critical, ignore
      }

      if (error) {
        // Attach email_exists hint for better error messages
        (error as any)._emailExists = emailExists;
        return { error };
      }

      if (!error) {
        // Block driver accounts from signing into the passenger app
        try {
          const { data: { user: signedInUser } } = await withAuthTimeout(
            "User lookup",
            supabase.auth.getUser(),
            10_000,
          );
          if (signedInUser) {
            const { data: isDriver } = await withAuthTimeout(
              "Driver account check",
              (supabase as any).rpc("is_driver", {
                p_user_id: signedInUser.id,
              }) as Promise<{ data: boolean | null; error: unknown }>,
              8_000,
            );
            if (isDriver) {
              await clearNativeRestoreCredential(signedInUser.id);
              await supabase.auth.signOut();
              return { error: new Error("DRIVER_ACCOUNT") };
            }
          }
        } catch {
          // Non-critical — if the check fails, proceed (fail-open for availability)
        }

        loginGraceUntilRef.current = Date.now() + 15_000;

        // Reset session-security timers at the exact moment of successful auth.
        clearSessionArtifacts();

        // MFA step-up — if the user has TOTP enrolled, gate access until verified.
        try {
          const challenge = await withAuthTimeout("MFA challenge check", getMfaChallenge(), 10_000);
          if (challenge.required) {
            setMfaPending(challenge);
          }
        } catch {
          // Non-critical — proceed without MFA challenge if the API fails
        }

        // Log login event asynchronously (fire-and-forget)
        supabase.functions.invoke("log-login", {
          body: { user_agent: navigator.userAgent },
        }).catch(() => { /* non-critical */ });
      }
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const verifyMfa = useCallback(async (code: string) => {
    if (!mfaPending?.factorId || !mfaPending?.challengeId) {
      return { error: new Error("No active MFA challenge") };
    }
    const err = await verifyMfaChallenge(mfaPending.factorId, mfaPending.challengeId, code);
    if (!err) setMfaPending(null);
    return { error: err };
  }, [mfaPending]);

  const signOut = useCallback(async () => {
    explicitSignOutRef.current = true;
    authInitializationUnavailableRef.current = false;
    clearSessionArtifacts();
    clearSignedUrlCache();
    setMfaPending(null);

    // Remove this device from trusted devices (so next login requires OTP again)
    const currentUser = user;
    if (currentUser) {
      try {
        const fingerprint = getDeviceFingerprint();
        await supabase.rpc("remove_trusted_device", {
          _user_id: currentUser.id,
          _device_fingerprint: fingerprint,
        });
      } catch {
        // Non-critical
      }
    }

    // Soft sign-out — `scope: 'local'` clears the local session but does NOT
    // revoke the refresh token server-side. That keeps the saved-account
    // entry's stored refresh_token valid, so when the user comes back and
    // taps their avatar, `setSession()` succeeds and they're back in with one
    // tap — the Facebook / Instagram pattern.
    //
    // The "Remove this account" button on the picker still does a full wipe
    // (clears the saved-account entry entirely from localStorage), which is
    // the right place for an explicit "forget me on this device" action.
    await clearNativeRestoreCredential(currentUser?.id);
    await supabase.auth.signOut({ scope: "local" });
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsAdminLoading(false);
    setAdminRoleError(null);
    currentUserIdRef.current = null;
    authRevisionRef.current += 1;
    checkedAdminForRef.current = null;
    // Keep a short guard window; next sign-in resets this naturally.
    setTimeout(() => {
      explicitSignOutRef.current = false;
    }, 1000);
  }, [user]);

  // Session security: idle timeout and max age enforcement
  useEffect(() => {
    if (!session) return;
    const cleanup = setupActivityTracking(() => {
      console.warn("[Auth] Session invalidated due to inactivity or max age");
      signOut();
    });
    return cleanup;
  }, [session, signOut]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAdmin,
      isAdminLoading,
      adminRoleError,
      authInitializationError,
      retryAuthInitialization,
      mfaPending,
      signUp,
      signIn,
      verifyMfa,
      signOut,
    }),
    [
      user,
      session,
      isLoading,
      isAdmin,
      isAdminLoading,
      adminRoleError,
      authInitializationError,
      retryAuthInitialization,
      mfaPending,
      verifyMfa,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
