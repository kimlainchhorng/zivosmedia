/**
 * post-bookmark-manage
 * --------------------
 * Authenticated saved-post gate for Feed/Reels/Profile. Social post save
 * ownership, post existence checks, and legacy bookmarks sync are trusted
 * here instead of in direct browser-owned table writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_LEGACY_ITEM_ID_CHARS = 160;
const MAX_COLLECTION_CHARS = 80;

type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;
type PostBookmarkSource = "store" | "user";
type BookmarkAction = "save_post" | "unsave_post";

type BookmarkRow = {
  id: string;
  post_id: string;
  source: PostBookmarkSource;
};

serve(withSecurity("post-bookmark-manage", async (req, ctx) => {
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
  const action = cleanAction((body as { action?: unknown }).action);
  if (!action) return json({ error: "Invalid action" }, 400);

  if (action === "save_post") {
    const postId = cleanUuid((body as { post_id?: unknown }).post_id);
    const source = cleanSource((body as { source?: unknown }).source);
    if (!postId) return json({ error: "Invalid post" }, 400);
    if (!source) return json({ error: "Invalid post source" }, 400);

    const post = await ensurePostExists(admin, postId, source);
    if (!post.ok) return json({ error: post.error }, post.status);

    const { data, error } = await admin
      .from("post_bookmarks")
      .upsert(
        { user_id: user.id, post_id: postId, source },
        { onConflict: "user_id,post_id,source" },
      )
      .select("id, post_id, source, created_at")
      .single();
    if (error) return fail("save_post", error, json);

    if (readBool(body, "sync_legacy")) {
      const legacy = await saveLegacyBookmark(admin, user.id, postId, source, body);
      if (!legacy.ok) return fail("legacy_save", legacy.error, json);
    }

    return json({ ok: true, bookmark: data });
  }

  const resolved = await resolveBookmarkTarget(admin, user.id, body);
  if (!resolved.ok) return json({ error: resolved.error }, resolved.status);

  const { error } = await admin
    .from("post_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", resolved.bookmark.post_id)
    .eq("source", resolved.bookmark.source);
  if (error) return fail("unsave_post", error, json);

  if (readBool(body, "sync_legacy")) {
    const legacy = await deleteLegacyBookmark(admin, user.id, resolved.bookmark, body);
    if (!legacy.ok) return fail("legacy_delete", legacy.error, json);
  }

  return json({ ok: true, bookmark: null });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function ensurePostExists(
  admin: SupabaseAdmin,
  postId: string,
  source: PostBookmarkSource,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const table = source === "user" ? "user_posts" : "store_posts";
  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error(`[post-bookmark-manage:${table}]`, error.message);
    return { ok: false, status: 500, error: "Could not verify post" };
  }

  return data ? { ok: true } : { ok: false, status: 404, error: "Post not found" };
}

async function resolveBookmarkTarget(
  admin: SupabaseAdmin,
  userId: string,
  body: unknown,
): Promise<{ ok: true; bookmark: BookmarkRow } | { ok: false; status: number; error: string }> {
  const bookmarkId = cleanUuid((body as { post_bookmark_id?: unknown }).post_bookmark_id);
  if (bookmarkId) {
    const { data, error } = await admin
      .from("post_bookmarks")
      .select("id, post_id, source")
      .eq("id", bookmarkId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[post-bookmark-manage:lookup]", error.message);
      return { ok: false, status: 500, error: "Could not verify bookmark" };
    }
    if (data?.post_id && cleanSource(data.source)) {
      return { ok: true, bookmark: data as BookmarkRow };
    }
    return { ok: false, status: 404, error: "Bookmark not found" };
  }

  const postId = cleanUuid((body as { post_id?: unknown }).post_id);
  const source = cleanSource((body as { source?: unknown }).source);
  if (!postId) return { ok: false, status: 400, error: "Invalid post" };
  if (!source) return { ok: false, status: 400, error: "Invalid post source" };
  return { ok: true, bookmark: { id: "", post_id: postId, source } };
}

async function saveLegacyBookmark(
  admin: SupabaseAdmin,
  userId: string,
  postId: string,
  source: PostBookmarkSource,
  body: unknown,
): Promise<{ ok: true } | { ok: false; error: { message?: string } }> {
  const itemId = cleanLegacyItemId((body as { legacy_item_id?: unknown }).legacy_item_id) ?? defaultLegacyItemId(postId, source);
  const collectionName = cleanText((body as { collection_name?: unknown }).collection_name, MAX_COLLECTION_CHARS) || "Reels";
  const { error } = await admin
    .from("bookmarks")
    .upsert(
      {
        user_id: userId,
        item_type: "post",
        item_id: itemId,
        collection_name: collectionName,
      },
      { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
    );
  return error ? { ok: false, error } : { ok: true };
}

async function deleteLegacyBookmark(
  admin: SupabaseAdmin,
  userId: string,
  bookmark: BookmarkRow,
  body: unknown,
): Promise<{ ok: true } | { ok: false; error: { message?: string } }> {
  const itemIds = legacyDeleteItemIds(bookmark.post_id, bookmark.source, body);
  for (const itemId of itemIds) {
    const { error } = await admin
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("item_type", "post")
      .eq("item_id", itemId);
    if (error) return { ok: false, error };
  }
  return { ok: true };
}

function legacyDeleteItemIds(postId: string, source: PostBookmarkSource, body: unknown): string[] {
  const ids = new Set<string>([postId, defaultLegacyItemId(postId, source)]);
  const explicit = cleanLegacyItemId((body as { legacy_item_id?: unknown }).legacy_item_id);
  if (explicit) ids.add(explicit);
  return [...ids];
}

function defaultLegacyItemId(postId: string, source: PostBookmarkSource): string {
  return source === "user" ? `u-${postId}` : postId;
}

function readBool(body: unknown, key: "sync_legacy"): boolean {
  return (body as Record<string, unknown> | null)?.[key] === true;
}

function cleanAction(value: unknown): BookmarkAction | null {
  if (value === "save_post" || value === "unsave_post") return value;
  return null;
}

function cleanSource(value: unknown): PostBookmarkSource | null {
  if (value === "store" || value === "user") return value;
  return null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanLegacyItemId(value: unknown): string | null {
  return cleanText(value, MAX_LEGACY_ITEM_ID_CHARS) || null;
}

function cleanText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxChars);
}

function fail(action: string, error: { message?: string }, json: JsonResponder) {
  console.error(`[post-bookmark-manage:${action}]`, error.message);
  return json({ error: "Could not update saved post" }, 500);
}
