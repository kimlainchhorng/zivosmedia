import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

const ALLOWED_ROLES = ["admin", "super_admin", "support"];

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(withSecurity("admin-post-comment", async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401, corsHeaders);
    }

    // Step-up MFA — admin posting (impersonates the platform) requires AAL2
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
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!postId || !userId || !content) {
      return jsonResponse({ error: "postId, userId, and content are required" }, 400, corsHeaders);
    }

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(adminClient, ipHash)) {
      return jsonResponse({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }, 429, corsHeaders);
    }
    if (await isAbuseThresholdExceeded(adminClient, userId)) {
      return jsonResponse({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions for this user." }, 429, corsHeaders);
    }

    const linkScan = scanContentForLinks(content);
    if (!linkScan.ok) {
      logBlockedAttempt(adminClient, { endpoint: "admin-post-comment", userId, urls: linkScan.blocked, text: content, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
      return jsonResponse({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }, 422, corsHeaders);
    }

    const { data: comment, error: insertError } = await adminClient
      .from("post_comments")
      .insert({ post_id: postId, user_id: userId, content })
      .select("id, user_id, content, created_at")
      .single();

    if (insertError) {
      console.error("[admin-post-comment] insert error:", insertError);
      return jsonResponse({ error: insertError.message }, 400, corsHeaders);
    }

    return jsonResponse({ success: true, comment }, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin-post-comment] unexpected error:", message);
    return jsonResponse({ error: message }, 500, getCorsHeaders(req));
  }
}, { rateLimit: "admin_action" }));
