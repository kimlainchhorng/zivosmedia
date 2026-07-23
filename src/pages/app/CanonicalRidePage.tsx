import { useEffect, useMemo, useRef, useState } from "react";
import { Car, CreditCard, MapPin, Navigation, Star, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  applyRideLaunchState,
  deriveCanonicalRideFramePath,
  getRideNavigationPath,
  isRideManageAccountRequest,
  updateCanonicalRideHostPath,
} from "@/lib/canonicalRideLaunch";
import {
  getRideAuthorizeUrl,
  resolveRideAppBaseUrl,
} from "@/lib/zivoRideProductionBoundary";
import { getOrCreateRideEmbedSession } from "@/lib/rideEmbedSession";

function appendCanonicalPath(baseUrl: URL, canonicalPath: string) {
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  baseUrl.pathname = `${basePath}${canonicalPath}` || "/";
}

const rideWorkflowSteps: Array<{ label: string; Icon: LucideIcon }> = [
  { label: "Set pickup", Icon: MapPin },
  { label: "Choose ride", Icon: Car },
  { label: "Pay", Icon: CreditCard },
  { label: "Track", Icon: Navigation },
  { label: "Rate", Icon: Star },
];

function RideOpeningWorkflow() {
  return (
    <section
      className="mt-5 rounded-[1.35rem] border border-violet-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_52%,#f5f3ff_100%)] p-3 shadow-[0_12px_32px_rgba(84,37,199,0.08)]"
      aria-label="Ride workflow"
    >
      <div className="grid grid-cols-5 gap-1" role="list">
        {rideWorkflowSteps.map(({ label, Icon }, index) => (
          <div key={label} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center" role="listitem">
            {index < rideWorkflowSteps.length - 1 && (
              <span
                className="absolute left-[58%] top-[15px] h-0.5 w-[84%] rounded-full bg-slate-200"
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] shadow-sm ${
                index === 0
                  ? "border-white bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-white shadow-[0_8px_18px_rgba(124,58,237,0.25)]"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className={`line-clamp-2 text-[9.5px] font-extrabold leading-[1.1] ${index === 0 ? "text-slate-950" : "text-slate-500"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CanonicalRidePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadedRideUrl, setLoadedRideUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isAuthorizingRef = useRef(false);
  const isOpeningAccountRef = useRef(false);
  const embedSession = useMemo(
    () => user?.id ? getOrCreateRideEmbedSession(user.id) : null,
    [user?.id],
  );

  const rideUrl = useMemo(() => {
    const url = resolveRideAppBaseUrl(import.meta.env.VITE_ZIVO_RIDE_APP_URL, {
      allowLocalDevelopment: import.meta.env.DEV,
    });
    if (!url) return null;

    const childPath = deriveCanonicalRideFramePath(location.pathname, location.search, location.state);
    const childUrl = new URL(childPath, "https://ride.invalid");
    appendCanonicalPath(url, childUrl.pathname);
    childUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
    url.searchParams.set("embed", "zivosmedia");
    if (embedSession) url.searchParams.set("embed_session", embedSession);
    const currentHostUrl = new URL(
      `${location.pathname}${location.search}${location.hash}`,
      window.location.origin,
    );
    currentHostUrl.search = applyRideLaunchState(currentHostUrl.searchParams, location.state).toString();
    const canonicalHostPath = updateCanonicalRideHostPath(currentHostUrl.toString(), childPath);
    const hostReturnUrl = new URL(canonicalHostPath ?? currentHostUrl.toString(), window.location.origin);
    url.searchParams.set("host_return", hostReturnUrl.toString());

    return url.toString();
  }, [embedSession, location.hash, location.pathname, location.search, location.state]);

  useEffect(() => {
    if (!rideUrl) return;

    const rideOrigin = new URL(rideUrl).origin;
    const handleRideMessage = (event: MessageEvent<unknown>) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow || event.origin !== rideOrigin) return;

      if (isRideManageAccountRequest(event.data, embedSession)) {
        if (isOpeningAccountRef.current) return;
        isOpeningAccountRef.current = true;
        navigate("/account/settings");
        return;
      }

      const navigationPath = getRideNavigationPath(event.data);
      if (navigationPath) {
        const nextHostPath = updateCanonicalRideHostPath(window.location.href, navigationPath);
        if (nextHostPath) {
          window.history.replaceState(window.history.state, "", nextHostPath);
        }
        return;
      }

      const authorizeUrl = getRideAuthorizeUrl(event.data, {
        allowLocalDevelopment: import.meta.env.DEV,
      });
      if (!authorizeUrl || isAuthorizingRef.current) return;

      isAuthorizingRef.current = true;
      window.location.assign(authorizeUrl.toString());
    };

    window.addEventListener("message", handleRideMessage);
    return () => window.removeEventListener("message", handleRideMessage);
  }, [embedSession, navigate, rideUrl]);

  if (!rideUrl) {
    return (
      <main className="fixed inset-0 z-[2147483000] flex min-h-dvh items-center justify-center bg-white px-6 text-slate-950">
        <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-2xl font-black text-white shadow-lg shadow-violet-200">
            Z
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">ZIVO Ride isn&apos;t connected</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This deployment is missing its canonical Ride app configuration. Please contact a ZIVO administrator.
          </p>
          <RideOpeningWorkflow />
          <a
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
            href="/app"
          >
            Return to ZIVO
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[2147483000] min-h-dvh overflow-hidden bg-white">
      {loadedRideUrl !== rideUrl && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#f5f3ff_100%)] px-6"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-xs rounded-[2rem] border border-violet-100/80 bg-white/90 p-6 text-center shadow-[0_24px_70px_rgba(84,37,199,0.16)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-3xl font-black text-white shadow-lg shadow-violet-200">
              Z
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-violet-700">ZIVO Ride</p>
            <p className="mt-2 text-sm font-bold text-slate-700">Opening ZIVO Ride…</p>
            <RideOpeningWorkflow />
            <div className="mx-auto mt-5 flex w-fit gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-700" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      )}
      <iframe
        key={rideUrl}
        ref={iframeRef}
        className="block h-dvh min-h-dvh w-full border-0 bg-white"
        src={rideUrl}
        title="ZIVO Ride"
        allow="geolocation; payment"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoadedRideUrl(rideUrl)}
      />
    </main>
  );
}
