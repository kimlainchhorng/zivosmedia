import { supabase } from "@/integrations/supabase/client";

type MetaEventName = "Purchase" | "CompleteRegistration" | "InitiateCheckout";

/** Read Meta browser cookies for high match quality */
function getMetaCookies(): { fbc: string | null; fbp: string | null } {
  try {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      if (k) acc[k] = v || "";
      return acc;
    }, {} as Record<string, string>);
    return {
      fbc: cookies["_fbc"] || null,
      fbp: cookies["_fbp"] || null,
    };
  } catch {
    return { fbc: null, fbp: null };
  }
}

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
  const { fbc, fbp } = getMetaCookies();
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
