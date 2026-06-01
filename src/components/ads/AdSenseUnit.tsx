/**
 * AdSenseUnit — drop-in Google AdSense display ad slot.
 *
 * Earns ad revenue on your pages. Safe by design:
 *  - Renders nothing unless a publisher id is configured
 *    (<meta name="zivo-adsense-client" content="ca-pub-...">).
 *  - Renders nothing without marketing-cookie consent (privacy law).
 *  - Renders nothing inside the native app (Capacitor) or on localhost.
 *
 * Usage:
 *   <AdSenseUnit slot="1234567890" />                       // responsive auto ad
 *   <AdSenseUnit slot="1234567890" format="rectangle" />    // fixed shape
 *
 * Get a `slot` id from AdSense → Ads → By ad unit → create a "Display" unit.
 */
import { useEffect, useRef, useState } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  isMarketingConsentGranted,
} from "@/lib/privacy/cookieConsent";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

/** Returns the configured AdSense publisher id, or null if ads are off. */
export function getAdSenseClient(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="zivo-adsense-client"]');
  const value = meta?.getAttribute("content")?.trim() ?? "";
  return value.startsWith("ca-pub-") ? value : null;
}

function isNativeApp(): boolean {
  return Boolean(
    typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.(),
  );
}

interface AdSenseUnitProps {
  /** Ad unit id from your AdSense account. */
  slot: string;
  /** AdSense ad format. Default "auto" (responsive). */
  format?: string;
  /** Allow the ad to expand full width on mobile. Default true. */
  responsive?: boolean;
  /** Wrapper className. */
  className?: string;
  /** Inline style applied to the <ins> element. */
  style?: React.CSSProperties;
  /** Show a small "Advertisement" label above the ad. Default true. */
  label?: boolean;
}

export default function AdSenseUnit({
  slot,
  format = "auto",
  responsive = true,
  className,
  style,
  label = true,
}: AdSenseUnitProps) {
  const pushedRef = useRef(false);
  const client = getAdSenseClient();
  const [consent, setConsent] = useState<boolean>(() =>
    isMarketingConsentGranted(),
  );

  // Re-check consent when the user accepts/changes cookie preferences.
  useEffect(() => {
    const update = () => setConsent(isMarketingConsentGranted());
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, update);
    return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, update);
  }, []);

  const enabled = Boolean(client) && Boolean(slot) && consent && !isNativeApp();

  // Ask AdSense to fill the slot once it is mounted in the DOM.
  useEffect(() => {
    if (!enabled || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      /* AdSense not ready yet — it will retry on the next mount. */
    }
  }, [enabled, slot]);

  if (!enabled) return null;

  return (
    <div className={className} aria-label="Advertisement">
      {label ? (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground text-center mb-1">
          Advertisement
        </div>
      ) : null}
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={client ?? undefined}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
