import { useCallback, useEffect, useRef, useState } from "react";

const MANIFEST_URL =
  "https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/app-updates/latest.json";
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_CHECK_GAP_MS = 30 * 1000;

type UpdateActivation = "prompt" | "next_launch" | "immediate";

interface UpdateManifest {
  version: string;
  url: string;
  checksum?: string;
  message?: string;
  mandatory?: boolean;
  activation?: UpdateActivation;
  minNativeVersion?: string;
}

type BundleRef = {
  id: string;
  version?: string;
};

interface OTAState {
  /** True once a newer bundle has been downloaded and is queued. */
  pending: boolean;
  /** Version string of the downloaded bundle, e.g. "1.0.7". */
  pendingVersion: string | null;
  /** Optional release note/ops message from latest.json. */
  message: string | null;
  /** Required update banners cannot be dismissed. */
  mandatory: boolean;
  /** Apply the downloaded bundle immediately (causes a reload). */
  applyNow: () => Promise<void>;
  /** Hide the banner without applying — bundle still loads on next launch. */
  dismiss: () => void;
  /** True while the dismiss banner has been silenced for this session. */
  dismissed: boolean;
}

function parseVersion(version: string | undefined | null): number[] | null {
  if (!version) return null;
  const core = version.trim().replace(/^v/i, "").split(/[+-]/)[0];
  const parts = core.split(".").map((part) => Number(part));
  return parts.every((part) => Number.isFinite(part)) ? parts : null;
}

function compareVersions(left: string | undefined | null, right: string | undefined | null): number | null {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) return null;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

function shouldInstallUpdate(currentVersion: string | undefined | null, nextVersion: string | undefined | null) {
  if (!nextVersion) return false;
  if (!currentVersion) return true;
  const comparison = compareVersions(currentVersion, nextVersion);
  if (comparison === null) return currentVersion !== nextVersion;
  return comparison < 0;
}

function satisfiesMinimumVersion(currentVersion: string | undefined | null, minimumVersion: string | undefined | null) {
  if (!minimumVersion) return true;
  const comparison = compareVersions(currentVersion, minimumVersion);
  if (comparison === null) return currentVersion === minimumVersion;
  return comparison >= 0;
}

export function useOTAUpdate(): OTAState {
  const [pending, setPending] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mandatory, setMandatory] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const downloadedRef = useRef<BundleRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    let checking = false;
    let lastCheckedAt = 0;
    let resumeHandle: { remove: () => Promise<void> } | undefined;
    const queuedVersions = new Set<string>();

    async function check(force = false) {
      const now = Date.now();
      if (!force && now - lastCheckedAt < MIN_CHECK_GAP_MS) return;
      if (checking) return;

      checking = true;
      lastCheckedAt = now;

      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

        const res = await fetch(MANIFEST_URL, { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const manifest = (await res.json()) as UpdateManifest;
        if (!manifest.version || !manifest.url || cancelled) return;

        const { bundle, native } = await CapacitorUpdater.current();
        // bundle.version is empty string for the built-in (store) bundle
        const runningVersion = bundle.version || import.meta.env.VITE_APP_VERSION;

        if (!shouldInstallUpdate(runningVersion, manifest.version) || cancelled) return;
        if (!satisfiesMinimumVersion(native, manifest.minNativeVersion)) return;
        if (queuedVersions.has(manifest.version) || downloadedRef.current?.version === manifest.version) return;

        const newBundle = await CapacitorUpdater.download({
          url: manifest.url,
          version: manifest.version,
          ...(manifest.checksum ? { checksum: manifest.checksum } : {}),
        });

        if (cancelled) return;

        await CapacitorUpdater.next({ id: newBundle.id });
        queuedVersions.add(manifest.version);

        downloadedRef.current = { id: newBundle.id, version: newBundle.version };
        const shouldPrompt = manifest.activation !== "next_launch";
        setPendingVersion(shouldPrompt ? manifest.version : null);
        setMessage(shouldPrompt ? manifest.message?.trim() || null : null);
        setMandatory(shouldPrompt ? Boolean(manifest.mandatory) : false);
        setDismissed(false);
        setPending(shouldPrompt);

        if (manifest.activation === "immediate") {
          await CapacitorUpdater.set({ id: newBundle.id });
        }
      } catch {
        // Silent — update is best-effort, never crash the app
      } finally {
        checking = false;
      }
    }

    const checkSoon = () => {
      void check(true);
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void check(true);
      }
    };

    void check(true);

    const intervalId = window.setInterval(() => {
      void check(false);
    }, CHECK_INTERVAL_MS);

    void import("@capacitor/app")
      .then(({ App }) => App.addListener("resume", checkSoon))
      .then((handle) => {
        resumeHandle = handle;
      })
      .catch(() => {});

    window.addEventListener("focus", checkSoon);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkSoon);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      void resumeHandle?.remove();
    };
  }, []);

  const applyNow = useCallback(async () => {
    if (!downloadedRef.current) return;
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      // set() switches active bundle and reloads the WebView immediately.
      await CapacitorUpdater.set({ id: downloadedRef.current.id });
    } catch {
      /* If set() fails the bundle is still queued via next() — silent. */
    }
  }, []);

  const dismiss = useCallback(() => {
    if (mandatory) return;
    setDismissed(true);
  }, [mandatory]);

  return { pending, pendingVersion, message, mandatory, applyNow, dismiss, dismissed };
}
