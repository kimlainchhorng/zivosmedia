import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authErr } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rl = await rateLimitDb(user.id, "api_general", { max: 30, windowSec: 60 });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "api_general") },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, targetLang = "en" } = await req.json();
    if (!text || typeof text !== "string" || text.length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid text (max 5000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validLangs = ["en", "km", "zh", "ja", "ko", "fr", "es", "th", "vi"];
    const lang = validLangs.includes(targetLang) ? targetLang : "en";

    const langNames: Record<string, string> = {
      en: "English", km: "Khmer", zh: "Chinese (Simplified)", ja: "Japanese",
      ko: "Korean", fr: "French", es: "Spanish", th: "Thai", vi: "Vietnamese",
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following text to ${langNames[lang]}. Return ONLY the translated text, no explanations or formatting.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ translated, targetLang: lang }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[translate-caption]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
