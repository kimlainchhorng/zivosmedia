import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const since = url.searchParams.get("since"); // ISO date
    const until = url.searchParams.get("until");

    let q = admin
      .from("admin_actions")
      .select("id, admin_id, action_type, entity_type, entity_id, payload_json, created_at")
      .in("action_type", ["approve_message", "block_message"])
      .order("created_at", { ascending: false })
      .limit(10000);
    if (since) q = q.gte("created_at", since);
    if (until) q = q.lte("created_at", until);

    const { data: actions, error } = await q;
    if (error) throw error;

    // Fetch related messages in one go
    const messageIds = Array.from(new Set((actions || []).map((a: any) => a.entity_id).filter(Boolean)));
    const msgMap = new Map<string, any>();
    if (messageIds.length) {
      const { data: msgs } = await admin
        .from("trip_messages")
        .select("id, ride_request_id, sender_id, content, moderation_reason")
        .in("id", messageIds);
      for (const m of (msgs as any[]) || []) msgMap.set(m.id, m);
    }

    const headers = ["message_id", "ride_request_id", "sender_id", "decision", "admin_id", "decided_at", "reason", "message_excerpt"];
    const lines = [headers.join(",")];
    for (const a of (actions as any[]) || []) {
      const m = msgMap.get(a.entity_id) || {};
      const decision = a.action_type === "approve_message" ? "approve" : "block";
      const excerpt = (m.content || "").slice(0, 140);
      lines.push([
        a.entity_id,
        m.ride_request_id || "",
        m.sender_id || "",
        decision,
        a.admin_id,
        a.created_at,
        m.moderation_reason || "",
        excerpt,
      ].map(csvEscape).join(","));
    }

    const csv = lines.join("\n");
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="moderation-${date}.csv"`,
      },
    });
  } catch (e) {
    console.error("[export-moderation-actions-csv]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
