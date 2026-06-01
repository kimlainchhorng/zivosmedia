import { supabase } from "@/integrations/supabase/client";
import {
  getMetaBrowserIds,
  trackMetaPixelEvent,
} from "@/lib/metaAdsTracking";
import { isMarketingConsentGranted } from "@/lib/privacy/cookieConsent";

type MetaEventName = "Purchase" | "CompleteRegistration" | "InitiateCheckout";

interface MetaEventPayload {
  eventName: MetaEventName;
  eventId: string;
  externalId?: string | null;
  value?: number;
  currency?: string;
  sourceType?: string;
  sourceTable?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
}

export async function sendMetaConversionEvent(input: MetaEventPayload): Promise<void> {
  if (!isMarketingConsentGranted()) return;

  const { fbc, fbp } = getMetaBrowserIds();
  trackMetaPixelEvent(input.eventName, {
    value: input.value ?? 0,
    currency: input.currency ?? "USD",
    ...(input.payload ?? {}),
  }, { eventId: input.eventId });

  try {
    await supabase.functions.invoke("meta-conversion-handler", {
      body: {
        event_name: input.eventName,
        event_id: input.eventId,
        external_id: input.externalId,
        value: input.value ?? 0,
        currency: input.currency ?? "USD",
        source_type: input.sourceType,
        source_table: input.sourceTable,
        source_id: input.sourceId,
        payload: input.payload ?? {},
        fbc,
        fbp,
      },
    });
  } catch (error) {
    console.warn("[metaConversion] Failed to send event", error);
  }
}

export async function trackInitiateCheckout(input: {
  eventId: string;
  externalId?: string | null;
  value?: number;
  currency?: string;
  sourceType?: string;
  sourceTable?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await sendMetaConversionEvent({
    eventName: "InitiateCheckout",
    eventId: input.eventId,
    externalId: input.externalId,
    value: input.value,
    currency: input.currency,
    sourceType: input.sourceType,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    payload: input.payload,
  });
}

export async function trackPurchase(input: {
  eventId: string;
  externalId?: string | null;
  value: number;
  currency?: string;
  sourceType?: string;
  sourceTable?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await sendMetaConversionEvent({
    eventName: "Purchase",
    eventId: input.eventId,
    externalId: input.externalId,
    value: input.value,
    currency: input.currency,
    sourceType: input.sourceType,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    payload: input.payload,
  });
}
