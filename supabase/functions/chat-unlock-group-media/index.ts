// chat-unlock-group-media - Stars unlock flow for locked group media.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("chat-unlock-group-media", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const jwt = (req.headers.get("Authorization") || req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server is not configured" }, 500, corsHeaders);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const messageId = String(body.message_id || "").trim();
    if (!messageId) return json({ error: "Missing message_id" }, 400, corsHeaders);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin
      .schema("private")
      .rpc("unlock_group_locked_media", {
        p_actor_id: userData.user.id,
        p_message_id: messageId,
      });

    if (error) {
      const message = error.message || "Unlock failed";
      const status = message.includes("INSUFFICIENT_STARS") ? 402
        : message.includes("NOT_GROUP_MEMBER") ? 403
        : message.includes("MESSAGE_NOT_FOUND") ? 404
        : 400;
      return json({ error: message }, status, corsHeaders);
    }

    return json(data || { unlocked: true }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlock failed";
    return json({ error: message }, 500, corsHeaders);
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
