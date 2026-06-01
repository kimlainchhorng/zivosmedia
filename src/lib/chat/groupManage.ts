import { supabase } from "@/integrations/supabase/client";

export type GroupRole = "owner" | "admin" | "member";

export type GroupManageResult<T = unknown> = {
  ok?: boolean;
  group?: T;
  member?: T;
  invite?: T;
  added?: number;
  error?: string;
};

type InvokeBody = Record<string, unknown> & { action: string };

async function invokeGroupManage<T = unknown>(body: InvokeBody) {
  return supabase.functions.invoke<GroupManageResult<T>>("chat-group-manage", { body });
}

export function createGroup(payload: { name: string; member_ids: string[] }) {
  return invokeGroupManage<{ id: string; name: string; avatar_url?: string | null }>({
    action: "create_group",
    ...payload,
  });
}

export function updateGroup(payload: { group_id: string; name?: string; avatar_url?: string | null }) {
  return invokeGroupManage<{ id: string; name: string; avatar_url?: string | null }>({
    action: "update_group",
    ...payload,
  });
}

export function addGroupMembers(payload: { group_id: string; member_ids: string[] }) {
  return invokeGroupManage({ action: "add_members", ...payload });
}

export function removeGroupMember(payload: { group_id: string; user_id: string }) {
  return invokeGroupManage({ action: "remove_member", ...payload });
}

export function leaveGroup(payload: { group_id: string }) {
  return invokeGroupManage({ action: "leave_group", ...payload });
}

export function setGroupMemberRole(payload: { group_id: string; user_id: string; role: GroupRole }) {
  return invokeGroupManage({ action: "set_member_role", ...payload });
}

export function muteGroupMember(payload: { group_id: string; user_id: string; muted_until: string | null }) {
  return invokeGroupManage({ action: "mute_member", ...payload });
}

export function createGroupInvite(payload: { group_id: string; expires_in_hours?: number; max_uses?: number }) {
  return invokeGroupManage({
    action: "create_invite",
    ...payload,
  });
}

export function revokeGroupInvite(payload: { invite_id: string }) {
  return invokeGroupManage({ action: "revoke_invite", ...payload });
}
