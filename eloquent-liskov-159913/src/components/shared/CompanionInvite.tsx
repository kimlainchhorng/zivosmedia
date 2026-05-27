import { useState } from "react";
import { 
  Users, 
  Mail, 
  Copy, 
  Check, 
  Share2,
  UserPlus,
  Link,
  MessageSquare,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Companion {
  id: string;
  name: string;
  email: string;
  status: "pending" | "accepted" | "declined";
  avatar?: string;
}

interface CompanionInviteProps {
  tripName?: string;
  className?: string;
}

const INITIAL_COMPANIONS: Companion[] = [];

const CompanionInvite = ({ tripName = "Paris Trip", className }: CompanionInviteProps) => {
  const [companions, setCompanions] = useState<Companion[]>(INITIAL_COMPANIONS);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const shareLink = "https://zivo.app/trip/abc123";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = () => {
    if (!email.trim()) return;
    
    const newCompanion: Companion = {
      id: Date.now().toString(),
      name: email.split("@")[0],
      email: email.trim(),
      status: "pending",
    };
    
    setCompanions(prev => [...prev, newCompanion]);
    setEmail("");
    setShowInviteForm(false);
    toast.success(`Invitation sent to ${email}`);
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions(prev => prev.filter(c => c.id !== id));
    toast.success("Companion removed");
  };

  const statusColors = {
    pending: "bg-amber-500/10 text-amber-500",
    accepted: "bg-emerald-500/10 text-emerald-500",
    declined: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Travel Companions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Share {tripName} with friends
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {companions.filter(c => c.status === "accepted").length + 1} travelers
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Companions List */}
        <div className="space-y-2">
          {/* You (organizer) */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/20">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                You
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">You</p>
              <p className="text-xs text-muted-foreground">Organizer</p>
            </div>
            <Badge className="bg-primary text-primary-foreground text-xs">
              Host
            </Badge>
          </div>

          {/* Invited Companions */}
          {companions.map((companion) => (
            <div
              key={companion.id}
              className="flex items-center gap-3 p-2 rounded-xl bg-muted/30"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {companion.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{companion.name}</p>
                <p className="text-xs text-muted-foreground truncate">{companion.email}</p>
              </div>
              <Badge className={cn("text-xs", statusColors[companion.status])}>
                {companion.status}
              </Badge>
              <button type="button"
                onClick={() => handleRemoveCompanion(companion.id)}
                className="p-1 rounded hover:bg-destructive/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>

        {/* Invite Form */}
        {showInviteForm ? (
          <div className="space-y-2 p-3 rounded-xl bg-muted/30">
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              />
              <Button size="sm" onClick={handleSendInvite}>
                <Mail className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowInviteForm(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowInviteForm(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite by Email
          </Button>
        )}

        {/* Share Link */}
        <div className="p-3 rounded-xl bg-muted/30 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Or share link:</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-background border text-sm">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{shareLink}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy invite link"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Share */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Share2 className="w-4 h-4 mr-1" />
            More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanionInvite;
