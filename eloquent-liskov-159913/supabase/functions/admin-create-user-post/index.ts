import { createClient } from "../_shared/deps.ts";
import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";

type UploadFileInput = {
  base64?: string;
  storageUrl?: string;
  contentType?: string;
  name?: string;
};

const ALLOWED_ROLES = ["admin", "super_admin", "support"];

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function getFileExtension(file: UploadFileInput) {
  const fromName = file.name?.split(".").pop()?.trim().toLowerCase();
  if (fromName) return fromName;

  const fromType = file.contentType?.split("/").pop()?.trim().toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;

  return "jpg";
}

function getMediaType(file: UploadFileInput) {
  return file.contentType?.startsWith("video/") ? "video" : "image";
}

Deno.serve(withSecurity("admin-create-user-post", async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401, corsHeaders);
    }

    // Step-up MFA — privileged user creation requires an AAL2 session
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

    const { data: roleRows, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ALLOWED_ROLES);

    if (roleError) {
      console.error("[admin-create-user-post] role lookup failed:", roleError);
    }

    if ((roleRows ?? []).length === 0) {
      return jsonResponse({ error: "Admin access required" }, 403, corsHeaders);
    }

    const body = await req.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";
    const files = Array.isArray(body?.files)
      ? (body.files as UploadFileInput[]).filter((file) => !!file?.base64 || !!file?.storageUrl)
      : [];

    if (!userId) {
      return jsonResponse({ error: "Missing userId" }, 400, corsHeaders);
    }

    if (!caption && files.length === 0) {
      return jsonResponse({ error: "Post must include text or media" }, 400, corsHeaders);
    }

    if (files.length > 10) {
      return jsonResponse({ error: "Maximum 10 files allowed" }, 400, corsHeaders);
    }

    const uploadedMedia: Array<{ mediaType: string; mediaUrl: string; sortOrder: number }> = [];

    for (const [index, file] of files.entries()) {
      // If the client already uploaded to storage, just use the URL directly
      if (file.storageUrl) {
        uploadedMedia.push({
          mediaType: getMediaType(file),
          mediaUrl: file.storageUrl,
          sortOrder: index,
        });
        continue;
      }

      // Otherwise handle base64 upload (small files)
      const extension = getFileExtension(file);
      const filePath = `${userId}/post_${Date.now()}_${index}_${crypto.randomUUID()}.${extension}`;
      const fileBytes = decode(file.base64!);

      const { error: uploadError } = await adminClient.storage
        .from("user-posts")
        .upload(filePath, fileBytes, {
          contentType: file.contentType || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("[admin-create-user-post] upload error:", uploadError);
        return jsonResponse({ error: uploadError.message }, 400, corsHeaders);
      }

      const { data: publicUrlData } = adminClient.storage.from("user-posts").getPublicUrl(filePath);

      uploadedMedia.push({
        mediaType: getMediaType(file),
        mediaUrl: publicUrlData.publicUrl,
        sortOrder: index,
      });
    }

    const primaryMedia = uploadedMedia[0] ?? null;

    const { data: createdPost, error: postError } = await adminClient
      .from("user_posts")
      .insert({
        user_id: userId,
        caption: caption || null,
        media_url: primaryMedia?.mediaUrl ?? null,
        media_type: primaryMedia?.mediaType ?? "image",
        is_published: true,
      })
      .select("id")
      .single();

    if (postError || !createdPost?.id) {
      console.error("[admin-create-user-post] post insert error:", postError);
      return jsonResponse({ error: postError?.message || "Failed to create post" }, 400, corsHeaders);
    }

    if (uploadedMedia.length > 0) {
      const { error: mediaError } = await adminClient.from("post_media").insert(
        uploadedMedia.map((media) => ({
          post_id: createdPost.id,
          media_type: media.mediaType,
          media_url: media.mediaUrl,
          sort_order: media.sortOrder,
        })),
      );

      if (mediaError) {
        console.error("[admin-create-user-post] media insert error:", mediaError);
        await adminClient.from("user_posts").delete().eq("id", createdPost.id);
        return jsonResponse({ error: mediaError.message }, 400, corsHeaders);
      }
    }

    console.log("[admin-create-user-post] Created post", createdPost.id, "for", userId, "by", caller.id);

    return jsonResponse({ success: true, mediaCount: uploadedMedia.length, postId: createdPost.id }, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin-create-user-post] unexpected error:", message);
    return jsonResponse({ error: message }, 500, getCorsHeaders(req));
  }
}, { rateLimit: "upload", skipWaf: true }));
