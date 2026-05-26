import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export interface MemberRow {
  user_id: string;
  role: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Props {
  member: MemberRow;
  isOwnerView: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
}

export function ChannelMemberRow({ member, isOwnerView, onPromote, onDemote, onRemove }: Props) {
  const initials = (member.display_name ?? "U").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">{member.display_name ?? "Subscriber"}</div>
          <Badge variant={member.role === "owner" ? "default" : "secondary"} className="mt-1 text-[10px]">
            {member.role}
          </Badge>
        </div>
      </div>
      {isOwnerView && member.role !== "owner" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {member.role === "subscriber" && (
              <DropdownMenuItem onClick={onPromote}>Make admin</DropdownMenuItem>
            )}
            {member.role === "admin" && (
              <DropdownMenuItem onClick={onDemote}>Remove admin</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              Remove from channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
