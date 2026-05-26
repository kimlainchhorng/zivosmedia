import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TripPreferences {
  budget?: 'budget' | 'mid' | 'luxury';
  activities?: string[];
  travelers?: number;
  origin?: string;
  likedDestinations?: string[];
  dislikedDestinations?: string[];
}

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

    const rl = await rateLimitDb(user.id, "api_general", { max: 20, windowSec: 60 });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "api_general") },
      });
    }

    const { preferences } = await req.json() as { preferences: TripPreferences };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a travel expert AI assistant for ZIVO, a premium travel booking platform. Your task is to suggest personalized travel destinations based on user preferences.

Return a JSON array of exactly 4 destination suggestions. Each destination must have:
- id: unique string identifier
- city: city name
- country: country name
- airportCode: 3-letter IATA code
- price: estimated round-trip flight price in USD
- rating: destination rating from 4.0 to 5.0
- tags: array of 3 relevant tags (e.g., "Beach", "Culture", "Adventure")
- weather: current typical weather (e.g., "24°C Sunny")
- bestFor: array of 2 traveler types this destination suits
- matchScore: match percentage based on preferences (75-98)
- flightTime: estimated flight duration from origin
- description: one sentence about why this destination is recommended

Consider the user's preferences for budget, activities, and previous likes/dislikes when making suggestions.`;

    const userPrompt = `Suggest 4 travel destinations based on these preferences:
- Budget: ${preferences.budget || 'mid'}
- Interests: ${preferences.activities?.join(', ') || 'general travel'}
- Number of travelers: ${preferences.travelers || 2}
- Departing from: ${preferences.origin || 'New York'}
${preferences.likedDestinations?.length ? `- Previously liked: ${preferences.likedDestinations.join(', ')}` : ''}
${preferences.dislikedDestinations?.length ? `- Previously disliked: ${preferences.dislikedDestinations.join(', ')}` : ''}

Return ONLY a valid JSON array with the destination objects. No additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let suggestions;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      suggestions = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify({ success: true, destinations: suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Trip Suggestions error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
