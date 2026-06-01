/**
 * chat-group-manage
 * -----------------
 * Authenticated group lifecycle gate. Group creation, member role changes,
 * kicks, self-leave, metadata edits, and invite creation/revocation are
 * validated here so browser-owned writes cannot spoof membership authority.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_GROUP_NAME = 80;
const MAX_MEMBERS_PER_REQUEST = 100;
const MAX_AVATAR_CHARS = 2_048;
const MAX_INVITE_USES = 10_000;
const MAX_INVITE_HOURS = 24 * 365;
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type JsonResponder = (body: unknown, status?: number) => Response;
type SupabaseAdmin = ReturnType<typeof createClient>;
type GroupRole = "owner" | "admin" | "member";
type Action =
  | "create_group"
  | "update_group"
  | "add_members"
  | "remove_member"
  | "leave_group"
  | "set_member_role"
  | "mute_member"
  | "create_invite"
  | "revoke_invite";

type RequestBody = Record<string, unknown> & { action?: Action };

serve(withSecurity("chat-group-manage", async (req, ctx) => {
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

  const body = await req.json().catch(() => ({})) as RequestBody;
  switch (body.action) {
    case "create_group":
      return createGroup(admin, user.id, body, json);
    case "update_group":
      return updateGroup(admin, user.id, body, json);
    case "add_members":
      return addMembers(admin, user.id, body, json);
    case "remove_member":
      return removeMember(admin, user.id, body, json);
    case "leave_group":
      return leaveGroup(admin, user.id, body, json);
    case "set_member_role":
      return setMemberRole(admin, user.id, body, json);
    case "mute_member":
      return muteMember(admin, user.id, body, json);
    case "create_invite":
      return createInvite(admin, user.id, body, json);
    case "revoke_invite":
      return revokeInvite(admin, user.id, body, json);
    default:
      return json({ error: "Invalid action" }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function createGroup(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const name = cleanName(body.name);
  if (!name) return json({ error: "Invalid group name" }, 400);
  const memberIds = cleanUuidList(body.member_ids, MAX_MEMBERS_PER_REQUEST).filter((id) => id !== callerId);

  const { data: group, error: groupError } = await admin
    .from("chat_groups")
    .insert({ name, created_by: callerId })
    .select("id, name, avatar_url")
    .single();
  if (groupError || !(group as { id?: string } | null)?.id) return fail("create_group", groupError, json);

  const groupId = (group as { id: string }).id;
  const rows = [
    { group_id: groupId, user_id: callerId, role: "owner" },
    ...memberIds.map((userId) => ({ group_id: groupId, user_id: userId, role: "member" })),
  ];
  const { error: memberError } = await admin
    .from("chat_group_members")
    .upsert(rows, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  if (memberError) {
    await admin.from("chat_groups").delete().eq("id", groupId);
    return fail("create_members", memberError, json);
  }

  return json({ ok: true, group });
}

async function updateGroup(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  if (!groupId) return json({ error: "Invalid group" }, 400);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);

  const patch: { name?: string; avatar_url?: string | null } = {};
  if ("name" in body) {
    const name = cleanName(body.name);
    if (!name) return json({ error: "Invalid group name" }, 400);
    patch.name = name;
  }
  if ("avatar_url" in body) {
    const avatarUrl = cleanNullableText(body.avatar_url, MAX_AVATAR_CHARS);
    if (avatarUrl === undefined) return json({ error: "Invalid avatar" }, 400);
    patch.avatar_url = avatarUrl;
  }
  if (!Object.keys(patch).length) return json({ error: "No group updates" }, 400);

  const { data: group, error } = await admin
    .from("chat_groups")
    .update(patch)
    .eq("id", groupId)
    .select("id, name, avatar_url")
    .single();
  if (error) return fail("update_group", error, json);
  return json({ ok: true, group });
}

async function addMembers(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  if (!groupId) return json({ error: "Invalid group" }, 400);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);
  const memberIds = cleanUuidList(body.member_ids, MAX_MEMBERS_PER_REQUEST).filter((id) => id !== callerId);
  if (!memberIds.length) return json({ error: "No members to add" }, 400);

  const rows = memberIds.map((userId) => ({ group_id: groupId, user_id: userId, role: "member" }));
  const { error } = await admin
    .from("chat_group_members")
    .upsert(rows, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  if (error) return fail("add_members", error, json);
  return json({ ok: true, added: rows.length });
}

async function removeMember(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  const targetUserId = cleanUuid(body.user_id);
  if (!groupId || !targetUserId) return json({ error: "Invalid member" }, 400);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);
  if (targetUserId === callerId) return leaveGroup(admin, callerId, body, json);

  const targetRole = await getMemberRole(admin, targetUserId, groupId);
  if (!targetRole) return json({ error: "Member not found" }, 404);
  if (targetRole === "owner") return json({ error: "Transfer ownership before removing an owner" }, 403);

  const { error } = await admin
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);
  if (error) return fail("remove_member", error, json);
  return json({ ok: true });
}

async function leaveGroup(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  if (!groupId) return json({ error: "Invalid group" }, 400);
  const role = await getMemberRole(admin, callerId, groupId);
  if (!role) return json({ error: "Member not found" }, 404);
  if (role === "owner") {
    const owners = await countOwners(admin, groupId);
    if (owners <= 1) return json({ error: "Transfer ownership before leaving" }, 403);
  }

  const { error } = await admin
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", callerId);
  if (error) return fail("leave_group", error, json);
  return json({ ok: true });
}

async function setMemberRole(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  const targetUserId = cleanUuid(body.user_id);
  const role = cleanRole(body.role);
  if (!groupId || !targetUserId || !role) return json({ error: "Invalid role change" }, 400);

  const callerRole = await getMemberRole(admin, callerId, groupId);
  if (!callerRole) return json({ error: "Not a group member" }, 403);
  const targetRole = await getMemberRole(admin, targetUserId, groupId);
  if (!targetRole) return json({ error: "Member not found" }, 404);

  const touchesOwner = role === "owner" || targetRole === "owner";
  if (touchesOwner && callerRole !== "owner") return json({ error: "Only owners can change owner roles" }, 403);
  if (!touchesOwner && callerRole !== "owner" && callerRole !== "admin") return json({ error: "Admin required" }, 403);
  if (targetRole === "owner" && role !== "owner") {
    const owners = await countOwners(admin, groupId);
    if (owners <= 1) return json({ error: "A group must keep at least one owner" }, 403);
  }

  const { data: member, error } = await admin
    .from("chat_group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select("group_id, user_id, role, muted_until")
    .single();
  if (error) return fail("set_member_role", error, json);
  return json({ ok: true, member });
}

async function muteMember(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  const targetUserId = cleanUuid(body.user_id);
  if (!groupId || !targetUserId) return json({ error: "Invalid member" }, 400);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);
  const targetRole = await getMemberRole(admin, targetUserId, groupId);
  if (!targetRole) return json({ error: "Member not found" }, 404);
  if (targetRole === "owner" && callerId !== targetUserId) return json({ error: "Cannot mute group owner" }, 403);
  const mutedUntil = cleanNullableFutureIso(body.muted_until);
  if (mutedUntil === undefined) return json({ error: "Invalid mute time" }, 400);

  const { data: member, error } = await admin
    .from("chat_group_members")
    .update({ muted_until: mutedUntil })
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select("group_id, user_id, role, muted_until")
    .single();
  if (error) return fail("mute_member", error, json);
  return json({ ok: true, member });
}

async function createInvite(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const groupId = cleanUuid(body.group_id);
  if (!groupId) return json({ error: "Invalid group" }, 400);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);
  const expiresInHours = cleanPositiveInt(body.expires_in_hours, MAX_INVITE_HOURS);
  const maxUses = cleanPositiveInt(body.max_uses, MAX_INVITE_USES);
  if (body.expires_in_hours != null && expiresInHours == null) return json({ error: "Invalid invite expiry" }, 400);
  if (body.max_uses != null && maxUses == null) return json({ error: "Invalid invite usage limit" }, 400);

  const row = {
    group_id: groupId,
    code: createInviteCode(),
    created_by: callerId,
    expires_at: expiresInHours ? new Date(Date.now() + expiresInHours * 3600_000).toISOString() : null,
    max_uses: maxUses,
  };

  const { data: invite, error } = await admin
    .from("chat_group_invites")
    .insert(row)
    .select()
    .single();
  if (error) return fail("create_invite", error, json);
  return json({ ok: true, invite });
}

async function revokeInvite(admin: SupabaseAdmin, callerId: string, body: RequestBody, json: JsonResponder) {
  const inviteId = cleanUuid(body.invite_id);
  if (!inviteId) return json({ error: "Invalid invite" }, 400);
  const { data: invite, error: inviteError } = await admin
    .from("chat_group_invites")
    .select("id, group_id")
    .eq("id", inviteId)
    .maybeSingle();
  if (inviteError) return fail("lookup_invite", inviteError, json);
  const groupId = (invite as { group_id?: string } | null)?.group_id;
  if (!groupId) return json({ error: "Invite not found" }, 404);
  const adminCheck = await requireAdmin(admin, callerId, groupId);
  if (!adminCheck.ok) return json({ error: adminCheck.error }, adminCheck.status);

  const { data: revoked, error } = await admin
    .from("chat_group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .select()
    .single();
  if (error) return fail("revoke_invite", error, json);
  return json({ ok: true, invite: revoked });
}

async function requireAdmin(
  admin: SupabaseAdmin,
  callerId: string,
  groupId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const role = await getMemberRole(admin, callerId, groupId);
  if (!role) return { ok: false, status: 403, error: "Not a group member" };
  if (role !== "owner" && role !== "admin") return { ok: false, status: 403, error: "Admin required" };
  return { ok: true };
}

async function getMemberRole(admin: SupabaseAdmin, userId: string, groupId: string): Promise<GroupRole | null> {
  const { data, error } = await admin
    .from("chat_group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[chat-group-manage:role]", error.message);
    return null;
  }
  const role = (data as { role?: string } | null)?.role;
  return role === "owner" || role === "admin" || role === "member" ? role : null;
}

async function countOwners(admin: SupabaseAdmin, groupId: string): Promise<number> {
  const { count, error } = await admin
    .from("chat_group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("role", "owner");
  if (error) {
    console.error("[chat-group-manage:owner_count]", error.message);
    return 0;
  }
  return count ?? 0;
}

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ").slice(0, MAX_GROUP_NAME);
  return name || null;
}

function cleanRole(value: unknown): GroupRole | null {
  return value === "owner" || value === "admin" || value === "member" ? value : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanUuidList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(cleanUuid).filter((id): id is string => Boolean(id)))).slice(0, max);
}

function cleanNullableText(value: unknown, maxChars: number): string | null | undefined {
  if (value == null) return value === null ? null : undefined;
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxChars) || null;
}

function cleanNullableFutureIso(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return undefined;
  return new Date(timestamp).toISOString();
}

function cleanPositiveInt(value: unknown, max: number): number | null {
  if (value == null || value === "") return null;
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 && numeric <= max ? numeric : null;
}

function createInviteCode(): string {
  const values = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(values, (value) => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join("");
}

function fail(action: string, error: { message?: string } | null | undefined, json: JsonResponder) {
  console.error(`[chat-group-manage:${action}]`, error?.message);
  return json({ error: "Could not update group" }, 500);
}
