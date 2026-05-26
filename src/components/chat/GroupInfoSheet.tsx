import { type ChangeEvent, type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Camera from "lucide-react/dist/esm/icons/camera";
import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import FileText from "lucide-react/dist/esm/icons/file-text";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Phone from "lucide-react/dist/esm/icons/phone";
import Search from "lucide-react/dist/esm/icons/search";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import Users from "lucide-react/dist/esm/icons/users";
import Video from "lucide-react/dist/esm/icons/video";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import X from "lucide-react/dist/esm/icons/x";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupAdmin, type GroupMemberRow, type GroupRole } from "@/hooks/useGroupAdmin";
import { useSignedMedia } from "@/hooks/useSignedMedia";

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface FriendLite {
  id: string;
  name: string;
  avatar: string | null;
}

interface FriendshipRow {
  user_id: string;
  friend_id: string;
}

interface GroupInfoMessage {
  id: string;
  message: string;
  message_type: string;
  image_url: string | null;
  video_url?: string | null;
  created_at: string;
  file_payload?: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupAvatar?: string | null;
  membersCount: number;
  messages: GroupInfoMessage[];
  muted: boolean;
  onToggleMute: () => void;
  onSearch: () => void;
  onOpenInvites: () => void;
  onStartCall: (kind: "audio" | "video") => void;
  onGroupUpdated: (patch: { name?: string; avatar?: string | null }) => void;
  onMembersChanged: () => void;
  onLeft: () => void;
}

const CHAT_MEDIA_BUCKET = "chat-media-files";
const MAX_GROUP_NAME = 80;
const LINK_RE = /https?:\/\/[^\s<>"')]+/gi;

function initialsFor(name: string) {
  return (name || "G")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleLabel(role: GroupRole) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function getFileLabel(message: GroupInfoMessage) {
  const payload = message.file_payload as { name?: string; fileName?: string; title?: string } | null;
  return payload?.name || payload?.fileName || payload?.title || message.message || "Attachment";
}

export default function GroupInfoSheet({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupAvatar,
  membersCount,
  messages,
  muted,
  onToggleMute,
  onSearch,
  onOpenInvites,
  onStartCall,
  onGroupUpdated,
  onMembersChanged,
  onLeft,
}: Props) {
  const { user } = useAuth();
  const { members, isAdmin, loading, refresh, updateGroupMeta, leave } = useGroupAdmin(groupId);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [tab, setTab] = useState<"members" | "media" | "links" | "files">("members");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(groupName);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [addingMembers, setAddingMembers] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarSrc = useSignedMedia(groupAvatar, CHAT_MEDIA_BUCKET, "thumbnail");

  useEffect(() => {
    if (open) {
      setDraftName(groupName);
      return;
    }
    setEditingName(false);
    setShowAddMembers(false);
    setFriendSearch("");
    setSelectedFriends(new Set());
    setFriends([]);
  }, [groupName, open]);

  useEffect(() => {
    if (!open || members.length === 0) return;
    (async () => {
      const ids = members.map((member) => member.user_id);
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", ids);
      const next: Record<string, ProfileLite> = {};
      for (const profile of (data || []) as ProfileLite[]) {
        next[profile.user_id] = profile;
      }
      setProfiles(next);
    })();
  }, [members, open]);

  useEffect(() => {
    if (!showAddMembers || !user?.id) return;
    (async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");
      const currentMemberIds = new Set(members.map((member) => member.user_id));
      const friendIds = Array.from(
        new Set(
          ((friendships || []) as FriendshipRow[])
            .map((friendship) => (friendship.user_id === user.id ? friendship.friend_id : friendship.user_id))
            .filter((id) => id && !currentMemberIds.has(id)),
        ),
      );
      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", friendIds);
      setFriends(
        ((profileRows || []) as Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>)
          .map((profile) => ({
            id: profile.user_id,
            name: profile.full_name || "User",
            avatar: profile.avatar_url || null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    })();
  }, [members, showAddMembers, user?.id]);

  const sortedMembers: GroupMemberRow[] = useMemo(() => {
    const order: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };
    return [...members].sort((a, b) => order[a.role] - order[b.role]);
  }, [members]);

  const mediaMessages = useMemo(
    () => messages.filter((message) => message.image_url || message.video_url || message.message_type === "image" || message.message_type === "video"),
    [messages],
  );

  const linkMessages = useMemo(() => {
    return messages.flatMap((message) => {
      const links = message.message?.match(LINK_RE) || [];
      return links.map((url) => ({ id: `${message.id}-${url}`, url, created_at: message.created_at }));
    });
  }, [messages]);

  const fileMessages = useMemo(
    () => messages.filter((message) => message.message_type === "file" || message.message_type === "document"),
    [messages],
  );

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => friend.name.toLowerCase().includes(q));
  }, [friendSearch, friends]);

  const activeMemberCount = members.length || membersCount;
  const initials = initialsFor(groupName);

  const handleSaveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      toast.error("Group name is required");
      return;
    }
    if (nextName === groupName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const ok = await updateGroupMeta({ name: nextName });
    setSavingName(false);
    if (ok) {
      onGroupUpdated({ name: nextName });
      setEditingName(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image for the group photo");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Group photo must be under 8MB");
      return;
    }
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const path = `${user.id}/group-avatars/${groupId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const ok = await updateGroupMeta({ avatar_url: path });
      if (ok) onGroupUpdated({ avatar: path });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update group photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleSelectedFriend = (id: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (selectedFriends.size === 0) return;
    setAddingMembers(true);
    const rows = Array.from(selectedFriends).map((memberId) => ({
      group_id: groupId,
      user_id: memberId,
      role: "member",
    }));
    const { error } = await (supabase as any).from("chat_group_members").insert(rows);
    setAddingMembers(false);
    if (error) {
      toast.error(error.message || "Could not add members");
      return;
    }
    toast.success(selectedFriends.size === 1 ? "Member added" : "Members added");
    setSelectedFriends(new Set());
    setShowAddMembers(false);
    await refresh();
    onMembersChanged();
  };

  const handleLeave = async () => {
    const ok = await leave();
    if (ok) {
      onOpenChange(false);
      onLeft();
    }
  };

  const copyGroupLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/chat?group=${groupId}`);
      toast.success("Group link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const tabs = [
    { id: "members" as const, label: "Members", count: activeMemberCount },
    { id: "media" as const, label: "Media", count: mediaMessages.length },
    { id: "links" as const, label: "Links", count: linkMessages.length },
    { id: "files" as const, label: "Files", count: fileMessages.length },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="z-[1600] flex w-full flex-col overflow-hidden px-0 pb-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Group info</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-end px-3 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted active:bg-muted/80"
              aria-label="Close group info"
              title="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="px-5 pb-5 pt-1">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-1 ring-border/50">
                  <AvatarImage src={groupAvatarSrc || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-xl font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 disabled:opacity-50"
                      aria-label="Change group photo"
                      title="Change group photo"
                    >
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 w-full">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value.slice(0, MAX_GROUP_NAME))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleSaveName();
                        if (event.key === "Escape") setEditingName(false);
                      }}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/30 px-3 text-center text-base font-semibold outline-none focus:ring-2 focus:ring-primary/25"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                      aria-label="Save group name"
                      title="Save group name"
                    >
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(groupName);
                        setEditingName(false);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground"
                      aria-label="Cancel edit"
                      title="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="truncate text-xl font-bold text-foreground">{groupName}</h2>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                        aria-label="Edit group name"
                        title="Edit group name"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeMemberCount} member{activeMemberCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <button type="button" onClick={() => onStartCall("audio")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/40 px-2 py-3 active:scale-95">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-[11px] font-semibold">Audio</span>
              </button>
              <button type="button" onClick={() => onStartCall("video")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/40 px-2 py-3 active:scale-95">
                <Video className="h-5 w-5 text-primary" />
                <span className="text-[11px] font-semibold">Video</span>
              </button>
              <button type="button" onClick={onSearch} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/40 px-2 py-3 active:scale-95">
                <Search className="h-5 w-5 text-primary" />
                <span className="text-[11px] font-semibold">Search</span>
              </button>
              <button type="button" onClick={onToggleMute} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/40 px-2 py-3 active:scale-95">
                {muted ? <VolumeX className="h-5 w-5 text-primary" /> : <Volume2 className="h-5 w-5 text-primary" />}
                <span className="text-[11px] font-semibold">{muted ? "Muted" : "Mute"}</span>
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              <button type="button" onClick={onOpenInvites} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3 text-left active:scale-[0.99]">
                <Link2 className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Invite links</p>
                  <p className="truncate text-xs text-muted-foreground">Create, copy, or revoke group links</p>
                </div>
              </button>
              <button type="button" onClick={copyGroupLink} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3 text-left active:scale-[0.99]">
                <Copy className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Copy group shortcut</p>
                  <p className="truncate text-xs text-muted-foreground">Open this group from ZIVO chat</p>
                </div>
              </button>
            </div>
          </div>

          <div className="sticky top-0 z-10 border-y border-border/30 bg-background/95 px-4 py-2 backdrop-blur-xl">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === item.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {item.label}
                  {item.count > 0 && <span className="ml-1 opacity-80">{item.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3">
            {tab === "members" && (
              <div className="space-y-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddMembers((next) => !next)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-primary/10 px-3 py-3 text-left text-primary active:scale-[0.99]"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span className="text-sm font-semibold">Add members</span>
                  </button>
                )}

                {showAddMembers && (
                  <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={friendSearch}
                        onChange={(event) => setFriendSearch(event.target.value)}
                        placeholder="Search friends"
                        className="h-10 w-full rounded-xl border border-border/40 bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredFriends.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No friends to add</p>
                      ) : (
                        filteredFriends.map((friend) => {
                          const selected = selectedFriends.has(friend.id);
                          return (
                            <button
                              type="button"
                              key={friend.id}
                              onClick={() => toggleSelectedFriend(friend.id)}
                              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/50"
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={friend.avatar || undefined} />
                                <AvatarFallback>{friend.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">{friend.name}</span>
                              <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                                {selected && <Check className="h-3 w-3" />}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <Button className="mt-3 w-full" disabled={selectedFriends.size === 0 || addingMembers} onClick={handleAddMembers}>
                      {addingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Add {selectedFriends.size || ""} member{selectedFriends.size === 1 ? "" : "s"}
                    </Button>
                  </div>
                )}

                {loading && sortedMembers.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  sortedMembers.map((member) => {
                    const profile = profiles[member.user_id];
                    const name = profile?.full_name || profile?.username || "Member";
                    return (
                      <div key={member.user_id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {name}{member.user_id === user?.id ? " (you)" : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {profile?.username ? `@${profile.username} - ` : ""}{roleLabel(member.role)}
                          </p>
                        </div>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "media" && (
              mediaMessages.length === 0 ? (
                <EmptyState icon={ImageIcon} label="No shared media yet" />
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaMessages.map((message) => (
                    <GroupMediaTile key={message.id} message={message} />
                  ))}
                </div>
              )
            )}

            {tab === "links" && (
              linkMessages.length === 0 ? (
                <EmptyState icon={Link2} label="No links shared yet" />
              ) : (
                <div className="space-y-2">
                  {linkMessages.map((item) => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3">
                      <Link2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.url.replace(/^https?:\/\//i, "")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )
            )}

            {tab === "files" && (
              fileMessages.length === 0 ? (
                <EmptyState icon={FileText} label="No files shared yet" />
              ) : (
                <div className="space-y-2">
                  {fileMessages.map((message) => (
                    <div key={message.id} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{getFileLabel(message)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(message.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        <div className="border-t border-border/30 p-4 pb-[max(1rem,var(--zivo-safe-bottom,0px))]">
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleLeave}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-70" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function GroupMediaTile({ message }: { message: GroupInfoMessage }) {
  const rawSrc = message.image_url || message.video_url || "";
  const resolvedSrc = useSignedMedia(rawSrc, CHAT_MEDIA_BUCKET, message.video_url ? "display" : "thumbnail");

  return (
    <a href={resolvedSrc || undefined} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-muted">
      {message.video_url ? (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <Video className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : resolvedSrc ? (
        <img src={resolvedSrc} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <ImageIcon className="m-auto h-6 w-6 text-muted-foreground" />
      )}
    </a>
  );
}
