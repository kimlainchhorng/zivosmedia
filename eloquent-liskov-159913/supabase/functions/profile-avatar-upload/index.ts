import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.id) return json({ error: "Unauthorized" }, 401);

    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "avatar").toLowerCase();
    const kind: "avatar" | "cover" = kindRaw === "cover" ? "cover" : "avatar";
    const bucket = kind === "cover" ? "covers" : "avatars";
    const profileColumn = kind === "cover" ? "cover_url" : "avatar_url";

    if (!(file instanceof File)) return json({ error: "Missing image file" }, 400);

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) return json({ error: "Please upload a JPG, PNG, or WebP image" }, 400);
    const maxSize = kind === "cover" ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) return json({ error: `File size must be less than ${maxSize / 1024 / 1024}MB` }, 400);

    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `${user.id}/${kind}_${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(filePath, bytes, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    const { data: existing, error: existingError } = await admin
      .from("profiles")
      .select("id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();
    if (existingError) throw existingError;

    const profilePayload: Record<string, unknown> = {
      user_id: user.id,
      email: user.email,
      [profileColumn]: publicUrl,
      updated_at: new Date().toISOString(),
    };
    const { error: profileError } = existing
      ? await admin.from("profiles").update(profilePayload).eq("id", existing.id)
      : await admin.from("profiles").insert({ id: user.id, ...profilePayload });
    if (profileError) throw profileError;

    return json({ url: publicUrl, avatarUrl: kind === "avatar" ? publicUrl : undefined, coverUrl: kind === "cover" ? publicUrl : undefined });
  } catch (err) {
    console.error("[profile-avatar-upload]", err);
    return json({ error: (err as Error).message || "Upload failed" }, 500);
  }
});
