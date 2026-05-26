import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";

const ALLOWED_ROLES = ["admin", "super_admin", "support"];

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(withSecurity("admin-delete-user-post", async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401, corsHeaders);
    }

    // Step-up MFA — destructive admin action requires an AAL2 session
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ALLOWED_ROLES);

    if ((roleRows ?? []).length === 0) {
      return jsonResponse({ error: "Admin access required" }, 403, corsHeaders);
    }

    const body = await req.json();
    const postId = typeof body?.postId === "string" ? body.postId.trim() : "";

    if (!postId) {
      return jsonResponse({ error: "postId is required" }, 400, corsHeaders);
    }

    // Delete associated media rows first
    await adminClient.from("post_media").delete().eq("post_id", postId);

    // Delete associated comments
    await adminClient.from("post_comments").delete().eq("post_id", postId);

    // Delete the post itself
    const { error: deleteError } = await adminClient.from("user_posts").delete().eq("id", postId);

    if (deleteError) {
      console.error("[admin-delete-user-post] delete error:", deleteError);
      return jsonResponse({ error: deleteError.message }, 400, corsHeaders);
    }

    console.log("[admin-delete-user-post] Deleted post", postId, "by admin", caller.id);

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin-delete-user-post] unexpected error:", message);
    return jsonResponse({ error: message }, 500, getCorsHeaders(req));
  }
}, { rateLimit: "admin_action" }));
