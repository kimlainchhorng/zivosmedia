/**
 * social-safety-report
 * --------------------
 * Normalizes social content reports server-side and optionally records the
 * reporter's safety action after authenticated identity is verified.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const REPORT_TYPES = new Set([
  "post",
  "comment",
  "content",
  "group_message",
  "chat_message",
  "story",
  "story_comment",
  "safety_action",
]);
const POST_SOURCES = new Set(["user", "store"]);
const CONTENT_TYPES = new Set(["ppv_post", "paid_dm", "creator"]);
const SAFETY_ACTIONS = new Set(["mute", "block"]);
const MAX_REASON = 160;
const MAX_DESCRIPTION = 1_000;

type Body = Record<string, unknown>;

serve(withSecurity("social-safety-report", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const type = cleanEnum(body.type, REPORT_TYPES);
  if (!type) return json({ error: "Invalid report type" }, 400);

  const result = await handleRequest(admin, user.id, type, body);
  return json(result.body, result.status);
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function handleRequest(admin: any, userId: string, type: string, body: Body) {
  if (type === "safety_action") {
    const targetUserId = cleanUuid(body.target_user_id);
    const action = cleanEnum(body.action, SAFETY_ACTIONS);
    if (!targetUserId || !action || targetUserId === userId) return bad("Invalid safety action");
    return writeSafetyAction(admin, userId, targetUserId, action);
  }

  const reason = cleanText(body.reason, MAX_REASON);
  if (!reason || reason.length < 2) return bad("Invalid report reason");

  if (type === "post") {
    const postId = cleanText(body.post_id, 120);
    const postSource = cleanEnum(body.post_source, POST_SOURCES);
    if (!postId || !postSource) return bad("Invalid post report");
    const result = await insert(admin, "post_reports", {
      reporter_id: userId,
      post_id: postId,
      post_source: postSource,
      reason,
    });
    await maybeBlock(admin, userId, cleanUuid(body.target_user_id), body.auto_block === true);
    return result;
  }

  if (type === "comment") {
    const commentId = cleanUuid(body.comment_id);
    const postId = cleanText(body.post_id, 120);
    const postSource = cleanEnum(body.post_source, POST_SOURCES);
    if (!commentId || !postId || !postSource) return bad("Invalid comment report");
    const result = await insert(admin, "comment_reports", {
      reporter_id: userId,
      comment_id: commentId,
      post_id: postId,
      post_source: postSource,
      reason,
      description: cleanText(body.description, 500),
    });
    await maybeBlock(admin, userId, cleanUuid(body.target_user_id), body.auto_block === true);
    return result;
  }

  if (type === "content") {
    const contentType = cleanEnum(body.content_type, CONTENT_TYPES);
    const contentId = cleanText(body.content_id, 160);
    if (!contentType || !contentId) return bad("Invalid content report");
    return insert(admin, "content_reports", {
      reporter_id: userId,
      reported_user_id: cleanUuid(body.reported_user_id),
      content_type: contentType,
      content_id: contentId,
      reason,
      description: cleanText(body.description, MAX_DESCRIPTION),
    });
  }

  if (type === "chat_message") {
    const messageId = cleanUuid(body.message_id);
    const senderId = cleanUuid(body.sender_id);
    const receiverId = cleanUuid(body.receiver_id);
    if (!messageId || !senderId || !receiverId || senderId === userId) return bad("Invalid chat message report");
    const result = await insert(admin, "chat_message_reports", {
      reporter_id: userId,
      message_id: messageId,
      sender_id: senderId,
      receiver_id: receiverId,
      reason,
      description: cleanText(body.description, 500),
    });
    await maybeBlock(admin, userId, senderId, true);
    return result;
  }

  if (type === "story") {
    const storyId = cleanUuid(body.story_id);
    const ownerId = cleanUuid(body.owner_id);
    if (!storyId || !ownerId || ownerId === userId) return bad("Invalid story report");
    const result = await insert(admin, "story_reports", {
      reporter_id: userId,
      story_id: storyId,
      owner_id: ownerId,
      reason,
      description: cleanText(body.description, 500),
    });
    await maybeBlock(admin, userId, ownerId, true);
    return result;
  }

  if (type === "story_comment") {
    const commentId = cleanUuid(body.comment_id);
    const storyId = cleanUuid(body.story_id);
    const commentAuthorId = cleanUuid(body.comment_author_id);
    if (!commentId || !storyId || !commentAuthorId || commentAuthorId === userId) return bad("Invalid story comment report");
    const result = await insert(admin, "story_comment_reports", {
      reporter_id: userId,
      comment_id: commentId,
      story_id: storyId,
      comment_author_id: commentAuthorId,
      reason,
      description: cleanText(body.description, 500),
    });
    await maybeBlock(admin, userId, commentAuthorId, true);
    return result;
  }

  const groupId = cleanUuid(body.group_id);
  const messageId = cleanUuid(body.message_id);
  const senderId = cleanUuid(body.sender_id);
  if (!groupId || !messageId || !senderId || senderId === userId) return bad("Invalid group message report");
  const result = await insert(admin, "group_message_reports", {
    reporter_id: userId,
    group_id: groupId,
    message_id: messageId,
    sender_id: senderId,
    reason,
    description: cleanText(body.description, 500),
  });
  await maybeBlock(admin, userId, senderId, true);
  return result;
}

async function insert(admin: any, table: string, row: Record<string, unknown>) {
  const { data, error } = await admin.from(table).insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { status: 200, body: { ok: true, alreadyReported: true } };
    console.error("[social-safety-report]", table, error.message);
    return { status: 500, body: { error: "Report submission failed" } };
  }
  return { status: 200, body: { ok: true, id: data?.id ?? null, alreadyReported: false } };
}

async function writeSafetyAction(admin: any, userId: string, targetUserId: string, action: string) {
  const { error } = await admin
    .from("user_safety_actions")
    .upsert({ user_id: userId, target_user_id: targetUserId, action }, {
      onConflict: "user_id,target_user_id,action",
      ignoreDuplicates: true,
    });
  if (error) {
    console.error("[social-safety-report] user_safety_actions", error.message);
    return { status: 500, body: { error: "Safety action failed" } };
  }
  return { status: 200, body: { ok: true } };
}

async function maybeBlock(admin: any, userId: string, targetUserId: string | null, shouldBlock: boolean) {
  if (!shouldBlock || !targetUserId || targetUserId === userId) return;
  await writeSafetyAction(admin, userId, targetUserId, "block");
}

function bad(error: string) {
  return { status: 400, body: { error } };
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  const text = cleanText(value, MAX_REASON);
  return text && allowed.has(text) ? text : null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 80);
  if (!text) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}
