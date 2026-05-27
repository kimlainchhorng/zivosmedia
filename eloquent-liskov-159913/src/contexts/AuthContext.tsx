import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setupActivityTracking, clearSessionArtifacts } from "@/lib/security/sessionSecurity";
import { getDeviceFingerprint } from "@/lib/security/deviceFingerprint";
import { getMfaChallenge, verifyMfaChallenge, type MfaState } from "@/lib/security/mfa";
import { clearSignedUrlCache } from "@/lib/security/signedMedia";
import { perfMeasure, perfNow } from "@/lib/perfTrace";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  /** When true, the user is signed in at AAL1 and must complete the MFA challenge */
  mfaPending: MfaState | null;
  signUp: (email: string, password: string, fullName: string, dateOfBirth: string, phone?: string) => Promise<{ error: Error | null }>;
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
  mfaPending: null,
  signUp: async () => ({ error: new Error("AuthProvider not mounted") }),
  signIn: async () => ({ error: new Error("AuthProvider not mounted") }),
  verifyMfa: async () => ({ error: new Error("AuthProvider not mounted") }),
  signOut: async () => {},
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
  const [mfaPending, setMfaPending] = useState<MfaState | null>(null);
  const initializedRef = useRef(false);
  const loginGraceUntilRef = useRef(0);
  const explicitSignOutRef = useRef(false);
  // Cache the last user id whose admin role we resolved. TOKEN_REFRESHED fires
  // every ~hour (and bursts on iOS WKWebView during network churn) — without
  // this, we'd re-run the RPC and cascade re-renders through every consumer
  // of useAuth on every refresh.
  const checkedAdminForRef = useRef<string | null>(null);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("check_user_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }
      return data ?? false;
    } catch (err) {
      console.error("Error checking admin role:", err);
      return false;
    }
  };

  useEffect(() => {
    const authStartedAt = perfNow();
    // 1. Restore session from storage FIRST — this prevents the race condition
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const adminStatus = await checkAdminRole(session.user.id);
        setIsAdmin(adminStatus);
        checkedAdminForRef.current = session.user.id;
      }

      // Only mark as ready AFTER getSession completes
      initializedRef.current = true;
      setIsLoading(false);
      perfMeasure("auth ready", authStartedAt, {
        hasSession: Boolean(session),
      });
    });

    // 2. Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignore events that fire before getSession has finished
        if (!initializedRef.current) return;

        if (import.meta.env.DEV) console.log("[Auth] onAuthStateChange", {
          event,
          hasSession: !!session,
          userId: session?.user?.id ?? null,
          expiresAt: session?.expires_at ?? null,
        });

        // iOS/WebView can emit transient SIGNED_OUT during network churn.
        // Unless this was an explicit user sign-out, rehydrate before accepting logout.
        if (event === "SIGNED_OUT" && !explicitSignOutRef.current) {
          console.warn("[Auth] Received SIGNED_OUT, verifying persisted session before logout");
          void (async () => {
            for (let attempt = 0; attempt < 3; attempt += 1) {
              const { data: { session: recoveredSession } } = await supabase.auth.getSession();
              if (recoveredSession?.user) {
                setSession(recoveredSession);
                setUser(recoveredSession.user);

                if (checkedAdminForRef.current !== recoveredSession.user.id) {
                  try {
                    const adminStatus = await checkAdminRole(recoveredSession.user.id);
                    setIsAdmin(adminStatus);
                    checkedAdminForRef.current = recoveredSession.user.id;
                  } catch {
                    setIsAdmin(false);
                  }
                }
                return;
              }

              await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
            }

            // No recovered session after retries; apply signed-out state.
            clearSessionArtifacts();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            checkedAdminForRef.current = null;
          })();
          return;
        }

        // Fresh logins should always start a fresh security window.
        // Keep INITIAL_SESSION untouched so persisted sessions still respect max age.
        if (event === "SIGNED_IN") {
          loginGraceUntilRef.current = Date.now() + 15_000;
          clearSessionArtifacts();
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only re-resolve admin role when the user actually changed (sign-in
          // / account switch). Skipping this on TOKEN_REFRESHED avoids a
          // bursty RPC + re-render cascade for every consumer of useAuth.
          if (checkedAdminForRef.current !== session.user.id) {
            checkAdminRole(session.user.id).then((adminStatus) => {
              setIsAdmin(adminStatus);
              checkedAdminForRef.current = session.user.id;
            }).catch(() => {
              setIsAdmin(false);
            });
          }
        } else {
          clearSessionArtifacts();
          setIsAdmin(false);
          checkedAdminForRef.current = null;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth: string, phone?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("public-signup", {
        body: {
          email,
          password,
          fullName,
          dateOfBirth,
          ...(phone ? { phone } : {}),
        },
      });

      if (error) {
        return { error: new Error(error.message || "Could not create account") };
      }

      if (!data?.success) {
        return { error: new Error(data?.error || "Could not create account") };
      }

      return { error: null };
    } catch (err) {
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
          msg.includes("timeout")
        );
      };

      const { data: precheckData, error: precheckError } = await (supabase as any).rpc("auth_precheck_login", {
        _identifier: normalizedEmail,
        _device_fingerprint: deviceFingerprint,
      });

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

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      try {
        await (supabase as any).rpc("auth_record_login_attempt", {
          _identifier: normalizedEmail,
          _success: !error,
          _device_fingerprint: deviceFingerprint,
        });
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
          const { data: { user: signedInUser } } = await supabase.auth.getUser();
          if (signedInUser) {
            const { data: isDriver } = await (supabase as any).rpc("is_driver", {
              p_user_id: signedInUser.id,
            });
            if (isDriver) {
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
          const challenge = await getMfaChallenge();
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
    await supabase.auth.signOut({ scope: "local" });
    setUser(null);
    setSession(null);
    setIsAdmin(false);
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

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, mfaPending, signUp, signIn, verifyMfa, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
