import { useEffect, useMemo, useRef, useState } from "react";
import {
  Car,
  CreditCard,
  MapPin,
  Navigation,
  Star,
  type LucideIcon,
} from "lucide-react";
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
  canEmbedRideApp,
  getRideAuthorizeUrl,
  resolveLocalRideAppBaseUrl,
  resolveRideAppBaseUrl,
} from "@/lib/zivoRideProductionBoundary";
import { getOrCreateRideEmbedSession } from "@/lib/rideEmbedSession";
import {
  isNativeRideAuthorizationParent,
  issueNativeRideAuthorization,
} from "@/lib/nativeRideAuthorization";

const LOCAL_RIDE_PROBE_TIMEOUT_MS = 2_500;
const RIDE_FRAME_READY_TIMEOUT_MS = 15_000;
const RIDE_EMBED_CHALLENGE_NONCE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const LOCAL_RIDE_HTML_MARKER =
  '<meta name="application-name" content="ZIVO Ride"';

type ActiveNativeRideAuthorization = {
  controller: AbortController;
  requestGeneration: number;
  frameAttempt: number;
  frameWindow: Window;
  rideOrigin: string;
  embedSession: string;
  userId: string;
  state: string;
  challenge: string;
  redirectUri: string;
};

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
          <div
            key={label}
            className="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
            role="listitem"
          >
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
            <span
              className={`line-clamp-2 text-[9.5px] font-extrabold leading-[1.1] ${index === 0 ? "text-slate-950" : "text-slate-500"}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RideOpeningStatusCard() {
  return (
    <div
      className="w-full max-w-xs rounded-[2rem] border border-violet-100/80 bg-white/90 p-6 text-center shadow-[0_24px_70px_rgba(84,37,199,0.16)] backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-3xl font-black text-white shadow-lg shadow-violet-200">
        Z
      </div>
      <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-violet-700">
        ZIVO Ride
      </p>
      <p className="mt-2 text-sm font-bold text-slate-700">
        Opening ZIVO Ride…
      </p>
      <RideOpeningWorkflow />
      <a
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
        href="/"
      >
        Return to ZIVO Home
      </a>
      <div className="mx-auto mt-5 flex w-fit gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-700" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function RideOpeningRecoveryCard({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="w-full max-w-sm rounded-[2rem] border border-violet-100/80 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(84,37,199,0.16)] backdrop-blur-xl"
      role="alert"
      aria-labelledby="ride-opening-recovery-title"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-3xl font-black text-white shadow-lg shadow-violet-200">
        Z
      </div>
      <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-violet-700">
        ZIVO Ride
      </p>
      <h1
        id="ride-opening-recovery-title"
        className="mt-2 text-2xl font-black tracking-tight text-slate-950"
      >
        ZIVO Ride didn&apos;t open
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Ride may be temporarily unavailable. Try opening it again, or return to
        ZIVO Home.
      </p>
      <RideOpeningWorkflow />
      <div className="mt-6 grid gap-3">
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
        <a
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          href="/"
        >
          Return to ZIVO Home
        </a>
      </div>
    </section>
  );
}

function CanonicalRideFrame({
  rideUrl,
  embedSession,
  userId,
}: {
  rideUrl: string;
  embedSession: string | null;
  userId: string | null;
}) {
  const navigate = useNavigate();
  const [frameAttempt, setFrameAttempt] = useState(0);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isFrameUnavailable, setIsFrameUnavailable] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeFrameAttemptRef = useRef(0);
  const isFrameReadyRef = useRef(false);
  const isAuthorizingRef = useRef(false);
  const isOpeningAccountRef = useRef(false);
  const authorizationRequestGenerationRef = useRef(0);
  const activeNativeAuthorizationRef =
    useRef<ActiveNativeRideAuthorization | null>(null);
  const currentEmbedSessionRef = useRef(embedSession);
  const currentUserIdRef = useRef(userId);

  useEffect(() => {
    currentEmbedSessionRef.current = embedSession;
    currentUserIdRef.current = userId;
    let isMounted = true;
    const rideOrigin = new URL(rideUrl).origin;
    const handleRideMessage = (event: MessageEvent<unknown>) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (
        !iframeWindow ||
        event.source !== iframeWindow ||
        event.origin !== rideOrigin
      )
        return;

      const challenge =
        event.data && typeof event.data === "object"
          ? (event.data as {
              type?: unknown;
              embed_session?: unknown;
              nonce?: unknown;
            })
          : null;
      if (
        embedSession &&
        challenge?.type === "zivo-ride:embed-challenge" &&
        challenge.embed_session === embedSession &&
        typeof challenge.nonce === "string" &&
        RIDE_EMBED_CHALLENGE_NONCE_PATTERN.test(challenge.nonce)
      ) {
        iframeWindow.postMessage(
          {
            type: "zivo-ride:embed-confirm",
            embed_session: embedSession,
            nonce: challenge.nonce,
          },
          rideOrigin,
        );
        return;
      }

      if (isRideManageAccountRequest(event.data, embedSession)) {
        if (isOpeningAccountRef.current) return;
        isOpeningAccountRef.current = true;
        navigate("/account/settings");
        return;
      }

      const navigationPath = getRideNavigationPath(event.data);
      if (navigationPath) {
        isFrameReadyRef.current = true;
        setIsFrameReady(true);
        setIsFrameUnavailable(false);
        const nextHostPath = updateCanonicalRideHostPath(
          window.location.href,
          navigationPath,
        );
        if (nextHostPath) {
          window.history.replaceState(window.history.state, "", nextHostPath);
        }
        return;
      }

      const authorizeUrl = getRideAuthorizeUrl(event.data, {
        allowLocalDevelopment: import.meta.env.DEV,
      });
      if (!authorizeUrl || isAuthorizingRef.current) return;

      if (isNativeRideAuthorizationParent(window.location.origin)) {
        const request =
          event.data && typeof event.data === "object"
            ? (event.data as { embed_session?: unknown })
            : null;
        const state = authorizeUrl.searchParams.get("state");
        const challenge = authorizeUrl.searchParams.get("code_challenge");
        const redirectUri = authorizeUrl.searchParams.get("redirect_uri");
        if (
          !embedSession ||
          !userId ||
          request?.embed_session !== embedSession ||
          !state ||
          !challenge ||
          !redirectUri
        ) {
          return;
        }

        isAuthorizingRef.current = true;
        const requestGeneration = authorizationRequestGenerationRef.current + 1;
        authorizationRequestGenerationRef.current = requestGeneration;
        const binding: ActiveNativeRideAuthorization = {
          controller: new AbortController(),
          requestGeneration,
          frameAttempt: activeFrameAttemptRef.current,
          frameWindow: iframeWindow,
          rideOrigin,
          embedSession,
          userId,
          state,
          challenge,
          redirectUri,
        };
        activeNativeAuthorizationRef.current = binding;

        void (async () => {
          const result = await issueNativeRideAuthorization(
            authorizeUrl,
            rideOrigin,
            binding.userId,
            binding.controller.signal,
          );
          const current = activeNativeAuthorizationRef.current;
          const isCurrentRequest =
            isMounted &&
            !binding.controller.signal.aborted &&
            current === binding &&
            authorizationRequestGenerationRef.current === requestGeneration &&
            activeFrameAttemptRef.current === binding.frameAttempt &&
            iframeRef.current?.contentWindow === binding.frameWindow &&
            currentEmbedSessionRef.current === binding.embedSession &&
            currentUserIdRef.current === binding.userId &&
            current?.rideOrigin === binding.rideOrigin &&
            current?.state === binding.state &&
            current?.challenge === binding.challenge &&
            current?.redirectUri === binding.redirectUri;
          if (!isCurrentRequest) return;

          binding.frameWindow.postMessage(
            { ...result, embed_session: binding.embedSession },
            binding.rideOrigin,
          );
          if (activeNativeAuthorizationRef.current === binding) {
            activeNativeAuthorizationRef.current = null;
            isAuthorizingRef.current = false;
          }
        })();
        return;
      }

      isAuthorizingRef.current = true;
      window.location.assign(authorizeUrl.toString());
    };

    window.addEventListener("message", handleRideMessage);
    return () => {
      isMounted = false;
      activeNativeAuthorizationRef.current?.controller.abort();
      activeNativeAuthorizationRef.current = null;
      authorizationRequestGenerationRef.current += 1;
      isAuthorizingRef.current = false;
      window.removeEventListener("message", handleRideMessage);
    };
  }, [embedSession, navigate, rideUrl, userId]);

  useEffect(() => {
    if (isFrameReady || isFrameUnavailable) return;

    const expectedFrameAttempt = frameAttempt;
    const timeoutId = window.setTimeout(() => {
      if (
        activeFrameAttemptRef.current !== expectedFrameAttempt ||
        isFrameReadyRef.current
      )
        return;

      activeNativeAuthorizationRef.current?.controller.abort();
      activeNativeAuthorizationRef.current = null;
      authorizationRequestGenerationRef.current += 1;
      isAuthorizingRef.current = false;
      setIsFrameUnavailable(true);
    }, RIDE_FRAME_READY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [frameAttempt, isFrameReady, isFrameUnavailable]);

  const retryRideFrame = () => {
    activeNativeAuthorizationRef.current?.controller.abort();
    activeNativeAuthorizationRef.current = null;
    authorizationRequestGenerationRef.current += 1;
    isAuthorizingRef.current = false;
    const nextFrameAttempt = activeFrameAttemptRef.current + 1;
    activeFrameAttemptRef.current = nextFrameAttempt;
    isFrameReadyRef.current = false;
    setIsFrameReady(false);
    setIsFrameUnavailable(false);
    setFrameAttempt(nextFrameAttempt);
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="fixed inset-0 z-[2147483000] min-h-dvh overflow-hidden bg-white"
    >
      {!isFrameReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#f5f3ff_100%)] px-6">
          {isFrameUnavailable ? (
            <RideOpeningRecoveryCard onRetry={retryRideFrame} />
          ) : (
            <RideOpeningStatusCard />
          )}
        </div>
      )}
      {!isFrameUnavailable && (
        <iframe
          key={rideUrl}
          ref={iframeRef}
          className="block h-dvh min-h-dvh w-full border-0 bg-white"
          src={rideUrl}
          title="ZIVO Ride"
          allow="geolocation; payment"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </main>
  );
}

export default function CanonicalRidePage() {
  const location = useLocation();
  const { user } = useAuth();
  const localRideCandidate = useMemo(
    () =>
      resolveLocalRideAppBaseUrl(window.location.origin, {
        allowLocalDevelopment: import.meta.env.DEV,
      })?.toString() ?? null,
    [],
  );
  const [availableLocalRideBaseUrl, setAvailableLocalRideBaseUrl] = useState<
    string | null
  >(null);
  const [isCheckingLocalRide, setIsCheckingLocalRide] = useState(
    Boolean(localRideCandidate),
  );
  const embedSession = useMemo(
    () => (user?.id ? getOrCreateRideEmbedSession(user.id) : null),
    [user?.id],
  );
  const configuredRideBaseUrl = useMemo(
    () =>
      resolveRideAppBaseUrl(import.meta.env.VITE_ZIVO_RIDE_APP_URL, {
        allowLocalDevelopment: import.meta.env.DEV,
      }),
    [],
  );

  useEffect(() => {
    if (!localRideCandidate) {
      setAvailableLocalRideBaseUrl(null);
      setIsCheckingLocalRide(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      LOCAL_RIDE_PROBE_TIMEOUT_MS,
    );

    setAvailableLocalRideBaseUrl(null);
    setIsCheckingLocalRide(true);

    void (async () => {
      try {
        const response = await fetch(localRideCandidate, {
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        });
        const contentType = (
          response.headers.get("content-type") ?? ""
        ).toLowerCase();
        const html =
          response.ok && contentType.includes("text/html")
            ? await response.text()
            : "";

        if (isActive && html.includes(LOCAL_RIDE_HTML_MARKER)) {
          setAvailableLocalRideBaseUrl(localRideCandidate);
        }
      } catch {
        // The canonical production handoff remains available below.
      } finally {
        window.clearTimeout(timeoutId);
        if (isActive) setIsCheckingLocalRide(false);
      }
    })();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [localRideCandidate]);

  const rideLaunch = useMemo(() => {
    const activeBaseUrl = availableLocalRideBaseUrl
      ? new URL(availableLocalRideBaseUrl)
      : configuredRideBaseUrl
        ? new URL(configuredRideBaseUrl)
        : null;
    if (!activeBaseUrl) return null;

    const childPath = deriveCanonicalRideFramePath(
      location.pathname,
      location.search,
      location.state,
    );
    const childUrl = new URL(childPath, "https://ride.invalid");
    const buildRideUrl = (baseUrl: URL) => {
      const url = new URL(baseUrl);
      appendCanonicalPath(url, childUrl.pathname);
      childUrl.searchParams.forEach((value, key) =>
        url.searchParams.set(key, value),
      );
      return url;
    };
    // `url` is a cross-repo contract name: Zivo-Admin's check-ride-ecosystem-contracts
    // pins the literal `url.searchParams.set("embed", "zivosmedia")` /
    // `url.searchParams.set("host_return", ...)` markers in this file.
    const url = buildRideUrl(activeBaseUrl);
    const standaloneRideUrl = buildRideUrl(
      configuredRideBaseUrl ?? activeBaseUrl,
    ).toString();
    url.searchParams.set("embed", "zivosmedia");
    if (embedSession) url.searchParams.set("embed_session", embedSession);
    const currentHostUrl = new URL(
      `${location.pathname}${location.search}${location.hash}`,
      window.location.origin,
    );
    currentHostUrl.search = applyRideLaunchState(
      currentHostUrl.searchParams,
      location.state,
    ).toString();
    const canonicalHostPath = updateCanonicalRideHostPath(
      currentHostUrl.toString(),
      childPath,
    );
    const hostReturnUrl = new URL(
      canonicalHostPath ?? currentHostUrl.toString(),
      window.location.origin,
    );
    url.searchParams.set("host_return", hostReturnUrl.toString());

    return {
      frameUrl: url.toString(),
      standaloneRideUrl,
    };
  }, [
    availableLocalRideBaseUrl,
    configuredRideBaseUrl,
    embedSession,
    location.hash,
    location.pathname,
    location.search,
    location.state,
  ]);

  const rideUrl = rideLaunch?.frameUrl ?? null;
  const canEmbedRide = rideUrl
    ? canEmbedRideApp(window.location.origin, rideUrl, {
        allowLocalDevelopment: import.meta.env.DEV,
      })
    : false;

  if (isCheckingLocalRide) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="fixed inset-0 z-[2147483000] flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#f5f3ff_100%)] px-6 text-slate-950"
      >
        <RideOpeningStatusCard />
      </main>
    );
  }

  if (!rideUrl) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="fixed inset-0 z-[2147483000] flex min-h-dvh items-center justify-center bg-white px-6 text-slate-950"
      >
        <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-2xl font-black text-white shadow-lg shadow-violet-200">
            Z
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">
            ZIVO Ride isn&apos;t connected
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This deployment is missing its canonical Ride app configuration.
            Please contact a ZIVO administrator.
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

  if (!canEmbedRide && rideLaunch) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="fixed inset-0 z-[2147483000] flex min-h-dvh items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#f5f3ff_100%)] px-6 py-10 text-slate-950"
      >
        <section className="w-full max-w-md rounded-[2rem] border border-violet-100/80 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(84,37,199,0.16)] backdrop-blur-xl sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 text-3xl font-black text-white shadow-lg shadow-violet-200">
            Z
          </div>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-violet-700">
            ZIVO Ride
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Continue to ZIVO Ride
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The secure Ride app can&apos;t open inside this ZIVO window.
            Continue to the official Ride app to request, track, and manage
            rides.
          </p>
          <RideOpeningWorkflow />
          <div className="mt-6 grid gap-3">
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              href={rideLaunch.standaloneRideUrl}
            >
              Open ZIVO Ride
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              href="/"
            >
              Return to ZIVO Home
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <CanonicalRideFrame
      key={rideUrl}
      rideUrl={rideUrl}
      embedSession={embedSession}
      userId={user?.id ?? null}
    />
  );
}
