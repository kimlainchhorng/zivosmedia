/**
 * GroupMembersSheet — Member roster with admin actions (promote, demote, kick).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Users from "lucide-react/dist/esm/icons/users";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical";
import Crown from "lucide-react/dist/esm/icons/crown";
import Shield from "lucide-react/dist/esm/icons/shield";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import { DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useGroupAdmin, type GroupMemberRow, type GroupRole } from "@/hooks/useGroupAdmin";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onLeft?: () => void;
}

const roleBadge = (role: GroupRole) => {
  if (role === "owner")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <Crown className="w-3 h-3" /> Owner
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  return null;
};

export default function GroupMembersSheet({ open, onOpenChange, groupId, onLeft }: Props) {
  const { user } = useAuth();
  const { members, isAdmin, isOwner, setRole, kick, muteUntil, leave } = useGroupAdmin(groupId);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});

  useEffect(() => {
    if (!open || members.length === 0) return;
    (async () => {
      const ids = members.map((m) => m.user_id);
      const { data } = await (supabase as any)
        .from("profiles" as any)
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", ids);
      const map: Record<string, ProfileLite> = {};
      for (const p of (data || []) as ProfileLite[]) map[p.user_id] = p;
      setProfiles(map);
    })();
  }, [open, members]);

  const sorted: GroupMemberRow[] = [...members].sort((a, b) => {
    const order: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  const handleLeave = () => {
    toast("Leave this group?", {
      description: "You won't receive new messages from this group.",
      action: {
        label: "Leave",
        onClick: async () => {
          const ok = await leave();
          if (ok) {
            onOpenChange(false);
            onLeft?.();
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Users className="w-5 h-5" /> {members.length} members
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex-1 overflow-y-auto space-y-1">
          {sorted.map((m) => {
            const p = profiles[m.user_id];
            const name = p?.full_name || p?.username || "Member";
            const isMe = m.user_id === user?.id;
            const canManage = isAdmin && !isMe && m.role !== "owner";
            const isMuted = m.muted_until && new Date(m.muted_until) > new Date();
            return (
              <div
                key={m.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={p?.avatar_url ?? undefined} />
                  <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {name}{isMe ? " (you)" : ""}
                    </span>
                    {roleBadge(m.role)}
                    {isMuted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <BellOff className="w-2.5 h-2.5" /> Muted
                      </span>
                    )}
                  </div>
                  {p?.username && (
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                  )}
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-1.5 rounded-md hover:bg-muted" aria-label="Member actions">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.role === "member" && (
                        <DropdownMenuItem onClick={() => setRole(m.user_id, "admin")}>
                          <Shield className="w-4 h-4 mr-2" /> Promote to admin
                        </DropdownMenuItem>
                      )}
                      {m.role === "admin" && isAdmin && (
                        <DropdownMenuItem onClick={() => setRole(m.user_id, "member")}>
                          <Shield className="w-4 h-4 mr-2" /> Demote to member
                        </DropdownMenuItem>
                      )}
                      {isOwner && m.role !== "owner" && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Transfer ownership to ${name}? You'll become an admin.`)) {
                              setRole(m.user_id, "owner").then(async (ok) => {
                                if (ok && user?.id) await setRole(user.id, "admin");
                              });
                            }
                          }}
                        >
                          <Crown className="w-4 h-4 mr-2" /> Transfer ownership
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {isMuted ? (
                        <DropdownMenuItem onClick={() => muteUntil(m.user_id, null)}>
                          <Bell className="w-4 h-4 mr-2" /> Unmute member
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <BellOff className="w-4 h-4 mr-2" /> Mute member
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {[
                              { label: "1 hour", ms: 3600_000 },
                              { label: "8 hours", ms: 8 * 3600_000 },
                              { label: "24 hours", ms: 24 * 3600_000 },
                              { label: "1 week", ms: 7 * 24 * 3600_000 },
                              { label: "Indefinitely", ms: 100 * 365 * 24 * 3600_000 },
                            ].map(({ label, ms }) => (
                              <DropdownMenuItem key={label} onClick={() => muteUntil(m.user_id, new Date(Date.now() + ms))}>
                                {label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (confirm(`Remove ${name} from group?`)) kick(m.user_id);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" /> Remove from group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="mt-3 text-destructive hover:text-destructive"
          onClick={handleLeave}
        >
          <LogOut className="w-4 h-4 mr-2" /> Leave group
        </Button>
      </SheetContent>
    </Sheet>
  );
}
