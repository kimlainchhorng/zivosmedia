import { createClient } from "../_shared/deps.ts";
import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("admin-update-profile", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step-up MFA — admin profile edits (PII) require an AAL2 session
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ["admin", "super_admin", "support"];
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", allowedRoles);

    if ((roleRows ?? []).length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { userId, avatarUrl, coverUrl, socialLinks, uploadFile, bio } = body;

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(adminClient, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (typeof userId === "string" && await isAbuseThresholdExceeded(adminClient, userId)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions for this user." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (typeof bio === "string") {
      const linkScan = scanContentForLinks(bio);
      if (!linkScan.ok) {
        logBlockedAttempt(adminClient, {
          endpoint: "admin-update-profile",
          userId: body?.userId ?? null,
          urls: linkScan.blocked,
          text: bio,
          ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        });
        return new Response(
          JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedSocialLinks =
      socialLinks && typeof socialLinks === "object" && !Array.isArray(socialLinks)
        ? Object.fromEntries(
            Object.entries(socialLinks as Record<string, unknown>)
              .filter(([key]) => typeof key === "string")
              .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""]),
          )
        : null;

    let uploadedUrl: string | null = null;
    if (uploadFile && typeof uploadFile === "object") {
      const { base64, bucket, contentType } = uploadFile;
      if (!base64 || !bucket) {
        return new Response(JSON.stringify({ error: "Invalid upload data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ext = (contentType || "image/jpeg").split("/")[1] || "jpg";
      const filePath = `${userId}/${Date.now()}.${ext}`;
      const fileBytes = decode(base64);

      const { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, fileBytes, {
          contentType: contentType || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("[admin-update-profile] upload error:", uploadError);
        return new Response(JSON.stringify({ error: uploadError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: publicData } = adminClient.storage.from(bucket).getPublicUrl(filePath);
      uploadedUrl = publicData?.publicUrl ?? null;
    }

    const socialFieldUpdates: Record<string, string | null> = {};
    if (normalizedSocialLinks) {
      const getLink = (key: string) => {
        const value = normalizedSocialLinks[key];
        return typeof value === "string" && value.length > 0 ? value : null;
      };

      socialFieldUpdates.social_facebook = getLink("facebook");
      socialFieldUpdates.social_instagram = getLink("instagram");
      socialFieldUpdates.social_tiktok = getLink("tiktok");
      socialFieldUpdates.social_x = getLink("x");
      socialFieldUpdates.social_linkedin = getLink("linkedin");
      socialFieldUpdates.social_telegram = getLink("telegram");
      socialFieldUpdates.social_snapchat = getLink("snapchat");
    }

    const updates: Record<string, unknown> = {
      ...socialFieldUpdates,
    };

    if (normalizedSocialLinks) updates.social_links = normalizedSocialLinks;
    if (uploadedUrl && uploadFile?.bucket === "avatars") updates.avatar_url = uploadedUrl;
    if (uploadedUrl && uploadFile?.bucket === "covers") updates.cover_url = uploadedUrl;
    if (typeof avatarUrl === "string") updates.avatar_url = avatarUrl.trim() || null;
    if (typeof coverUrl === "string") updates.cover_url = coverUrl.trim() || null;
    if (typeof bio === "string") updates.bio = bio.trim() || null;
    if (bio === null) updates.bio = null;

    if (Object.keys(updates).length > 0) {
      const resolveProfile = async () => {
        const { data, error } = await adminClient
          .from("profiles")
          .select("id, user_id, avatar_url, cover_url, updated_at")
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(10);

        if (error) return { profile: null, error };

        const profile =
          data?.find((candidate) => candidate.user_id === userId) ??
          data?.find((candidate) => candidate.id === userId) ??
          data?.[0] ??
          null;

        return { profile, error: null };
      };

      const readPersistedProfile = async (profileId: string) => {
        return await adminClient
          .from("profiles")
          .select("id, user_id, avatar_url, cover_url")
          .eq("id", profileId)
          .maybeSingle();
      };

      const persistUpdates = async (payload: Record<string, unknown>) => {
        const { profile, error: resolveError } = await resolveProfile();
        if (resolveError) {
          return { data: null, error: resolveError };
        }

        const mutationPayload = {
          ...payload,
          user_id: userId,
          updated_at: new Date().toISOString(),
        };

        if (profile?.id) {
          const updateById = await adminClient
            .from("profiles")
            .update(mutationPayload)
            .eq("id", profile.id)
            .select("id, user_id, avatar_url, cover_url")
            .maybeSingle();

          if (!updateById.error) {
            if (updateById.data) return updateById;
            return await readPersistedProfile(profile.id);
          }

          const updateByUserId = await adminClient
            .from("profiles")
            .update(mutationPayload)
            .eq("user_id", userId)
            .select("id, user_id, avatar_url, cover_url")
            .maybeSingle();

          if (!updateByUserId.error) {
            if (updateByUserId.data) return updateByUserId;
            return await readPersistedProfile(profile.id);
          }

          return {
            data: updateByUserId.data ?? updateById.data ?? null,
            error: updateByUserId.error ?? updateById.error,
          };
        }

        return await adminClient
          .from("profiles")
          .insert({
            id: userId,
            ...mutationPayload,
          })
          .select("id, user_id, avatar_url, cover_url")
          .single();
      };

      let persistPayload = { ...updates };
      let { data: savedProfile, error: updateError } = await persistUpdates(persistPayload);

      if (
        updateError &&
        "social_links" in persistPayload &&
        updateError.message.includes("social_links") &&
        updateError.message.includes("schema cache")
      ) {
        const fallbackPayload = { ...persistPayload };
        delete fallbackPayload.social_links;
        persistPayload = fallbackPayload;
        ({ data: savedProfile, error: updateError } = await persistUpdates(persistPayload));
      }

      if (updateError) {
        console.error("[admin-update-profile] update error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expectedAvatarUrl = typeof persistPayload.avatar_url === "string" ? persistPayload.avatar_url : null;
      const expectedCoverUrl = typeof persistPayload.cover_url === "string" ? persistPayload.cover_url : null;
      const avatarPersisted = !expectedAvatarUrl || savedProfile?.avatar_url === expectedAvatarUrl;
      const coverPersisted = !expectedCoverUrl || savedProfile?.cover_url === expectedCoverUrl;
      const userLinked = savedProfile?.user_id === userId;

      if (!avatarPersisted || !coverPersisted || !userLinked) {
        const { profile: verifiedProfile, error: verifyError } = await resolveProfile();

        if (verifyError) {
          console.error("[admin-update-profile] verification read error:", verifyError);
          return new Response(JSON.stringify({ error: verifyError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const avatarVerified = !expectedAvatarUrl || verifiedProfile?.avatar_url === expectedAvatarUrl;
        const coverVerified = !expectedCoverUrl || verifiedProfile?.cover_url === expectedCoverUrl;
        const userVerified = verifiedProfile?.user_id === userId;

        if (!avatarVerified || !coverVerified || !userVerified) {
          console.error("[admin-update-profile] verification failed: avatar/cover/user mismatch");

          return new Response(JSON.stringify({ error: "Profile update verification failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    console.log("[admin-update-profile] Profile updated successfully");

    return new Response(JSON.stringify({ success: true, uploadedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "upload", skipWaf: true }));
