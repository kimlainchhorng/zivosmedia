/**
 * useGroupAdmin — Group Chat Track C: roles, kicks, edits, invite redemption
 *
 * Wraps RLS-aware writes against `chat_group_members`, `chat_groups`,
 * `chat_group_invites` and the `redeem_group_invite` RPC. All errors surface
 * via toast so callers can simply `await` and react to a boolean result.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type GroupRole = "owner" | "admin" | "member";

export interface GroupMemberRow {
  user_id: string;
  group_id: string;
  role: GroupRole;
  nickname: string | null;
  muted_until: string | null;
  joined_at: string;
}

export interface GroupInviteRow {
  id: string;
  group_id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
}

export function useGroupAdmin(groupId: string | null) {
  const { user } = useAuth();
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [invites, setInvites] = useState<GroupInviteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId || !user?.id) return;
    setLoading(true);
    const [{ data: m }, { data: i }] = await Promise.all([
      (supabase as any).from("chat_group_members").select("*").eq("group_id", groupId),
      (supabase as any).from("chat_group_invites").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
    ]);
    setMembers((m || []) as GroupMemberRow[]);
    setInvites((i || []) as GroupInviteRow[]);
    const me = (m || []).find((row: GroupMemberRow) => row.user_id === user.id);
    setMyRole((me?.role as GroupRole) ?? null);
    setLoading(false);
  }, [groupId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const isAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const setRole = useCallback(async (targetUserId: string, role: GroupRole) => {
    if (!groupId) return false;
    const { error } = await (supabase as any)
      .from("chat_group_members")
      .update({ role })
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);
    if (error) { toast.error(error.message || "Could not update role"); return false; }
    toast.success(`Role updated to ${role}`);
    await refresh();
    return true;
  }, [groupId, refresh]);

  const kick = useCallback(async (targetUserId: string) => {
    if (!groupId) return false;
    const { error } = await (supabase as any)
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);
    if (error) { toast.error(error.message || "Could not remove member"); return false; }
    toast.success("Member removed");
    await refresh();
    return true;
  }, [groupId, refresh]);

  const muteUntil = useCallback(async (targetUserId: string, until: Date | null) => {
    if (!groupId) return false;
    const { error } = await (supabase as any)
      .from("chat_group_members")
      .update({ muted_until: until ? until.toISOString() : null })
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);
    if (error) { toast.error(error.message || "Could not mute member"); return false; }
    toast.success(until ? `Member muted until ${until.toLocaleString()}` : "Member unmuted");
    await refresh();
    return true;
  }, [groupId, refresh]);

  const leave = useCallback(async () => {
    if (!groupId || !user?.id) return false;
    const { error } = await (supabase as any)
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    if (error) { toast.error("Could not leave group"); return false; }
    toast.success("Left group");
    return true;
  }, [groupId, user?.id]);

  const updateGroupMeta = useCallback(async (patch: { name?: string; avatar_url?: string | null }) => {
    if (!groupId) return false;
    const { error } = await (supabase as any).from("chat_groups").update(patch).eq("id", groupId);
    if (error) { toast.error(error.message || "Could not update group"); return false; }
    toast.success("Group updated");
    return true;
  }, [groupId]);

  const createInvite = useCallback(async (opts?: { expiresInHours?: number; maxUses?: number }) => {
    if (!groupId || !user?.id) return null;
    // Short, URL-safe code (10 chars from a safe alphabet)
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 10 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
    const expires_at = opts?.expiresInHours
      ? new Date(Date.now() + opts.expiresInHours * 3600_000).toISOString()
      : null;
    const { data, error } = await (supabase as any)
      .from("chat_group_invites")
      .insert({
        group_id: groupId,
        code,
        created_by: user.id,
        expires_at,
        max_uses: opts?.maxUses ?? null,
      })
      .select()
      .single();
    if (error) { toast.error(error.message || "Could not create invite"); return null; }
    await refresh();
    return data as GroupInviteRow;
  }, [groupId, user?.id, refresh]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    const { error } = await (supabase as any)
      .from("chat_group_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inviteId);
    if (error) { toast.error("Could not revoke invite"); return false; }
    toast.success("Invite revoked");
    await refresh();
    return true;
  }, [refresh]);

  return {
    myRole, isAdmin, isOwner,
    members, invites, loading,
    refresh, setRole, kick, muteUntil, leave,
    updateGroupMeta, createInvite, revokeInvite,
  };
}

export async function redeemGroupInvite(code: string): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("redeem_group_invite", { _code: code });
  if (error) {
    toast.error(error.message || "Could not redeem invite");
    return null;
  }
  return (data as string) || null;
}
