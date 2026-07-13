import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ANDROID_STORE_URL,
  IOS_STORE_URL,
  buildNativeReelUrl,
  buildNativeShopUrl,
} from "@/lib/deepLinks";

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export default function DeepLinkLandingPage() {
  const { kind = "", id = "" } = useParams();
  const navigate = useNavigate();

  const webPath = useMemo(() => {
    if (kind === "reel") return `/reels/${id}`;
    if (kind === "shop") return `/grocery/shop/${id}`;
    return "/";
  }, [kind, id]);

  const nativeUrl = useMemo(() => {
    if (kind === "reel") return buildNativeReelUrl(id);
    if (kind === "shop") return buildNativeShopUrl(id);
    return null;
  }, [kind, id]);

  const storeUrl = useMemo(() => {
    if (isIOS()) return IOS_STORE_URL;
    if (isAndroid()) return ANDROID_STORE_URL;
    return IOS_STORE_URL;
  }, []);

  useEffect(() => {
    if (!nativeUrl) {
      navigate("/", { replace: true });
      return;
    }

    const appOpenTimer = window.setTimeout(() => {
      window.location.assign(nativeUrl);
    }, 150);

    const storeFallbackTimer = window.setTimeout(() => {
      window.location.assign(storeUrl);
    }, 1800);

    const webFallbackTimer = window.setTimeout(() => {
      navigate(webPath, { replace: true });
    }, 3200);

    return () => {
      window.clearTimeout(appOpenTimer);
      window.clearTimeout(storeFallbackTimer);
      window.clearTimeout(webFallbackTimer);
    };
  }, [navigate, nativeUrl, storeUrl, webPath]);

  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-border/40 bg-card p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Opening ZiVo</h1>
        <p className="text-sm text-muted-foreground">
          We are taking you to this {kind === "reel" ? "Reel" : "Shop"} in the app.
        </p>
        <a
          href={nativeUrl || "#"}
          className="block w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
        >
          Open In App
        </a>
        <a
          href={storeUrl}
          className="block w-full rounded-xl border border-border py-3 text-sm font-semibold"
        >
          Download ZiVo
        </a>
        <button type="button"
          onClick={() => navigate(webPath, { replace: true })}
          className="text-xs text-muted-foreground underline"
        >
          Continue on web instead
        </button>
      </div>
    </div>
  );
}
