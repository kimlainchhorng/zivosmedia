import { useState } from "react";
import { 
  Users, 
  Link2,
  Mail,
  MessageCircle,
  Copy,
  Check,
  QrCode,
  UserPlus,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SharedUser {
  id: string;
  name: string;
  email: string;
  access: "view" | "edit";
  avatar?: string;
}

interface TripSharingWidgetProps {
  className?: string;
  tripName?: string;
  tripId?: string;
  shareLink?: string;
  sharedUsers?: SharedUser[];
  onInvite?: (email: string) => void;
  onShare?: (method: "email" | "message" | "copy" | "qr") => void;
  onRemoveUser?: (userId: string) => void;
  onChangeAccess?: (userId: string, access: "view" | "edit") => void;
}

const TripSharingWidget = ({ 
  className, 
  tripName = "Paris Adventure",
  tripId = "paris-abc123",
  shareLink,
  sharedUsers = [],
  onInvite,
  onShare,
  onRemoveUser,
  onChangeAccess
}: TripSharingWidgetProps) => {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const generatedLink = shareLink || `zivo.app/trip/${tripId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${generatedLink}`);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
    onShare?.("copy");
  };

  const handleInvite = () => {
    if (inviteEmail) {
      onInvite?.(inviteEmail);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    }
  };

  const handleShareMethod = (method: "email" | "message" | "copy" | "qr") => {
    if (method === "copy") {
      handleCopy();
    } else {
      onShare?.(method);
      toast.success(`Opening ${method} share...`);
    }
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Share Trip</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {sharedUsers.length} collaborator{sharedUsers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Trip Name */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <p className="text-xs text-muted-foreground">Sharing</p>
        <p className="font-medium">{tripName}</p>
      </div>

      {/* Invite by Email */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Invite by email</p>
        <div className="flex gap-2">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address"
            className="text-sm h-9"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Button size="sm" onClick={handleInvite} disabled={!inviteEmail}>
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Share Link */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Or share link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-xs text-muted-foreground truncate">
            {generatedLink}
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Share */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: Mail, label: "Email", method: "email" as const },
          { icon: MessageCircle, label: "Message", method: "message" as const },
          { icon: Link2, label: "Copy", method: "copy" as const },
          { icon: QrCode, label: "QR", method: "qr" as const },
        ].map((option) => {
          const Icon = option.icon;
          return (
            <button type="button"
              key={option.label}
              onClick={() => handleShareMethod(option.method)}
              className="p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center gap-1"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px]">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Shared With */}
      {sharedUsers.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Shared with</p>
          <div className="space-y-2">
            {sharedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium">{user.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {user.access === "edit" ? (
                    <>Can edit</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> View</>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedUsers.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No collaborators yet. Invite someone to share this trip!</p>
        </div>
      )}
    </div>
  );
};

export default TripSharingWidget;
