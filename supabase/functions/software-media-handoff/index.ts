/**
 * software-media-handoff
 *
 * Lets an already signed-in ZIVO Media customer enter ZIVO Software without
 * retyping credentials. The caller presents a ZIVO Media JWT; this Software
 * project function validates that JWT against the Media project, then mints a
 * single-use Software magic-link token for the same verified email.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.0";
import { withSecurity } from "../_shared/withSecurity.ts";

const MEDIA_SUPABASE_URL =
  Deno.env.get("ZIVO_MEDIA_SUPABASE_URL") || "https://slirphzzwcogdbkeicff.supabase.co";
const MEDIA_SUPABASE_ANON_KEY =
  Deno.env.get("ZIVO_MEDIA_SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI";

function json(corsHeaders: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type MediaStoreProfile = {
  id: string;
  name: string | null;
  slug: string | null;
  category: string | null;
  setup_complete: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
};

function normalizeCategory(category?: string | null) {
  return (category || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMediaStore(stores: MediaStoreProfile[]) {
  const activeStores = stores.filter((store) => store.id && store.is_active !== false);
  return (
    activeStores.find((store) => normalizeCategory(store.category) === "auto repair") ||
    activeStores.find((store) => store.setup_complete === true) ||
    activeStores[0] ||
    null
  );
}

function mediaDashboardUrlForStore(store: MediaStoreProfile | null) {
  if (!store?.id) return null;
  const category = normalizeCategory(store.category);
  const base = "https://zivosmedia.com";

  if (category === "auto repair") {
    return `${base}/admin/stores/${store.id}?tab=ar-dashboard&category=auto-repair`;
  }

  if (category === "car rental") {
    return `${base}/admin/stores/${store.id}?tab=car-rental-dashboard`;
  }

  if (category === "car dealership") {
    return `${base}/admin/stores/${store.id}?tab=cd-dashboard`;
  }

  return `${base}/admin/stores/${store.id}`;
}

serve(withSecurity("software-media-handoff", async (req, ctx): Promise<Response> => {
  const corsHeaders = ctx.corsHeaders;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(corsHeaders, { error: "Missing ZIVO Media session" }, 401);
  }

  const SOFTWARE_SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SOFTWARE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SOFTWARE_SUPABASE_URL || !SOFTWARE_SERVICE_ROLE_KEY) {
    return json(corsHeaders, { error: "Software auth bridge is not configured" }, 500);
  }

  const media = createClient(MEDIA_SUPABASE_URL, MEDIA_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: mediaUserData, error: mediaUserError } = await media.auth.getUser();
  const mediaUser = mediaUserData?.user;
  const email = mediaUser?.email?.trim().toLowerCase();
  if (mediaUserError || !mediaUser || !email) {
    return json(corsHeaders, { error: "Invalid ZIVO Media session" }, 401);
  }

  let linkedMediaStore: MediaStoreProfile | null = null;
  const { data: mediaStores } = await media
    .from("store_profiles")
    .select("id, name, slug, category, setup_complete, is_active, created_at")
    .eq("owner_id", mediaUser.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  linkedMediaStore = pickMediaStore((mediaStores ?? []) as MediaStoreProfile[]);
  const mediaDashboardUrl = mediaDashboardUrlForStore(linkedMediaStore);

  const software = createClient(SOFTWARE_SUPABASE_URL, SOFTWARE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const handoffMetadata: Record<string, string> = {
    connected_from: "zivosmedia",
    zivo_media_user_id: mediaUser.id,
  };
  if (linkedMediaStore?.id) {
    handoffMetadata.zivo_media_store_id = linkedMediaStore.id;
  }
  if (linkedMediaStore?.name) {
    handoffMetadata.zivo_media_store_name = linkedMediaStore.name;
  }
  if (linkedMediaStore?.category) {
    handoffMetadata.zivo_media_store_category = linkedMediaStore.category;
  }
  if (mediaDashboardUrl) {
    handoffMetadata.zivo_media_dashboard_url = mediaDashboardUrl;
  }

  const { data: linkData, error: linkError } = await software.auth.admin.generateLink({
    type: "magiclink",
    email,
    data: handoffMetadata,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return json(corsHeaders, { error: "Could not create Software handoff token" }, 500);
  }

  const softwareUserId = linkData.user?.id;
  if (softwareUserId) {
    const metadata = mediaUser.user_metadata ?? {};
    const fullName =
      stringValue(metadata.full_name) ||
      stringValue(metadata.name) ||
      stringValue(metadata.display_name);
    const phone = stringValue(mediaUser.phone) || stringValue(metadata.phone);
    const profilePayload: Record<string, string> = {
      user_id: softwareUserId,
      updated_at: new Date().toISOString(),
    };
    if (fullName) profilePayload.full_name = fullName;
    if (phone) profilePayload.phone = phone;

    const { error: profileError } = await software
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (profileError) {
      return json(corsHeaders, { error: "Could not prepare Software profile" }, 500);
    }

    const { error: metadataError } = await software.auth.admin.updateUserById(softwareUserId, {
      user_metadata: {
        ...(linkData.user?.user_metadata ?? {}),
        ...handoffMetadata,
      },
    });

    if (metadataError) {
      return json(corsHeaders, { error: "Could not link ZIVO Media business" }, 500);
    }
  }

  return json(corsHeaders, {
    token_hash: tokenHash,
    connected: "zivosmedia",
    media_store: linkedMediaStore
      ? {
          id: linkedMediaStore.id,
          name: linkedMediaStore.name,
          category: linkedMediaStore.category,
          setup_complete: linkedMediaStore.setup_complete,
        }
      : null,
    media_dashboard_url: mediaDashboardUrl,
  });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
