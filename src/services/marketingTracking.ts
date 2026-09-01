import { isMarketingConsentGranted } from "@/lib/privacy/cookieConsent";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

type MarketingEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "InitiateCheckout"
  | "Purchase"
  | "SignUp"
  | "Share";

interface MarketingEventPayload {
  eventId?: string;
  value?: number;
  currency?: string;
  contentType?: string;
  contentId?: string;
  contentName?: string;
  source?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __zivoLoadAnalytics?: () => void;
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      page?: () => void;
      track?: (event: string, payload?: Record<string, unknown>) => void;
    };
    twq?: (...args: unknown[]) => void;
  }
}

const GOOGLE_EVENT_MAP: Record<MarketingEventName, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  Lead: "generate_lead",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  SignUp: "sign_up",
  Share: "share",
};

const TIKTOK_EVENT_MAP: Record<MarketingEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Lead: "SubmitForm",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
  SignUp: "CompleteRegistration",
  Share: "ClickButton",
};

const X_EVENT_MAP: Record<MarketingEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Lead: "Lead",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "Purchase",
  SignUp: "SignUp",
  Share: "Share",
};

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return false;
  return isMarketingConsentGranted();
}

function basePayload(payload: MarketingEventPayload = {}) {
  return {
    event_id: payload.eventId,
    value: payload.value,
    currency: payload.currency ?? "USD",
    content_type: payload.contentType,
    content_id: payload.contentId,
    content_name: payload.contentName,
    source: payload.source,
  };
}

function cookieValue(name: string): string | null {
  try {
    const match = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

function clickIds(): Record<string, string> {
  try {
    const params = new URLSearchParams(window.location.search);
    const ids = [
      "gclid",
      "gbraid",
      "wbraid",
      "fbclid",
      "ttclid",
      "twclid",
    ].reduce<Record<string, string>>((acc, key) => {
      const value = params.get(key);
      if (value) acc[key] = value;
      return acc;
    }, {});
    const storedGclid = window.localStorage.getItem("zivo_gclid");
    if (!ids.gclid && storedGclid) ids.gclid = storedGclid;
    return ids;
  } catch {
    return {};
  }
}

function mirrorServerMarketingEvent(
  eventName: MarketingEventName,
  payload: MarketingEventPayload,
): void {
  if (import.meta.env.DEV) return;
  try {
    void supabase.functions.invoke("marketing-event-track", {
      body: {
        event_name: eventName,
        event_id: payload.eventId,
        page:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        value: payload.value,
        currency: payload.currency ?? "USD",
        content_type: payload.contentType,
        content_id: payload.contentId,
        content_name: payload.contentName,
        source: payload.source,
        order_id:
          typeof payload.orderId === "string" ? payload.orderId : undefined,
        external_id:
          typeof payload.externalId === "string"
            ? payload.externalId
            : undefined,
        click_ids: clickIds(),
        fbc: cookieValue("_fbc"),
        fbp: cookieValue("_fbp"),
        meta: payload,
      },
    });
  } catch (error) {
    console.warn("[marketingTracking] Failed to mirror server event", error);
  }
}

export function trackMarketingEvent(
  eventName: MarketingEventName,
  payload: MarketingEventPayload = {},
): void {
  if (!enabled()) return;

  window.__zivoLoadAnalytics?.();
  const shared = basePayload(payload);
  mirrorServerMarketingEvent(eventName, payload);

  try {
    if (eventName === "PageView") {
      window.fbq?.("track", "PageView");
      window.ttq?.page?.();
      window.twq?.("track", "PageView");
      window.gtag?.("event", "page_view", {
        page_path:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      return;
    }

    window.fbq?.(
      "track",
      eventName,
      shared,
      payload.eventId ? { eventID: payload.eventId } : undefined,
    );
    window.ttq?.track?.(TIKTOK_EVENT_MAP[eventName], shared);
    window.twq?.("track", X_EVENT_MAP[eventName], shared);
    window.gtag?.("event", GOOGLE_EVENT_MAP[eventName], {
      value: payload.value,
      currency: payload.currency ?? "USD",
      item_id: payload.contentId,
      item_name: payload.contentName,
      content_type: payload.contentType,
      event_id: payload.eventId,
    });
  } catch (error) {
    console.warn("[marketingTracking] Failed to send marketing event", error);
  }
}

export function trackMarketingPageView(): void {
  trackMarketingEvent("PageView");
}
