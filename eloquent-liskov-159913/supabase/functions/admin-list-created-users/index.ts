import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";

type ProfileCandidate = {
  id?: string;
  user_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  cover_url: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_snapchat: string | null;
  social_x: string | null;
  social_linkedin: string | null;
  social_telegram: string | null;
  social_links: Record<string, unknown> | null;
  updated_at: string | null;
};

function rankProfileCandidate(candidate: ProfileCandidate, requestedId: string) {
  let score = 0;

  if (candidate.user_id === requestedId) score += 8;
  if (candidate.id === requestedId) score += 6;
  if (candidate.cover_url) score += 4;
  if (candidate.avatar_url) score += 2;
  if (candidate.user_id) score += 1;
  if (candidate.social_links && Object.keys(candidate.social_links).length > 0) score += 1;

  return score;
}

function sortProfileCandidates(candidates: ProfileCandidate[], requestedId: string) {
  return [...candidates].sort((a, b) => {
    const scoreDiff = rankProfileCandidate(b, requestedId) - rankProfileCandidate(a, requestedId);
    if (scoreDiff !== 0) return scoreDiff;

    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });
}

function pickFirstPresent<T>(candidates: ProfileCandidate[], getter: (candidate: ProfileCandidate) => T | null | undefined | "") {
  for (const candidate of candidates) {
    const value = getter(candidate);
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function resolveProfile(candidates: ProfileCandidate[], requestedId: string): ProfileCandidate | null {
  if (!candidates.length) return null;

  const ranked = sortProfileCandidates(candidates, requestedId);
  const base = ranked[0];
  const resolvedSocialLinks = ranked.find(
    (candidate) => candidate.social_links && Object.keys(candidate.social_links).length > 0,
  )?.social_links ?? null;

  return {
    ...base,
    user_id: (pickFirstPresent(ranked, (candidate) => candidate.user_id) as string | null) ?? base.id ?? null,
    avatar_url: (pickFirstPresent(ranked, (candidate) => candidate.avatar_url) as string | null) ?? null,
    bio: (pickFirstPresent(ranked, (candidate) => candidate.bio) as string | null) ?? null,
    cover_url: (pickFirstPresent(ranked, (candidate) => candidate.cover_url) as string | null) ?? null,
    social_facebook: (pickFirstPresent(ranked, (candidate) => candidate.social_facebook) as string | null) ?? null,
    social_instagram: (pickFirstPresent(ranked, (candidate) => candidate.social_instagram) as string | null) ?? null,
    social_tiktok: (pickFirstPresent(ranked, (candidate) => candidate.social_tiktok) as string | null) ?? null,
    social_snapchat: (pickFirstPresent(ranked, (candidate) => candidate.social_snapchat) as string | null) ?? null,
    social_x: (pickFirstPresent(ranked, (candidate) => candidate.social_x) as string | null) ?? null,
    social_linkedin: (pickFirstPresent(ranked, (candidate) => candidate.social_linkedin) as string | null) ?? null,
    social_telegram: (pickFirstPresent(ranked, (candidate) => candidate.social_telegram) as string | null) ?? null,
    social_links: resolvedSocialLinks,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("admin-list-created-users", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step-up MFA — listing admin-created users exposes PII; require AAL2
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

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
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

    const canManageAccounts = (roleRows ?? []).length > 0;

    if (!canManageAccounts) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const matchedUsers: Array<{
      id: string;
      email: string;
      created_at: string | null;
      user_metadata?: Record<string, unknown>;
    }> = [];

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) {
        throw error;
      }

      const users = data.users ?? [];
      if (users.length === 0) break;

      for (const user of users) {
        const email = user.email?.toLowerCase() ?? "";
        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const createdViaAdmin =
          metadata.created_via === "admin_user_accounts";
        const isGeneratedZivoAccount = email.endsWith("@zivo.app");

        if (email && (createdViaAdmin || isGeneratedZivoAccount)) {
          matchedUsers.push({
            id: user.id,
            email: user.email ?? "",
            created_at: user.created_at ?? null,
            user_metadata: metadata,
          });
        }
      }

      if (users.length < 1000) break;
    }

    const uniqueUsers = Array.from(
      new Map(matchedUsers.map((user) => [user.id, user])).values(),
    )
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      )
      .slice(0, 100);

    const userIds = uniqueUsers.map((user) => user.id);
    let profiles: ProfileCandidate[] = [];

    if (userIds.length) {
      const primaryQuery = await adminClient
        .from("profiles")
        .select(
            "id, user_id, avatar_url, bio, cover_url, social_facebook, social_instagram, social_tiktok, social_snapchat, social_x, social_linkedin, social_telegram, social_links, updated_at",
        )
        .or(userIds.map((id) => `user_id.eq.${id},id.eq.${id}`).join(","));

      if (primaryQuery.error) {
        if (
          primaryQuery.error.message.includes("social_links") &&
          primaryQuery.error.message.includes("schema cache")
        ) {
          const fallbackQuery = await adminClient
            .from("profiles")
            .select(
              "id, user_id, avatar_url, bio, cover_url, social_facebook, social_instagram, social_tiktok, social_snapchat, social_x, social_linkedin, social_telegram, updated_at",
            )
            .or(userIds.map((id) => `user_id.eq.${id},id.eq.${id}`).join(","));

          if (fallbackQuery.error) {
            throw fallbackQuery.error;
          }

          profiles = (fallbackQuery.data ?? []).map((profile) => ({
            ...profile,
            social_links: null,
          })) as ProfileCandidate[];
        } else {
          throw primaryQuery.error;
        }
      } else {
        profiles = (primaryQuery.data ?? []) as ProfileCandidate[];
      }
    }

    const accounts = uniqueUsers.map((user) => {
      const metadata = user.user_metadata ?? {};
      const profile = resolveProfile(
        profiles.filter((candidate) => candidate.user_id === user.id || candidate.id === user.id),
        user.id,
      );
      const emailPrefix =
        user.email.split("@")[0]?.split("+")[0] ?? "user";
      const socialLinks = {
        ...(profile?.social_links &&
        typeof profile.social_links === "object"
          ? profile.social_links
          : {}),
        ...(profile?.social_facebook
          ? { facebook: profile.social_facebook }
          : {}),
        ...(profile?.social_instagram
          ? { instagram: profile.social_instagram }
          : {}),
        ...(profile?.social_tiktok
          ? { tiktok: profile.social_tiktok }
          : {}),
        ...(profile?.social_snapchat
          ? { snapchat: profile.social_snapchat }
          : {}),
        ...(profile?.social_x ? { x: profile.social_x } : {}),
        ...(profile?.social_linkedin
          ? { linkedin: profile.social_linkedin }
          : {}),
        ...(profile?.social_telegram
          ? { telegram: profile.social_telegram }
          : {}),
      };

      return {
        userId: user.id,
        username:
          (typeof metadata.username === "string" && metadata.username) ||
          (typeof metadata.full_name === "string" && metadata.full_name) ||
          emailPrefix,
        email: user.email,
        password: "",
        createdAt: user.created_at ?? new Date().toISOString(),
        avatarUrl: profile?.avatar_url ?? null,
        bio: profile?.bio ?? "",
        coverUrl: profile?.cover_url ?? null,
        socialLinks,
      };
    });

    return new Response(JSON.stringify({ accounts }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : JSON.stringify(err);
    console.error("admin-list-created-users error:", message);
    return new Response(JSON.stringify({ error: message, fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "admin_action" }));
