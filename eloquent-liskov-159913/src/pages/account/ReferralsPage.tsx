/**
 * Account Referrals Page
 * Shows invite code, how it works, and referral progress
 */
import { ArrowLeft, Copy, Share2, Users, Gift, Check, Clock, Crown, ExternalLink, QrCode, Download, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useReferrals } from "@/hooks/useReferrals";
import { REFERRAL_REWARDS, REFERRAL_TERMS } from "@/config/referralProgram";
import SEOHead from "@/components/SEOHead";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export default function ReferralsPage() {
  const navigate = useNavigate();
  const {
    referralCode,
    referrals,
    tiers,
    isLoading,
    copyReferralLink,
    shareReferral,
    getShareUrl,
    getCurrentTier,
    getNextTier,
  } = useReferrals();

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  const [showQR, setShowQR] = useState(false);
  const shareUrl = getShareUrl();

  // Stats summary computed from referrals
  const referralStats = (() => {
    const list = referrals || [];
    const credited = list.filter((r) => r.status === "credited").length;
    const pending = list.filter((r) => r.status === "pending" || r.status === "qualified").length;
    const earned = credited * REFERRAL_REWARDS.referrer.pointsPerReferral;
    return { total: list.length, credited, pending, earned };
  })();

  const handleDownloadQR = () => {
    const svg = document.getElementById("referral-qr-code");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = `zivo-referral-${referralCode?.code || "qr"}.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
        URL.revokeObjectURL(svgUrl);
        toast.success("QR code saved");
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500">
            <Clock className="w-3 h-3" />
            Signed Up
          </span>
        );
      case "qualified":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-foreground">
            <Check className="w-3 h-3" />
            First Booking
          </span>
        );
      case "credited":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500">
            <Gift className="w-3 h-3" />
            Points Earned
          </span>
        );
      case "expired":
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead title="Referrals — ZIVO" description="Invite friends and earn rewards" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Invite Friends</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Stats summary */}
        {!isLoading && referralCode && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-3 gap-2"
          >
            <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{referralStats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invited</p>
            </div>
            <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <Sparkles className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums text-emerald-500">{referralStats.earned.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points earned</p>
            </div>
            <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums text-amber-500">{referralStats.pending}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</p>
            </div>
          </motion.div>
        )}

        {/* Invite Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/20 to-card border border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg">Your Invite Code</p>
              <p className="text-sm text-muted-foreground">Share with friends</p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-16 bg-muted/50 rounded-2xl animate-pulse" />
          ) : (
            <>
              <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 mb-4">
                <p className="text-2xl font-mono font-bold text-center tracking-widest">
                  {referralCode?.code || "---"}
                </p>
              </div>

              <p className="text-xs text-muted-foreground/60 mb-4 text-center truncate">
                {getShareUrl()}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button
                  onClick={copyReferralLink}
                  variant="outline"
                  className="h-11 rounded-xl text-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </Button>
                <Button
                  onClick={shareReferral}
                  className="h-11 rounded-xl text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
                <Button
                  onClick={() => setShowQR((s) => !s)}
                  variant="outline"
                  className="h-11 rounded-xl text-xs"
                  aria-expanded={showQR}
                >
                  <QrCode className="w-3.5 h-3.5 mr-1.5" />
                  {showQR ? "Hide QR" : "QR"}
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {showQR && shareUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col items-center gap-3 pt-2">
                      <div className="rounded-2xl bg-white p-3 border border-border/40 shadow-sm">
                        <QRCodeSVG
                          id="referral-qr-code"
                          value={shareUrl}
                          size={180}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadQR}
                        className="h-9 rounded-xl text-xs"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Save QR as image
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                        Anyone who scans this gets your referral link automatically.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-5"
        >
          <h2 className="font-bold text-lg mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Share your link</p>
                <p className="text-sm text-muted-foreground">Send to friends & family</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">They sign up</p>
                <p className="text-sm text-muted-foreground">
                  Get {REFERRAL_REWARDS.newUser.points} ZIVO Points
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">They book</p>
                <p className="text-sm text-muted-foreground">
                  You earn {REFERRAL_REWARDS.referrer.pointsPerReferral} ZIVO Points
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Tier Progress */}
        {currentTier && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-amber-500/10 to-card border border-amber-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold">Your Tier: {currentTier.tier_name}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {referralCode?.total_referrals || 0} referrals completed
            </p>
            {nextTier && (
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  {nextTier.min_referrals - (referralCode?.total_referrals || 0)} more to reach{" "}
                  <span className="text-amber-500 font-medium">{nextTier.tier_name}</span>
                </p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((referralCode?.total_referrals || 0) / nextTier.min_referrals) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Referral List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-bold text-lg mb-4">Your Referrals</h2>
          {!referrals || referrals.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Share your code to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(referral.created_at), "MMM d, yyyy")}
                    </p>
                    {referral.status === "credited" && (
                      <p className="text-xs text-emerald-500 mt-1">
                        +{REFERRAL_REWARDS.referrer.pointsPerReferral} points
                      </p>
                    )}
                  </div>
                  {getStatusBadge(referral.status)}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Terms */}
        <div className="text-xs text-muted-foreground/60 space-y-1">
          {REFERRAL_TERMS.map((term, i) => (
            <p key={i}>• {term}</p>
          ))}
        </div>

        {/* Link to Wallet */}
        <Button
          onClick={() => navigate("/account/wallet")}
          variant="outline"
          className="w-full h-12 rounded-xl"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Credit Wallet
        </Button>
      </div>
    </div>
  );
}