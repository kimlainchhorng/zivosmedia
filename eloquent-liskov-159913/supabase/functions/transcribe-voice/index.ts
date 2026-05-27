import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { voice_note_id } = await req.json();
    if (!voice_note_id) {
      return new Response(JSON.stringify({ error: "voice_note_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: vn, error: vnErr } = await supabase
      .from("voice_notes")
      .select("id, audio_url, transcript")
      .eq("id", voice_note_id)
      .maybeSingle();

    if (vnErr || !vn) {
      return new Response(JSON.stringify({ error: "voice note not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (vn.transcript) {
      return new Response(JSON.stringify({ transcript: vn.transcript, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign and download audio
    const { data: signed } = await supabase.storage
      .from("voice-notes")
      .createSignedUrl(vn.audio_url, 600);
    if (!signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "could not sign audio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioRes = await fetch(signed.signedUrl);
    const audioBuf = new Uint8Array(await audioRes.arrayBuffer());
    let bin = "";
    for (let i = 0; i < audioBuf.length; i++) bin += String.fromCharCode(audioBuf[i]);
    const audioB64 = btoa(bin);
    const mime = audioRes.headers.get("content-type") || "audio/webm";

    // Call Lovable AI Gateway with audio input
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Transcribe the user's voice note verbatim. Return only the transcript text — no preamble.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio." },
              { type: "input_audio", input_audio: { data: audioB64, format: mime.includes("mp3") ? "mp3" : "webm" } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, try later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway failure" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const transcript = (aiJson?.choices?.[0]?.message?.content ?? "").toString().trim();

    if (transcript) {
      await supabase
        .from("voice_notes")
        .update({ transcript, transcript_lang: "auto" })
        .eq("id", voice_note_id);
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-voice error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
