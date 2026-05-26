/**
 * bot-clone — duplicate an existing bot under a new username with all its
 * commands and metadata copied across. Returns the new bot's one-time token.
 *
 * Body: { source_bot_id: uuid, new_username: string, new_display_name: string }
 * Returns: { ok: true, bot_id, bot_user_id, token }
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authz = req.headers.get("Authorization") ?? "";
    if (!authz.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authz } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const owner = userRes?.user;
    if (!owner) return json({ error: "Not authenticated" }, 401);

    const { source_bot_id, new_username, new_display_name } = await req.json();
    if (!source_bot_id) return json({ error: "source_bot_id required" }, 400);

    const u = String(new_username ?? "").trim().toLowerCase();
    const dn = String(new_display_name ?? "").trim();
    if (!/^[a-z0-9_]{4,29}_bot$/.test(u)) {
      return json({ error: "Username must end in _bot, 5-32 chars, lowercase a-z/0-9/_" }, 400);
    }
    if (!dn) return json({ error: "Display name required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load source bot, ensure caller owns it
    const { data: src, error: srcErr } = await sb
      .from("bots")
      .select("id, owner_id, description, avatar_url, webhook_url")
      .eq("id", source_bot_id)
      .maybeSingle();
    if (srcErr) return json({ error: srcErr.message }, 500);
    if (!src) return json({ error: "Source bot not found" }, 404);
    if (src.owner_id !== owner.id) return json({ error: "Not owner of source bot" }, 403);

    // Uniqueness checks for new username
    const [{ data: ex1 }, { data: ex2 }] = await Promise.all([
      sb.from("bots").select("id").eq("username", u).maybeSingle(),
      sb.from("usernames").select("username").ilike("username", u).maybeSingle(),
    ]);
    if (ex1 || ex2) return json({ error: "Username taken" }, 409);

    // Create the underlying auth user for the new bot
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email: `${u}@bots.zivo.local`,
      email_confirm: true,
      user_metadata: { is_bot: true, owner_id: owner.id, username: u, display_name: dn },
    });
    if (cErr || !created.user) return json({ error: cErr?.message ?? "auth create failed" }, 500);
    const botUserId = created.user.id;

    // Profile row (chat UI requires this)
    await sb.from("profiles").upsert({
      id: botUserId,
      user_id: botUserId,
      full_name: dn,
      username: u,
      is_bot: true,
      avatar_url: src.avatar_url ?? null,
    }, { onConflict: "id" });

    // Bot row + token (reuses the same RPC bot-create uses)
    const { data: row, error: rErr } = await sb.rpc("create_bot_row", {
      p_owner: owner.id,
      p_bot_user_id: botUserId,
      p_username: u,
      p_display_name: dn,
      p_description: src.description ?? null,
    });
    if (rErr || !row) {
      await sb.auth.admin.deleteUser(botUserId).catch(() => {});
      return json({ error: rErr?.message ?? "bot insert failed" }, 500);
    }
    const r = Array.isArray(row) ? row[0] : row;
    const newBotId = r.bot_id as string;

    // Carry over avatar + webhook (description already passed via RPC)
    if (src.avatar_url || src.webhook_url) {
      await sb.from("bots").update({
        avatar_url: src.avatar_url ?? null,
        webhook_url: src.webhook_url ?? null,
      }).eq("id", newBotId);
    }

    // Copy commands
    const { data: cmds } = await sb
      .from("bot_commands")
      .select("command, description, sort_order")
      .eq("bot_id", source_bot_id);
    if (cmds && cmds.length > 0) {
      const cmdRows = cmds.map((c: any) => ({
        bot_id: newBotId,
        command: c.command,
        description: c.description ?? "",
        sort_order: c.sort_order ?? 0,
      }));
      await sb.from("bot_commands").insert(cmdRows);
    }

    return json({ ok: true, bot_id: newBotId, bot_user_id: botUserId, token: r.token });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
