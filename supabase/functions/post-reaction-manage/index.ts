/**
 * post-reaction-manage
 * --------------------
 * Authenticated post-reaction gate for Feed/Reels. The browser can choose a
 * supported emoji, but user ownership and post existence are trusted here
 * instead of in direct client-owned post_reactions writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const REACTION_EMOJIS = new Set([
  "\u2764\uFE0F",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDE21",
  "\uD83D\uDD25",
]);

type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;
type PostReactionSource = "store" | "user";
type ReactionAction = "set_reaction" | "clear_reaction";

serve(withSecurity("post-reaction-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json: JsonResponder = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !supabaseUrl || !serviceKey) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const postId = cleanUuid((body as { post_id?: unknown }).post_id);
  const source = cleanSource((body as { source?: unknown }).source);
  const action = cleanAction((body as { action?: unknown }).action);
  const emoji = cleanEmoji((body as { emoji?: unknown }).emoji);

  if (!postId) return json({ error: "Invalid post" }, 400);
  if (!source) return json({ error: "Invalid post source" }, 400);
  if (!action) return json({ error: "Invalid action" }, 400);
  if (action === "set_reaction" && !emoji) return json({ error: "Invalid reaction" }, 400);

  const post = await ensurePostExists(admin, postId, source);
  if (!post.ok) return json({ error: post.error }, post.status);

  if (action === "clear_reaction") {
    const { error } = await admin
      .from("post_reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .eq("source", source);
    if (error) return fail("delete", error, json);
    return json({ ok: true, reaction: null });
  }

  const { data, error } = await admin
    .from("post_reactions")
    .upsert(
      { user_id: user.id, post_id: postId, source, emoji },
      { onConflict: "user_id,post_id,source" },
    )
    .select("id, post_id, source, emoji, created_at")
    .single();
  if (error) return fail("upsert", error, json);

  return json({ ok: true, reaction: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function ensurePostExists(
  admin: SupabaseAdmin,
  postId: string,
  source: PostReactionSource,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const table = source === "user" ? "user_posts" : "store_posts";
  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error(`[post-reaction-manage:${table}]`, error.message);
    return { ok: false, status: 500, error: "Could not verify post" };
  }

  return data ? { ok: true } : { ok: false, status: 404, error: "Post not found" };
}

function cleanAction(value: unknown): ReactionAction | null {
  if (value === "set_reaction" || value === "clear_reaction") return value;
  return null;
}

function cleanSource(value: unknown): PostReactionSource | null {
  if (value === "store" || value === "user") return value;
  return null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const emoji = value.trim();
  return REACTION_EMOJIS.has(emoji) ? emoji : null;
}

function fail(action: string, error: { message?: string }, json: JsonResponder) {
  console.error(`[post-reaction-manage:${action}]`, error.message);
  return json({ error: "Could not update reaction" }, 500);
}
