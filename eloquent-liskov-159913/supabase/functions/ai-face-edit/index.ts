import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Face edit is expensive (vision model) — stricter limit
    const rl = await rateLimitDb(user.id, "upload", { max: 10, windowSec: 60 });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "upload") },
      });
    }

    const { imageBase64, mode } = await req.json();

    if (!imageBase64 || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 or mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reject oversized payloads (~10 MB base64 ≈ 7.5 MB image)
    if (typeof imageBase64 !== "string" || imageBase64.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 7.5 MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";
    switch (mode) {
      case "beauty":
        prompt = "Enhance this selfie photo with professional beauty retouching: smooth and even out the skin naturally, brighten the eyes slightly, add a subtle healthy glow, and enhance facial features to look natural and polished. Keep the person recognizable. Do not change the background or add any text/watermark.";
        break;
      case "swap_male":
        prompt = "Transform this face into a handsome male model look with chiseled jawline, clear skin, thick eyebrows, and defined features while keeping the same pose and background. Make it look natural and photorealistic.";
        break;
      case "swap_female":
        prompt = "Transform this face into a beautiful female model look with smooth skin, defined cheekbones, long lashes, and elegant features while keeping the same pose and background. Make it look natural and photorealistic.";
        break;
      case "swap_anime":
        prompt = "Transform this photo into a high-quality anime/manga character style portrait. Convert the face and features into anime art style with large expressive eyes, smooth clean lines, and vibrant colors. Keep the same pose.";
        break;
      case "swap_old":
        prompt = "Age this person realistically to look 70-80 years old with natural wrinkles, grey/white hair, age spots, and sagging skin while keeping them recognizable. Make it photorealistic.";
        break;
      case "swap_young":
        prompt = "Make this person look 10-15 years younger with smoother skin, fewer wrinkles, more youthful features, and thicker hair while keeping them recognizable. Make it photorealistic.";
        break;
      case "bg_beach":
        prompt = "Keep the person exactly as they are but replace the background with a beautiful tropical beach scene with turquoise water, white sand, palm trees, and a sunset sky. Make the lighting match naturally.";
        break;
      case "bg_city":
        prompt = "Keep the person exactly as they are but replace the background with a stunning nighttime city skyline with glowing skyscrapers, city lights, and a deep blue sky. Make the lighting match naturally.";
        break;
      case "bg_space":
        prompt = "Keep the person exactly as they are but replace the background with an epic outer space scene with stars, nebulae, and a distant planet visible. Make the lighting match naturally with a cosmic glow.";
        break;
      case "bg_nature":
        prompt = "Keep the person exactly as they are but replace the background with a lush green forest with sunlight filtering through tall trees. Make the lighting match naturally.";
        break;
      case "bg_studio":
        prompt = "Keep the person exactly as they are but replace the background with a professional photography studio backdrop - clean gradient from dark grey to light grey with soft studio lighting.";
        break;
      default:
        prompt = "Enhance this photo professionally with better lighting, skin smoothing, and color correction. Keep it natural looking.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImage) {
      return new Response(
        JSON.stringify({ error: "No image returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl: resultImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-face-edit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
