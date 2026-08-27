import { useEffect, lazy, Suspense } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import SetupRequiredRoute from "@/components/auth/SetupRequiredRoute";
import { lazyRetry } from "@/lib/lazyRetry";

// Mobile app home
const AppHome = lazy(() => lazyRetry(() => import("@/pages/app/AppHome")));

export function AppHomeLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-[100dvh] items-center justify-center bg-background px-6"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ig-gradient shadow-lg shadow-black/10"
        >
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/35 border-t-white motion-reduce:animate-none" />
        </div>
        <div>
          <p className="bg-ig-gradient bg-clip-text text-sm font-extrabold tracking-[0.2em] text-transparent">
            ZIVO
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Opening your home…
          </p>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const shareCode = new URLSearchParams(window.location.search).get("p");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = params.get("error") || hashParams.get("error");
    const errorDesc = params.get("error_description") || hashParams.get("error_description");

    // Support legacy shared links that may include URL-safe token chars.
    if (shareCode && /^[a-z0-9_-]{4,64}$/i.test(shareCode)) {
      navigate(`/p/${shareCode}`, { replace: true });
      return;
    }

    if (error) {
      let message = "Authentication failed. Please try again.";
      if (
        errorDesc?.toLowerCase().includes("database error") ||
        errorDesc?.toLowerCase().includes("saving new user") ||
        errorDesc?.toLowerCase().includes("not on allowlist")
      ) {
        message = "This email is not authorized to sign up. Please request an invitation to join ZIVO.";
      }
      toast({ title: "Sign-up blocked", description: message, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [navigate, shareCode]);

  if (shareCode && /^[a-z0-9_-]{4,64}$/i.test(shareCode)) {
    return <Navigate to={`/p/${shareCode}`} replace />;
  }

  if (isMobile) {
    if (user) {
      return (
        <SetupRequiredRoute>
          <Suspense fallback={<AppHomeLoadingState />}>
            <AppHome />
          </Suspense>
        </SetupRequiredRoute>
      );
    }
    return (
      <Suspense fallback={<AppHomeLoadingState />}>
        <AppHome />
      </Suspense>
    );
  }

  return <Navigate to="/feed" replace />;
};

export default Index;
