import { Share2, Copy, Facebook, Twitter, Mail, MessageCircle, Link, Check, Users, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

const shareOptions = [
  { id: "copy", icon: Link, label: "Copy Link", color: "text-muted-foreground" },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", color: "text-green-500" },
  { id: "facebook", icon: Facebook, label: "Facebook", color: "text-blue-500" },
  { id: "twitter", icon: Twitter, label: "Twitter", color: "text-sky-400" },
  { id: "email", icon: Mail, label: "Email", color: "text-orange-400" },
];

const FlightSocialShare = () => {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const handleShare = (platform: string) => {
    if (platform === "copy") {
      navigator.clipboard.writeText(`${getPublicOrigin()}${window.location.pathname}${window.location.search}`);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.success(`Opening ${platform}...`);
    }
  };

  const handleInvite = () => {
    if (inviteEmail) {
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden via-card/50 border border-border rounded-3xl p-8 bg-secondary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary blur-3xl rounded-full" />

          <div className="relative z-10">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-secondary text-foreground border-border">
                <Share2 className="w-3 h-3 mr-1" /> Share & Invite
              </Badge>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                Travel Together
              </h2>
              <p className="text-muted-foreground">
                Share your trip with friends and family
              </p>
            </div>

            {/* Share Options */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {shareOptions.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  onClick={() => handleShare(option.id)}
                  className="flex items-center gap-2"
                >
                  {copied && option.id === "copy" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <option.icon className={`w-4 h-4 ${option.color}`} />
                  )}
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Invite Travel Companion */}
            <div className="bg-card/60 backdrop-blur-xl rounded-xl p-6 border border-border/30 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold">Invite Travel Companions</h3>
                  <p className="text-xs text-muted-foreground">Send trip details to co-travelers</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 h-11 px-4 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <Button onClick={handleInvite} className="bg-foreground hover:bg-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>

            {/* Trip Link Preview */}
            <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-dashed border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-teal-400 rounded-xl flex items-center justify-center">
                  <Plane className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">ZIVO Flight Trip</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {`${getPublicOrigin()}${window.location.pathname}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSocialShare;
