import { useCallback, useEffect, useRef, useState } from "react";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/app-updates/latest.json`;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_CHECK_GAP_MS = 30 * 1000;
const MANIFEST_FETCH_TIMEOUT_MS = 10 * 1000;
const MAX_BUNDLE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_MANIFEST_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_MANIFEST_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_RELEASE_MESSAGE_LENGTH = 240;

type UpdateActivation = "prompt" | "next_launch" | "immediate";

interface UpdateManifest {
  version: string;
  url: string;
  checksum: string;
  bundleSizeBytes: number;
  createdAt: string;
  message?: string;
  mandatory: boolean;
  activation: UpdateActivation;
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

function isValidSemver(version: string | undefined) {
  return typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version);
}

function isValidOptionalSemver(version: string | undefined) {
  return version === undefined || isValidSemver(version);
}

function isValidOptionalMessage(message: string | undefined) {
  return message === undefined || (typeof message === "string" && message.trim() === message && message.length > 0 && message.length <= MAX_RELEASE_MESSAGE_LENGTH);
}

function isManifestRecord(value: unknown): value is UpdateManifest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidManifestTimestamp(createdAt: string | undefined) {
  const timestamp = Date.parse(createdAt);
  const now = Date.now();
  return Number.isFinite(timestamp)
    && timestamp <= now + MAX_MANIFEST_FUTURE_SKEW_MS
    && timestamp >= now - MAX_MANIFEST_AGE_MS;
}

function isAllowedBundleSize(bundleSizeBytes: number | undefined) {
  return Number.isFinite(bundleSizeBytes) && bundleSizeBytes > 0 && bundleSizeBytes <= MAX_BUNDLE_SIZE_BYTES;
}

function isValidSha256Checksum(checksum: string | undefined) {
  return typeof checksum === "string" && /^[a-f0-9]{64}$/i.test(checksum);
}

function isValidActivation(activation: UpdateManifest["activation"]) {
  return activation === "prompt" || activation === "next_launch" || activation === "immediate";
}

function isValidBoolean(value: boolean | undefined) {
  return typeof value === "boolean";
}

function isValidMandatoryActivation(mandatory: boolean | undefined, activation: UpdateManifest["activation"]) {
  return (!mandatory || activation === "next_launch" || activation === "immediate")
    && (activation !== "immediate" || mandatory === true);
}

function isAllowedBundleUrl(url: string | undefined, version: string | undefined) {
  if (!url || !version) return false;

  try {
    const bundleUrl = new URL(url);
    const supabaseUrl = new URL(SUPABASE_URL);
    const expectedPath = `/storage/v1/object/public/app-updates/zivo-v${version}.zip`;

    return bundleUrl.protocol === "https:"
      && bundleUrl.host === supabaseUrl.host
      && bundleUrl.search === ""
      && bundleUrl.hash === ""
      && decodeURIComponent(bundleUrl.pathname) === expectedPath;
  } catch {
    return false;
  }
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

        const fetchController = new AbortController();
        const fetchTimeout = window.setTimeout(() => fetchController.abort(), MANIFEST_FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(MANIFEST_URL, {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: fetchController.signal,
          });
        } finally {
          window.clearTimeout(fetchTimeout);
        }
        if (!res.ok || cancelled) return;
        if (!res.headers.get("content-type")?.toLowerCase().includes("application/json")) return;

        const manifestJson: unknown = await res.json();
        if (!isManifestRecord(manifestJson)) return;

        const manifest = manifestJson;
        if (!isValidSemver(manifest.version) || !isValidOptionalMessage(manifest.message) || !isValidManifestTimestamp(manifest.createdAt) || !isAllowedBundleUrl(manifest.url, manifest.version) || !isValidSha256Checksum(manifest.checksum) || !isValidActivation(manifest.activation) || !isValidBoolean(manifest.mandatory) || !isValidMandatoryActivation(manifest.mandatory, manifest.activation) || cancelled) return;

        const { bundle, native } = await CapacitorUpdater.current();
        // bundle.version is empty string for the built-in (store) bundle
        const runningVersion = bundle.version || import.meta.env.VITE_APP_VERSION;

        if (!shouldInstallUpdate(runningVersion, manifest.version) || cancelled) return;
        if (!isAllowedBundleSize(manifest.bundleSizeBytes)) return;
        if (!isValidOptionalSemver(manifest.minNativeVersion)) return;
        if (!satisfiesMinimumVersion(native, manifest.minNativeVersion)) return;
        if (queuedVersions.has(manifest.version) || downloadedRef.current?.version === manifest.version) return;

        const newBundle = await CapacitorUpdater.download({
          url: manifest.url,
          version: manifest.version,
          checksum: manifest.checksum,
        });

        if (cancelled) return;
        if (newBundle.version !== manifest.version) {
          await CapacitorUpdater.delete({ id: newBundle.id });
          return;
        }

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
