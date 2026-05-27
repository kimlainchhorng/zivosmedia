/**
 * bot-create — creates a bot atomically with service role.
 *
 * Auth: requires the caller's Supabase user JWT (Authorization header).
 * Steps: validate input → create auth.users row for the bot → insert
 * profile (is_bot=true) → insert bots row → return token (one-time).
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authz = req.headers.get("Authorization") ?? "";
    if (!authz.startsWith("Bearer ")) return j({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authz } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const owner = userRes?.user;
    if (!owner) return j({ error: "Not authenticated" }, 401);

    const { username, display_name, description } = await req.json();
    const u = String(username ?? "").trim().toLowerCase();
    const dn = String(display_name ?? "").trim();
    if (!/^[a-z0-9_]{4,29}_bot$/.test(u)) {
      return j({ error: "Username must end in _bot, 5-32 chars, lowercase a-z/0-9/_" }, 400);
    }
    if (!dn) return j({ error: "Display name required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Uniqueness checks
    const [{ data: ex1 }, { data: ex2 }] = await Promise.all([
      sb.from("bots").select("id").eq("username", u).maybeSingle(),
      sb.from("usernames").select("username").ilike("username", u).maybeSingle(),
    ]);
    if (ex1 || ex2) return j({ error: "Username taken" }, 409);

    // Create auth.users row for the bot
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email: `${u}@bots.zivo.local`,
      email_confirm: true,
      user_metadata: { is_bot: true, owner_id: owner.id, username: u, display_name: dn },
    });
    if (cErr || !created.user) return j({ error: cErr?.message ?? "auth create failed" }, 500);
    const botUserId = created.user.id;

    // Profile row
    await sb.from("profiles").upsert({
      id: botUserId,
      user_id: botUserId,
      full_name: dn,
      username: u,
      is_bot: true,
    }, { onConflict: "id" });

    // Bot row + token
    const { data: row, error: rErr } = await sb.rpc("create_bot_row", {
      p_owner: owner.id,
      p_bot_user_id: botUserId,
      p_username: u,
      p_display_name: dn,
      p_description: description ?? null,
    });
    if (rErr || !row) {
      await sb.auth.admin.deleteUser(botUserId).catch(() => {});
      return j({ error: rErr?.message ?? "bot insert failed" }, 500);
    }
    const r = Array.isArray(row) ? row[0] : row;

    return j({ ok: true, bot_id: r.bot_id, bot_user_id: botUserId, token: r.token });
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
