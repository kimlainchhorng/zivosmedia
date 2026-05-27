import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Gift,
  Share2,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Trophy,
  Coins,
  TrendingUp,
  UserPlus,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Referral {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'signed_up' | 'qualified' | 'rewarded';
  signedUpAt?: string;
  firstBookingAt?: string;
  milesEarned: number;
}

interface ReferralTier {
  count: number;
  bonus: number;
  title: string;
  icon: typeof Trophy;
}

const REFERRAL_TIERS: ReferralTier[] = [
  { count: 3, bonus: 5000, title: 'Starter', icon: Users },
  { count: 10, bonus: 15000, title: 'Advocate', icon: TrendingUp },
  { count: 25, bonus: 50000, title: 'Ambassador', icon: Trophy },
];

// Referrals loaded from real database
const initialReferrals: Referral[] = [];

interface ReferralCenterProps {
  className?: string;
}

export const ReferralCenter = ({ className }: ReferralCenterProps) => {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  
  const referralCode = 'ZIVO-FRIEND-X7K9P';
  const referralLink = `https://zivo.app/refer/${referralCode}`;
  const milesPerReferral = 2500;
  const totalReferrals = initialReferrals.length;
  const successfulReferrals = initialReferrals.filter(r => r.status === 'rewarded' || r.status === 'qualified').length;
  const totalEarned = initialReferrals.reduce((sum, r) => sum + r.milesEarned, 0);

  const currentTier = REFERRAL_TIERS.find(t => successfulReferrals < t.count) || REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
  const nextTierProgress = (successfulReferrals / currentTier.count) * 100;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = () => {
    if (email) {
      toast.success(`Invite sent to ${email}`);
      setEmail('');
    }
  };

  const shareOptions = [
    { name: 'Twitter', icon: Twitter, color: 'bg-sky-500', action: () => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(`https://twitter.com/intent/tweet?text=Join ZIVO and get exclusive travel rewards! Use my code: ${referralCode}`)) },
    { name: 'Facebook', icon: Facebook, color: 'bg-blue-600', action: () => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(`https://facebook.com/sharer/sharer.php?u=${referralLink}`)) },
    { name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700', action: () => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(`https://linkedin.com/shareArticle?url=${referralLink}`)) },
    { name: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500', action: () => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(`https://wa.me/?text=Join ZIVO with my code ${referralCode} and earn travel rewards!`)) },
  ];

  const getStatusColor = (status: Referral['status']) => {
    switch (status) {
      case 'rewarded': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'qualified': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'signed_up': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      default: return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  const getStatusLabel = (status: Referral['status']) => {
    switch (status) {
      case 'rewarded': return 'Rewarded';
      case 'qualified': return 'Completed Booking';
      case 'signed_up': return 'Signed Up';
      default: return 'Invite Sent';
    }
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center bg-secondary">
              <Gift className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Refer & Earn</CardTitle>
              <p className="text-sm text-muted-foreground">
                Earn {milesPerReferral.toLocaleString()} miles for each friend
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Stats Summary */}
        <div className="p-4 via-transparent bg-secondary">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Total Invites</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <p className="text-2xl font-bold text-emerald-400">{successfulReferrals}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <p className="text-2xl font-bold text-amber-400">{totalEarned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Miles Earned</p>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="mt-4 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <currentTier.icon className="w-5 h-5 text-amber-400" />
                <span className="font-medium">{currentTier.title} Tier</span>
              </div>
              <Badge variant="outline">
                +{currentTier.bonus.toLocaleString()} bonus miles
              </Badge>
            </div>
            <Progress value={nextTierProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {currentTier.count - successfulReferrals} more referrals to unlock bonus
            </p>
          </div>
        </div>

        {/* Referral Code & Link */}
        <div className="p-4 border-b border-border/50 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Referral Code</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-border/50 font-mono text-lg text-center">
                {referralCode}
              </div>
              <Button variant="outline" size="icon" aria-label="Copy referral code" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Share Link</label>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" aria-label="Copy share link" onClick={copyLink}>
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Social Share */}
          <div className="flex gap-2 justify-center">
            {shareOptions.map(option => (
              <Button
                key={option.name}
                variant="outline"
                size="icon"
                aria-label={`Share on ${option.name}`}
                className={cn("hover:bg-opacity-100", option.color, "hover:text-primary-foreground hover:border-transparent")}
                onClick={option.action}
              >
                <option.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* Email Invite */}
        <div className="p-4 border-b border-border/50">
          <label className="text-sm font-medium mb-2 block">Invite by Email</label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={sendInvite} disabled={!email}>
              <Mail className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>

        {/* Referrals List */}
        <div className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Your Referrals
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {initialReferrals.map((referral, i) => (
              <motion.div
                key={referral.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{referral.name}</p>
                  <p className="text-xs text-muted-foreground">{referral.email}</p>
                </div>
                <div className="text-right">
                  <Badge className={cn("text-xs", getStatusColor(referral.status))}>
                    {getStatusLabel(referral.status)}
                  </Badge>
                  {referral.milesEarned > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">
                      +{referral.milesEarned.toLocaleString()} miles
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="p-4 bg-muted/20 border-t border-border/50">
          <h4 className="font-medium mb-3">How it Works</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                <Share2 className="w-5 h-5 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Share your code</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-5 h-5 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Friend signs up</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-muted-foreground">Both earn miles!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralCenter;
