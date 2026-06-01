/**
 * group-message-send
 * ------------------
 * Authenticated group-message send gate. The browser can prepare media and
 * rich payload metadata, but group membership and sender ownership are trusted
 * here instead of in client-owned table writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_BATCH = 50;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_LABEL_CHARS = 240;
const MAX_JSON_BYTES = 32 * 1024;
const MAX_LOCKED_PRICE_COINS = 1_000_000;

const MESSAGE_TYPES = new Set([
  "text",
  "system",
  "image",
  "video",
  "voice",
  "voice_note",
  "audio",
  "music",
  "file",
  "document",
  "location",
  "sticker",
  "gif",
  "media_album",
  "locked_text",
  "locked_image",
  "locked_video",
  "locked_album",
  "poll",
  "contact",
  "social",
  "story_reply",
  "zivo_card",
  "gift",
  "coin_transfer",
  "p2p_transfer",
]);

type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;
type RawMessage = Record<string, unknown>;

type GroupMessageInsert = {
  sender_id: string;
  group_id: string;
  message: string;
  message_type: string;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: unknown;
  reply_to_id?: string | null;
  reply_to_message_id?: string | null;
  reply_to_snapshot?: unknown;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  expires_at?: string | null;
  locked_price_coins?: number | null;
};

serve(withSecurity("group-message-send", async (req, ctx) => {
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
  const messages = normalizeMessages(body);
  if (!messages.length || messages.length > MAX_BATCH) {
    return json({ error: "Invalid message batch" }, 400);
  }

  const inserted: unknown[] = [];
  const membershipCache = new Map<string, boolean>();
  const senderId = user.id;
  for (const raw of messages) {
    const parsed = sanitizeMessage(raw, senderId);
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    const membership = await ensureGroupMember(admin, parsed.message.group_id, senderId, membershipCache);
    if (!membership.ok) return json({ error: membership.error }, membership.status);

    const result = await insertGroupMessage(admin, parsed.message);
    if (!result.ok) return fail("insert", result.error, json);
    inserted.push(result.message);
  }

  return json({
    ok: true,
    message: inserted[0] ?? null,
    messages: inserted,
  });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function normalizeMessages(body: unknown): RawMessage[] {
  if (!body || typeof body !== "object") return [];
  const candidate = body as { messages?: unknown; message?: unknown };
  if (Array.isArray(candidate.messages)) {
    return candidate.messages.filter((item): item is RawMessage => Boolean(item) && typeof item === "object") as RawMessage[];
  }
  if (candidate.message && typeof candidate.message === "object" && !Array.isArray(candidate.message)) {
    return [candidate.message as RawMessage];
  }
  return [body as RawMessage];
}

function sanitizeMessage(raw: RawMessage, senderId: string):
  | { ok: true; message: GroupMessageInsert }
  | { ok: false; error: string } {
  const groupId = cleanUuid(raw.group_id);
  if (!groupId) return { ok: false, error: "Invalid group" };

  const messageType = cleanMessageType(raw.message_type);
  if (!messageType) return { ok: false, error: "Invalid message type" };

  const message = cleanText(raw.message, MAX_MESSAGE_CHARS);
  const imageUrl = cleanNullableText(raw.image_url, 2_048);
  const videoUrl = cleanNullableText(raw.video_url, 2_048);
  const voiceUrl = cleanNullableText(raw.voice_url, 2_048);
  const filePayload = cleanJsonPayload(raw.file_payload);
  const replyToSnapshot = cleanJsonPayload(raw.reply_to_snapshot);
  if (raw.file_payload != null && filePayload === undefined) return { ok: false, error: "Invalid file payload" };
  if (raw.reply_to_snapshot != null && replyToSnapshot === undefined) return { ok: false, error: "Invalid reply snapshot" };

  const replyToId = cleanUuid(raw.reply_to_id);
  const replyToMessageId = cleanUuid(raw.reply_to_message_id);
  const locationLat = cleanCoordinate(raw.location_lat, -90, 90);
  const locationLng = cleanCoordinate(raw.location_lng, -180, 180);
  const expiresAt = cleanFutureIso(raw.expires_at);
  const lockedPriceCoins = cleanPositiveInt(raw.locked_price_coins, MAX_LOCKED_PRICE_COINS);

  const hasContent = Boolean(
    message ||
      imageUrl ||
      videoUrl ||
      voiceUrl ||
      filePayload ||
      locationLat != null,
  );
  if (!hasContent) return { ok: false, error: "Message content required" };

  if (messageType.startsWith("locked_") && !lockedPriceCoins) {
    return { ok: false, error: "Locked messages require a price" };
  }

  const insert: GroupMessageInsert = {
    sender_id: senderId,
    group_id: groupId,
    message,
    message_type: messageType,
  };

  if (imageUrl !== undefined) insert.image_url = imageUrl;
  if (videoUrl !== undefined) insert.video_url = videoUrl;
  if (voiceUrl !== undefined) insert.voice_url = voiceUrl;
  if (filePayload !== undefined) insert.file_payload = filePayload;
  if (replyToId) insert.reply_to_id = replyToId;
  if (replyToMessageId) insert.reply_to_message_id = replyToMessageId;
  if (replyToSnapshot !== undefined) insert.reply_to_snapshot = replyToSnapshot;
  if (locationLat != null) insert.location_lat = locationLat;
  if (locationLng != null) insert.location_lng = locationLng;
  if (typeof raw.location_label === "string") insert.location_label = raw.location_label.trim().slice(0, MAX_LABEL_CHARS);
  if (expiresAt) insert.expires_at = expiresAt;
  if (lockedPriceCoins) insert.locked_price_coins = lockedPriceCoins;

  return { ok: true, message: insert };
}

async function ensureGroupMember(
  admin: SupabaseAdmin,
  groupId: string,
  senderId: string,
  cache: Map<string, boolean>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const cacheKey = `${senderId}:${groupId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ? { ok: true } : { ok: false, status: 403, error: "Not a group member" };
  }

  const { data, error } = await admin
    .from("chat_group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", senderId)
    .maybeSingle();

  if (error) {
    console.error("[group-message-send:membership]", error.message);
    return { ok: false, status: 500, error: "Could not verify group membership" };
  }

  const isMember = Boolean(data);
  cache.set(cacheKey, isMember);
  return isMember ? { ok: true } : { ok: false, status: 403, error: "Not a group member" };
}

async function insertGroupMessage(
  admin: SupabaseAdmin,
  payload: GroupMessageInsert,
): Promise<{ ok: true; message: unknown } | { ok: false; error: { message?: string } }> {
  const { data: message, error } = await admin
    .from("group_messages")
    .insert(payload)
    .select("id, created_at, group_id")
    .single();
  if (error) return { ok: false, error };
  return { ok: true, message };
}

function cleanMessageType(value: unknown): string | null {
  const messageType = typeof value === "string" ? value.trim() : "text";
  return MESSAGE_TYPES.has(messageType) ? messageType : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanText(value: unknown, maxChars: number): string {
  if (value == null) return "";
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxChars);
}

function cleanNullableText(value: unknown, maxChars: number): string | null | undefined {
  if (value == null) return value === null ? null : undefined;
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxChars) || null;
}

function cleanJsonPayload(value: unknown): unknown {
  if (value == null) return value === null ? null : undefined;
  if (typeof value !== "object") return undefined;
  try {
    if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_JSON_BYTES) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function cleanCoordinate(value: unknown, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max ? numeric : null;
}

function cleanPositiveInt(value: unknown, max: number): number | null {
  if (value == null || value === "") return null;
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 && numeric <= max ? numeric : null;
}

function cleanFutureIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
  return new Date(timestamp).toISOString();
}

function fail(action: string, error: { message?: string }, json: JsonResponder) {
  console.error(`[group-message-send:${action}]`, error.message);
  return json({ error: "Could not send message" }, 500);
}
