import { useEffect, lazy, Suspense } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import SetupRequiredRoute from "@/components/auth/SetupRequiredRoute";
import { lazyRetry } from "@/lib/lazyRetry";

// Mobile app home
const AppHome = lazy(() => lazyRetry(() => import("@/pages/app/AppHome")));

const MobileHomeFallback = () => (
  <main className="min-h-screen bg-black px-5 py-[max(1.5rem,var(--zivo-safe-top,0px))] text-white">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
      <div className="flex items-center justify-between">
        <a href="/" className="text-xl font-black tracking-tight" aria-label="ZIVO Home">
          ZIVO
        </a>
        <div className="flex items-center gap-2">
          <a href="/login" className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/85">
            Log in
          </a>
          <a href="/signup" className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
            Sign up
          </a>
        </div>
      </div>

      <section className="flex flex-1 flex-col justify-center py-12" aria-label="ZIVO home is loading">
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
          Loading Home
        </div>
        <h1 className="max-w-sm text-4xl font-black leading-[0.95] tracking-tight">
          One app for travel, reels, chat, shopping, and everyday plans.
        </h1>
        <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/62">
          We are getting your ZIVO Home ready. You can jump straight into the main surfaces now.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-2.5" aria-label="Primary ZIVO shortcuts">
          {[
            ["Feed", "/feed"],
            ["Reels", "/reels"],
            ["Chat", "/chat"],
            ["Profile", "/profile"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  </main>
);

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
          <Suspense fallback={<MobileHomeFallback />}>
            <AppHome />
          </Suspense>
        </SetupRequiredRoute>
      );
    }
    return (
      <Suspense fallback={<MobileHomeFallback />}>
        <AppHome />
      </Suspense>
    );
  }

  return <Navigate to="/feed" replace />;
};

export default Index;
