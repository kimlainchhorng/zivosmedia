// chat-consume-view-once — opens a view-once (burn-after-view) 1:1 photo/video
// exactly once. Validates the caller is the recipient, marks the message
// consumed, nulls the media columns so it can never be re-fetched, and returns
// a short-lived signed URL for the single view.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BUCKET = "chat-media-files";

Deno.serve(withSecurity("chat-consume-view-once", async (req, ctx) => {
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const messageId = String(body.message_id || "").trim();
    if (!messageId) return json({ error: "Missing message_id" }, 400, corsHeaders);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: msg, error: loadError } = await admin
      .from("direct_messages")
      .select("id, receiver_id, image_url, video_url, file_payload")
      .eq("id", messageId)
      .maybeSingle();

    if (loadError) return json({ error: "Lookup failed" }, 500, corsHeaders);
    if (!msg) return json({ error: "MESSAGE_NOT_FOUND" }, 404, corsHeaders);
    if (msg.receiver_id !== userId) return json({ error: "NOT_RECIPIENT" }, 403, corsHeaders);

    const fp = (msg.file_payload && typeof msg.file_payload === "object" ? msg.file_payload : {}) as Record<string, unknown>;
    if (fp.view_once !== true) return json({ error: "NOT_VIEW_ONCE" }, 400, corsHeaders);
    if (fp.view_once_opened === true) return json({ error: "ALREADY_OPENED" }, 410, corsHeaders);

    const mediaUrl = (msg.video_url || msg.image_url) as string | null;
    const type = msg.video_url ? "video" : "image";
    if (!mediaUrl) return json({ error: "NO_MEDIA" }, 410, corsHeaders);

    // Re-sign from the storage path embedded in the stored signed URL so the
    // one view works even if the original URL has expired. Fall back to the
    // stored URL if the path can't be derived.
    let url = mediaUrl;
    const path = extractStoragePath(mediaUrl, BUCKET);
    if (path) {
      const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 60);
      if (signed?.signedUrl) url = signed.signedUrl;
    }

    // Mark consumed + remove the media so it can never be re-fetched.
    const { error: updateError } = await admin
      .from("direct_messages")
      .update({
        image_url: null,
        video_url: null,
        file_payload: { ...fp, view_once_opened: true },
      })
      .eq("id", messageId);
    if (updateError) return json({ error: "Could not consume message" }, 500, corsHeaders);

    return json({ url, type }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Open failed";
    return json({ error: message }, 500, corsHeaders);
  }
}, { rateLimit: "api_general", strictCors: true, allowedMethods: ["POST"] }));

/** Pull the object path out of a Supabase storage signed/public URL. */
function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const after = url.slice(idx + marker.length);
  const path = after.split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
