import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Link2,
  Users,
  Lock,
  Globe,
  UserPlus,
  Check,
  QrCode,
  Download,
  Facebook,
  Twitter,
  Send,
  Eye,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TripSharingProps {
  tripId?: string;
  tripName?: string;
  className?: string;
}

interface SharedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted';
}

// Shared users loaded from real data — no hardcoded entries

export const TripSharing = ({
  tripId = "ZIVO-XYZ789",
  tripName = "London Adventure",
  className
}: TripSharingProps) => {
  const [shareLink, setShareLink] = useState(`https://zivo.app/trip/${tripId}`);
  const [linkCopied, setLinkCopied] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'link' | 'public'>('private');
  const [inviteEmail, setInviteEmail] = useState("");
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit'>('view');
  const [showQr, setShowQr] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const sendInvite = () => {
    if (!inviteEmail) return;
    
    const newUser: SharedUser = {
      id: Math.random().toString(36).substring(2, 9),
      email: inviteEmail,
      name: inviteEmail.split('@')[0],
      permission: invitePermission,
      status: 'pending'
    };
    
    setSharedUsers([...sharedUsers, newUser]);
    setInviteEmail("");
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const removeUser = (userId: string) => {
    setSharedUsers(sharedUsers.filter(u => u.id !== userId));
    toast.success("User removed from trip");
  };

  const updatePermission = (userId: string, permission: 'view' | 'edit') => {
    setSharedUsers(sharedUsers.map(u => 
      u.id === userId ? { ...u, permission } : u
    ));
  };

  const shareVia = (platform: string) => {
    const text = `Check out my trip: ${tripName}`;
    const url = shareLink;
    
    let shareUrl = '';
    switch (platform) {
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(tripName)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(shareUrl));
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center bg-secondary">
              <Share2 className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Share Trip</CardTitle>
              <p className="text-sm text-muted-foreground">{tripName}</p>
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/50">
            {[
              { value: 'private', icon: Lock, label: 'Private' },
              { value: 'link', icon: Link2, label: 'Link' },
              { value: 'public', icon: Globe, label: 'Public' },
            ].map(option => (
              <button type="button"
                key={option.value}
                onClick={() => setVisibility(option.value as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all",
                  visibility === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <option.icon className="w-3.5 h-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Share Link */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Share Link</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={shareLink}
                readOnly
                className="pl-10 pr-20 bg-muted/50"
              />
              <Button
                size="sm"
                variant={linkCopied ? "default" : "ghost"}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={copyLink}
              >
                {linkCopied ? (
                  <><Check className="w-3 h-3 mr-1" /> Copied</>
                ) : (
                  <><Copy className="w-3 h-3 mr-1" /> Copy</>
                )}
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              aria-label="Generate QR code"
              onClick={() => setShowQr(prev => !prev)}
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>

          {/* QR Code Display */}
          <div className="flex items-center justify-center p-4 rounded-xl bg-white">
            {showQr ? (
	              <img src={qrUrl} alt="QR code for trip link" className="w-[180px] h-[180px] rounded-xl" loading="lazy" decoding="async" />
            ) : (
              <div className="w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer bg-secondary" onClick={() => setShowQr(true)}>
                <QrCode className="w-16 h-16 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Share Via */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Share via</label>
          <div className="flex items-center gap-2">
            {[
              { id: 'email', icon: Mail, color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
              { id: 'whatsapp', icon: MessageCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
              { id: 'twitter', icon: Twitter, color: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
              { id: 'facebook', icon: Facebook, color: 'bg-blue-600/20 text-blue-400 border-blue-600/40' },
            ].map(platform => (
              <motion.button
                key={platform.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => shareVia(platform.id)}
                className={cn(
                  "w-12 h-12 rounded-xl border flex items-center justify-center transition-colors",
                  platform.color
                )}
              >
                <platform.icon className="w-5 h-5" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Invite by Email */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Invite People</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
              <button type="button"
                onClick={() => setInvitePermission('view')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1",
                  invitePermission === 'view'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button type="button"
                onClick={() => setInvitePermission('edit')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1",
                  invitePermission === 'edit'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            </div>
            <Button onClick={sendInvite} disabled={!inviteEmail}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Shared With */}
        {sharedUsers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Shared with</label>
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {sharedUsers.length} people
              </Badge>
            </div>
            
            <div className="space-y-2">
              {sharedUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-primary-foreground bg-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {user.status === 'pending' && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/40">
                        Pending
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
                      <button type="button"
                        onClick={() => updatePermission(user.id, 'view')}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-all",
                          user.permission === 'view'
                            ? "bg-card text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        View
                      </button>
                      <button type="button"
                        onClick={() => updatePermission(user.id, 'edit')}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-all",
                          user.permission === 'edit'
                            ? "bg-card text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        Edit
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove user"
                      className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                      onClick={() => removeUser(user.id)}
                    >
                      ×
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Export Itinerary</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripSharing;
