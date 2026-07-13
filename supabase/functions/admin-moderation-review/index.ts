/**
 * admin-moderation-review
 * -----------------------
 * Applies admin moderation review actions server-side so content visibility,
 * queue status, and audit history are changed atomically behind admin checks.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";

const ACTIONS = new Set(["confirm_hidden", "dismiss", "unhide_false_positive"]);

type ReviewAction = "confirm_hidden" | "dismiss" | "unhide_false_positive";
type QueueStatus = "actioned" | "dismissed";

type Body = {
  report_id?: unknown;
  action?: unknown;
};

type Outcome = {
  queueStatus: QueueStatus;
  auditActionType: "content_hidden" | "report_dismissed" | "content_unhidden";
  successLabel: string;
};

serve(withSecurity("admin-moderation-review", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const mfaErr = enforceAal2(authHeader, corsHeaders);
  if (mfaErr) return mfaErr;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({})) as Body;
  const reportId = cleanUuid(body.report_id);
  const action = cleanAction(body.action);
  if (!reportId || !action) return json({ error: "Invalid moderation action" }, 400);

  const { data: report, error: reportError } = await admin
    .from("content_moderation_queue")
    .select("id,content_type,content_id,reason,status")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError) {
    console.error("[admin-moderation-review] queue lookup", reportError.message);
    return json({ error: "Moderation review failed" }, 500);
  }
  if (!report) return json({ error: "Report not found" }, 404);

  const outcome = getOutcome(action);
  const kind = normalizeKind(report.content_type);
  const content = await loadContent(admin, kind, report.content_id);
  if (content.error) return json({ error: "Moderation review failed" }, 500);

  const visibilityError = await applyTargetVisibility(admin, kind, report.content_id, action, user.id, content.row);
  if (visibilityError) return json({ error: "Moderation review failed" }, 500);

  const now = new Date().toISOString();
  const { error: queueError } = await admin
    .from("content_moderation_queue")
    .update({ status: outcome.queueStatus, assigned_to: user.id, updated_at: now })
    .eq("id", report.id);
  if (queueError) {
    console.error("[admin-moderation-review] queue update", queueError.message);
    return json({ error: "Moderation review failed" }, 500);
  }

  const { error: auditError } = await admin.from("moderation_actions").insert({
    queue_item_id: report.id,
    moderator_id: user.id,
    action_type: outcome.auditActionType,
    target_user_id: content.ownerId,
    target_content_id: report.content_id,
    target_content_type: kind,
    reason: report.reason,
    notes: `${contentLabel(kind)} review: ${outcome.auditActionType}`,
  });
  if (auditError) {
    console.error("[admin-moderation-review] audit insert", auditError.message);
    return json({ error: "Moderation review failed" }, 500);
  }

  return json({ ok: true, status: outcome.queueStatus, successLabel: outcome.successLabel });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function loadContent(admin: any, kind: string, contentId: string) {
  const table = tableForKind(kind);
  if (!table) return { row: null, ownerId: null, error: null };

  const select = kind === "direct_message"
    ? "id,sender_id,hidden_at,hidden_reason"
    : kind === "group_message"
      ? "id,sender_id,hidden_at,hidden_reason"
      : kind === "story_comment"
        ? "id,user_id,hidden_at,hidden_reason"
        : "id,user_id,hidden_at,hidden_reason";
  const { data, error } = await admin.from(table).select(select).eq("id", contentId).maybeSingle();
  if (error) {
    console.error("[admin-moderation-review] content lookup", table, error.message);
    return { row: null, ownerId: null, error };
  }
  const ownerId = typeof data?.user_id === "string" ? data.user_id : typeof data?.sender_id === "string" ? data.sender_id : null;
  return { row: data ?? null, ownerId, error: null };
}

async function applyTargetVisibility(admin: any, kind: string, contentId: string, action: ReviewAction, moderatorId: string, row: any) {
  if (action === "dismiss") return null;
  const table = tableForKind(kind);
  if (!table) return null;

  const hidePatch = {
    hidden_at: row?.hidden_at || new Date().toISOString(),
    hidden_by: moderatorId,
    hidden_reason: row?.hidden_reason || "moderator_action",
  };
  const unhidePatch = { hidden_at: null, hidden_by: null, hidden_reason: null };
  const basePatch = action === "unhide_false_positive" ? unhidePatch : hidePatch;
  const patch = kind === "user_post" || kind === "story"
    ? action === "unhide_false_positive"
      ? { ...basePatch, is_sensitive: false, sensitive_reason: null }
      : { ...basePatch, is_sensitive: true, sensitive_reason: "moderator_sensitive" }
    : basePatch;

  const { error } = await admin.from(table).update(patch).eq("id", contentId);
  if (error) console.error("[admin-moderation-review] visibility update", table, error.message);
  return error;
}

function getOutcome(action: ReviewAction): Outcome {
  if (action === "confirm_hidden") {
    return { queueStatus: "actioned", auditActionType: "content_hidden", successLabel: "Report actioned" };
  }
  if (action === "unhide_false_positive") {
    return { queueStatus: "dismissed", auditActionType: "content_unhidden", successLabel: "Content restored" };
  }
  return { queueStatus: "dismissed", auditActionType: "report_dismissed", successLabel: "Report dismissed" };
}

function normalizeKind(value: unknown): string {
  switch (typeof value === "string" ? value.trim() : "") {
    case "post":
    case "user_post":
      return "user_post";
    case "comment":
    case "post_comment":
      return "post_comment";
    case "chat_message":
    case "direct_message":
      return "direct_message";
    case "group_message":
      return "group_message";
    case "story":
      return "story";
    case "story_comment":
      return "story_comment";
    default:
      return "unknown";
  }
}

function tableForKind(kind: string): string | null {
  if (kind === "user_post") return "user_posts";
  if (kind === "post_comment") return "post_comments";
  if (kind === "direct_message") return "direct_messages";
  if (kind === "group_message") return "group_messages";
  if (kind === "story") return "stories";
  if (kind === "story_comment") return "story_comments";
  return null;
}

function contentLabel(kind: string): string {
  if (kind === "user_post") return "Post";
  if (kind === "post_comment") return "Comment";
  if (kind === "direct_message") return "Direct message";
  if (kind === "group_message") return "Group message";
  if (kind === "story") return "Story";
  if (kind === "story_comment") return "Story comment";
  return "Unknown";
}

function cleanAction(value: unknown): ReviewAction | null {
  if (typeof value !== "string" || !ACTIONS.has(value)) return null;
  return value as ReviewAction;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}
