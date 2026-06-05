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

const MEDIA_SUPABASE_URL =
  Deno.env.get("ZIVO_MEDIA_SUPABASE_URL") || "https://slirphzzwcogdbkeicff.supabase.co";
const MEDIA_SUPABASE_ANON_KEY =
  Deno.env.get("ZIVO_MEDIA_SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI";

const ALLOWED_ORIGINS = new Set([
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://zivosmedia.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(req, { error: "Missing ZIVO Media session" }, 401);
  }

  const SOFTWARE_SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SOFTWARE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SOFTWARE_SUPABASE_URL || !SOFTWARE_SERVICE_ROLE_KEY) {
    return json(req, { error: "Software auth bridge is not configured" }, 500);
  }

  const media = createClient(MEDIA_SUPABASE_URL, MEDIA_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: mediaUserData, error: mediaUserError } = await media.auth.getUser();
  const mediaUser = mediaUserData?.user;
  const email = mediaUser?.email?.trim().toLowerCase();
  if (mediaUserError || !mediaUser || !email) {
    return json(req, { error: "Invalid ZIVO Media session" }, 401);
  }

  const software = createClient(SOFTWARE_SUPABASE_URL, SOFTWARE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkError } = await software.auth.admin.generateLink({
    type: "magiclink",
    email,
    data: {
      connected_from: "zivosmedia",
      zivo_media_user_id: mediaUser.id,
    },
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return json(req, { error: "Could not create Software handoff token" }, 500);
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
      return json(req, { error: "Could not prepare Software profile" }, 500);
    }
  }

  return json(req, {
    token_hash: tokenHash,
    connected: "zivosmedia",
  });
});
