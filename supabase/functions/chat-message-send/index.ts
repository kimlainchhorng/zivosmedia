/**
 * chat-message-send
 * -----------------
 * Authenticated direct-message send gate. Clients may prepare media and rich
 * payload metadata, but sender ownership, locked-text payload writes, and DM
 * inserts are trusted here instead of in browser-owned table writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_BATCH = 50;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_LOCKED_TEXT_CHARS = 8_000;
const MAX_LABEL_CHARS = 240;
const MAX_JSON_BYTES = 32 * 1024;
const MAX_SELF_DESTRUCT_SECONDS = 60 * 60 * 24 * 30;
const MAX_LOCKED_PRICE_CENTS = 1_000_000;

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

type DirectMessageInsert = {
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: unknown;
  gift_payload?: unknown;
  reply_to_id?: string | null;
  forwarded_from_user_id?: string | null;
  forwarded_from_message_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  expires_at?: string | null;
  self_destruct_seconds?: number | null;
  locked_price_cents?: number | null;
};

serve(withSecurity("chat-message-send", async (req, ctx) => {
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
  for (const raw of messages) {
    const parsed = sanitizeMessage(raw, user.id);
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    const result = await insertDirectMessage(admin, parsed.message, parsed.lockedPayloadContent);
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
  | { ok: true; message: DirectMessageInsert; lockedPayloadContent: string | null }
  | { ok: false; error: string } {
  const receiverId = cleanUuid(raw.receiver_id);
  if (!receiverId) return { ok: false, error: "Invalid receiver" };

  const messageType = cleanMessageType(raw.message_type);
  if (!messageType) return { ok: false, error: "Invalid message type" };

  const message = cleanText(raw.message, MAX_MESSAGE_CHARS);
  const imageUrl = cleanNullableText(raw.image_url, 2_048);
  const videoUrl = cleanNullableText(raw.video_url, 2_048);
  const voiceUrl = cleanNullableText(raw.voice_url, 2_048);
  const filePayload = cleanJsonPayload(raw.file_payload);
  const giftPayload = cleanJsonPayload(raw.gift_payload);
  if (raw.file_payload != null && filePayload === undefined) return { ok: false, error: "Invalid file payload" };
  if (raw.gift_payload != null && giftPayload === undefined) return { ok: false, error: "Invalid gift payload" };
  const locationLat = cleanCoordinate(raw.location_lat, -90, 90);
  const locationLng = cleanCoordinate(raw.location_lng, -180, 180);
  const replyToId = cleanUuid(raw.reply_to_id);
  const forwardedFromUserId = cleanUuid(raw.forwarded_from_user_id);
  const forwardedFromMessageId = cleanUuid(raw.forwarded_from_message_id);
  const expiresAt = cleanFutureIso(raw.expires_at);
  const selfDestructSeconds = cleanPositiveInt(raw.self_destruct_seconds, MAX_SELF_DESTRUCT_SECONDS);
  const lockedPriceCents = cleanPositiveInt(raw.locked_price_cents, MAX_LOCKED_PRICE_CENTS);
  const lockedPayloadContent = cleanText(raw.locked_payload_content, MAX_LOCKED_TEXT_CHARS);

  const hasContent = Boolean(
    message ||
      imageUrl ||
      videoUrl ||
      voiceUrl ||
      filePayload ||
      giftPayload ||
      locationLat != null ||
      lockedPayloadContent,
  );
  if (!hasContent) return { ok: false, error: "Message content required" };

  if (messageType.startsWith("locked_") && !lockedPriceCents) {
    return { ok: false, error: "Locked messages require a price" };
  }
  if (messageType === "locked_text" && !lockedPayloadContent) {
    return { ok: false, error: "Locked text content required" };
  }

  const insert: DirectMessageInsert = {
    sender_id: senderId,
    receiver_id: receiverId,
    message: messageType === "locked_text" ? "" : message,
    message_type: messageType,
  };

  if (imageUrl !== undefined) insert.image_url = imageUrl;
  if (videoUrl !== undefined) insert.video_url = videoUrl;
  if (voiceUrl !== undefined) insert.voice_url = voiceUrl;
  if (filePayload !== undefined) insert.file_payload = filePayload;
  if (giftPayload !== undefined) insert.gift_payload = giftPayload;
  if (replyToId) insert.reply_to_id = replyToId;
  if (forwardedFromUserId) insert.forwarded_from_user_id = forwardedFromUserId;
  if (forwardedFromMessageId) insert.forwarded_from_message_id = forwardedFromMessageId;
  if (locationLat != null) insert.location_lat = locationLat;
  if (locationLng != null) insert.location_lng = locationLng;
  if (typeof raw.location_label === "string") insert.location_label = raw.location_label.trim().slice(0, MAX_LABEL_CHARS);
  if (expiresAt) insert.expires_at = expiresAt;
  if (selfDestructSeconds) insert.self_destruct_seconds = selfDestructSeconds;
  if (lockedPriceCents) insert.locked_price_cents = lockedPriceCents;

  return { ok: true, message: insert, lockedPayloadContent: messageType === "locked_text" ? lockedPayloadContent : null };
}

async function insertDirectMessage(
  admin: SupabaseAdmin,
  payload: DirectMessageInsert,
  lockedPayloadContent: string | null,
): Promise<{ ok: true; message: unknown } | { ok: false; error: { message?: string } }> {
  const { data: message, error } = await admin
    .from("direct_messages")
    .insert(payload)
    .select("id, created_at, receiver_id")
    .single();
  if (error) return { ok: false, error };

  if (lockedPayloadContent && (message as { id?: string } | null)?.id) {
    const messageId = (message as { id: string }).id;
    const { error: payloadError } = await admin
      .from("direct_message_locked_payloads")
      .insert({ message_id: messageId, content: lockedPayloadContent });
    if (payloadError) {
      await admin.from("direct_messages").delete().eq("id", messageId);
      return { ok: false, error: payloadError };
    }
  }

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
  console.error(`[chat-message-send:${action}]`, error.message);
  return json({ error: "Could not send message" }, 500);
}
