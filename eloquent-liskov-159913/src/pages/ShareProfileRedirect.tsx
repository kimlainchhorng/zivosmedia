import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, Download } from "lucide-react";

const IOS_APP_STORE_URL = "https://apps.apple.com/us/app/zivo-customer/id6759480121";
const ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.hizovo.app";
const APP_SCHEME = "com.hizovo.app";
// How long to wait for the app to take focus before deciding it isn't installed.
const APP_LAUNCH_TIMEOUT_MS = 1500;

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isNativeWebView(): boolean {
  const cap = (window as any)?.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") {
    try {
      return Boolean(cap.isNativePlatform());
    } catch {
      return false;
    }
  }
  return false;
}

function storeUrlFor(platform: Platform): string {
  return platform === "android" ? ANDROID_PLAY_STORE_URL : IOS_APP_STORE_URL;
}

function deepLinkFor(path: string): string {
  return `${APP_SCHEME}://${path.replace(/^\//, "")}`;
}

export default function ShareProfileRedirect() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("post") || "";
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [platform] = useState<Platform>(() => detectPlatform());
  const [showFallback, setShowFallback] = useState(false);
  const fallbackTimer = useRef<number | null>(null);

  // Path to attempt opening in the native app (preserves /p/:code + ?post=...).
  const sharedPath = (() => {
    const search = window.location.search || "";
    return `p/${encodeURIComponent(code || "")}${search}`;
  })();

  const tryOpenApp = () => {
    if (!code) return;
    const nativeUrl = deepLinkFor(sharedPath);

    // If the page becomes hidden, the app most likely opened — cancel store redirect.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (fallbackTimer.current) {
          window.clearTimeout(fallbackTimer.current);
          fallbackTimer.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility, { once: true });
    window.addEventListener("pagehide", onVisibility, { once: true });

    // Attempt the deep link.
    window.location.assign(nativeUrl);

    // If we're still here after the timeout, the app isn't installed → store.
    fallbackTimer.current = window.setTimeout(() => {
      window.location.replace(storeUrlFor(platform));
    }, APP_LAUNCH_TIMEOUT_MS);
  };

  // First effect: on mobile browsers, immediately attempt the deep link and
  // schedule the store fallback. After ~1.2× the timeout we surface the manual
  // landing UI so the user always has buttons to retry/download.
  useEffect(() => {
    if (!code) return;
    if (isNativeWebView() || platform === "desktop") return;

    tryOpenApp();
    const fallbackUiTimer = window.setTimeout(() => {
      setShowFallback(true);
    }, Math.round(APP_LAUNCH_TIMEOUT_MS * 1.2));

    return () => {
      window.clearTimeout(fallbackUiTimer);
      if (fallbackTimer.current) {
        window.clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, platform]);

  // Second effect: in-app or desktop → resolve the share code to the canonical
  // /user/:id page so React Router renders the profile.
  useEffect(() => {
    if (!code) return;
    if (!isNativeWebView() && platform !== "desktop") return;

    supabase
      .from("profiles")
      .select("id, user_id")
      .eq("share_code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const params = new URLSearchParams({ sc: code });
          if (postId) params.set("post", postId);
          const targetId = data.user_id || data.id;
          navigate(`/user/${targetId}?${params.toString()}`, { replace: true });
        } else {
          setNotFound(true);
        }
      });
  }, [code, navigate, postId, platform]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  if (!showFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Manual fallback UI for mobile browsers when the auto-redirect didn't fire.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold">Open this profile in ZIVO</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          For the full experience, view this profile in the ZIVO app.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={tryOpenApp} className="w-full">
            Open in ZIVO app
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              window.location.assign(storeUrlFor(platform));
            }}
          >
            <Download className="h-4 w-4" />
            Download {platform === "android" ? "for Android" : "for iPhone"}
          </Button>
        </div>

        <button
          type="button"
          className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            // Continue in the browser by resolving the share code to /user/:id.
            supabase
              .from("profiles")
              .select("id, user_id")
              .eq("share_code", code)
              .maybeSingle()
              .then(({ data }) => {
                if (!data) {
                  setNotFound(true);
                  return;
                }
                const params = new URLSearchParams({ sc: code || "" });
                if (postId) params.set("post", postId);
                const targetId = data.user_id || data.id;
                navigate(`/user/${targetId}?${params.toString()}`, { replace: true });
              });
          }}
        >
          Continue in browser
        </button>
      </div>
    </div>
  );
}
