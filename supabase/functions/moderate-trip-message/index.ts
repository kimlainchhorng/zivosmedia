import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SYSTEM_PROMPT = `You are a content moderator for in-trip messages between a rider and driver in a ride-share app.
Classify each message as exactly one of:
- "clean": safe, normal coordination ("I'm at gate B", "5 min away")
- "needs_review": potentially risky — sharing personal contact info, off-platform payment requests, mild profanity, suspicious links
- "blocked": clear harassment, threats, sexual content, scam attempts, hate speech, illegal coordination
Respond ONLY with JSON: {"label":"clean|needs_review|blocked","reason":"<short reason>"}`;

Deno.serve(withSecurity("moderate-trip-message", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { message_id } = await req.json();
    if (!message_id) return new Response(JSON.stringify({ error: "message_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: msg, error } = await admin.from("trip_messages").select("id, content, body, ride_request_id, sender_id").eq("id", message_id).maybeSingle();
    if (error || !msg) return new Response(JSON.stringify({ error: "message not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((msg as any).sender_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = (msg.content || msg.body || "").toString().slice(0, 1000);

    let label: "clean" | "needs_review" | "blocked" = "clean";
    let reason = "";

    // Quick heuristic pre-filter
    const lower = text.toLowerCase();
    if (/\b(kill you|fuck you|bitch|whore|rape)\b/.test(lower)) {
      label = "blocked";
      reason = "explicit_harassment";
    } else if (aiKey) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const raw = j.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(raw);
          if (["clean", "needs_review", "blocked"].includes(parsed.label)) label = parsed.label;
          reason = parsed.reason ?? "";
        } else if (r.status === 429 || r.status === 402) {
          console.warn("[moderate-trip-message] AI gateway throttled", r.status);
        }
      } catch (e) {
        console.warn("[moderate-trip-message] AI failed, defaulting clean", e);
      }
    }

    const moderation_status = label === "needs_review" ? "pending_review" : label;
    await admin.from("trip_messages").update({ moderation_status, moderation_reason: reason || null } as any).eq("id", message_id);

    return new Response(JSON.stringify({ ok: true, label, moderation_status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[moderate-trip-message]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { rateLimit: "api_general", strictCors: true, trackNetwork: "suspicious" }));
