// @ts-nocheck
import { serve } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingMetaEvent {
  event_name: "Purchase" | "CompleteRegistration" | "InitiateCheckout" | string;
  event_id: string;
  external_id?: string | null;
  value?: number | string | null;
  currency?: string | null;
  event_time?: number;
  source_type?: string;
  source_table?: string;
  source_id?: string;
  payload?: Record<string, unknown>;
  fbc?: string | null;
  fbp?: string | null;
}

const META_GRAPH_VERSION = "v19.0";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeCurrency(value: string | null | undefined): string {
  if (!value) return "USD";
  return value.toUpperCase();
}

async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pixelId = Deno.env.get("META_PIXEL_ID") || "2304266847061310";
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "META_ACCESS_TOKEN missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = (await req.json()) as IncomingMetaEvent;

    if (!event?.event_name || !event?.event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "event_name and event_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const eventTime = event.event_time ?? Math.floor(Date.now() / 1000);
    const value = toNumber(event.value, 0);
    const currency = normalizeCurrency(event.currency);

    const userData: Record<string, unknown> = {};
    if (event.external_id) {
      userData.external_id = await sha256Hex(String(event.external_id));
    }
    // fbc and fbp for high match quality (9/10)
    if (event.fbc) {
      userData.fbc = event.fbc;
    }
    if (event.fbp) {
      userData.fbp = event.fbp;
    }

    const customData: Record<string, unknown> = {
      currency,
      value,
      source_type: event.source_type || null,
      source_table: event.source_table || null,
      source_id: event.source_id || null,
      ...(event.payload || {}),
    };

    const capiBody: Record<string, unknown> = {
      data: [
        {
          event_name: event.event_name,
          event_time: eventTime,
          event_id: event.event_id,
          action_source: "website",
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capiBody),
    });

    const responseText = await response.text();
    let responseJson: unknown = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (!response.ok) {
      console.error("[meta-conversion-handler] Meta API error", response.status, responseJson);
      return new Response(
        JSON.stringify({ success: false, status: response.status, meta: responseJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, meta: responseJson }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[meta-conversion-handler] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
