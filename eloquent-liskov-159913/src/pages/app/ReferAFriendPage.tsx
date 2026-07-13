/**
 * Refer a Friend — User-to-user referral page.
 * If a friend signs up and makes their first purchase, the referrer gets $0.50 ZiVo Credit.
 */
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { useReferrals } from "@/hooks/useReferrals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Gift, Users, Copy, Share2, Check, Clock, Loader2,
  Sparkles, DollarSign, Wallet, ChevronRight, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export default function ReferAFriendPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    referralCode,
    referrals,
    isLoading,
    getCurrentTier,
    getNextTier,
    copyReferralLink,
    shareReferral,
    getShareUrl,
  } = useReferrals();

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const totalReferrals = referralCode?.total_referrals || 0;
  const qualifiedCount = referrals?.filter((r) => r.status === "qualified" || r.status === "credited").length || 0;
  const pendingCount = referrals?.filter((r) => r.status === "pending").length || 0;
  const walletEarned = (qualifiedCount * 0.5).toFixed(2);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3 pt-safe">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Gift className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold flex-1">Refer a Friend</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-5">
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                <CardContent className="p-5 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-black mb-1">Earn $0.50 Per Friend</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    When your friend joins ZiVo and makes their <strong>first purchase</strong>
                    {" "}(Ride, Food, or Service), you get{" "}
                    <span className="text-primary font-bold">$0.50 ZiVo Credit</span> in your wallet!
                  </p>
                  <div className="flex justify-center gap-8 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{totalReferrals}</p>
                      <p className="text-[10px] text-muted-foreground">Friends Invited</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-500">${walletEarned}</p>
                      <p className="text-[10px] text-muted-foreground">Wallet Earned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Referral Code & Actions */}
            {referralCode && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Your Referral Code</p>
                    <p className="text-2xl font-black tracking-widest text-primary">
                      {referralCode.code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={copyReferralLink}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy Link
                    </Button>
                    <Button
                      className="flex-1 rounded-xl font-bold"
                      onClick={shareReferral}
                    >
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tier Progress */}
            {currentTier && (
              <Card className="border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-bold">{currentTier.tier_name}</span>
                    </div>
                    {nextTier && (
                      <span className="text-[10px] text-muted-foreground">
                        {nextTier.min_referrals - totalReferrals} more to {nextTier.tier_name}
                      </span>
                    )}
                  </div>
                  {nextTier && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                        style={{
                          width: `${Math.min(100, (totalReferrals / nextTier.min_referrals) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Referrals */}
            {referrals && referrals.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Recent Referrals
                </p>
                <div className="space-y-2">
                  {referrals.slice(0, 10).map((ref, i) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="border-border/30">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">
                              Friend #{i + 1}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Joined {new Date(ref.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={ref.status === "credited" ? "default" : "secondary"}
                            className={cn(
                              "text-[10px]",
                              ref.status === "credited" && "bg-emerald-500",
                              ref.status === "qualified" && "bg-primary"
                            )}
                          >
                            {ref.status === "credited" ? (
                              <><Check className="h-3 w-3 mr-0.5" /> $0.50 Earned</>
                            ) : ref.status === "qualified" ? (
                              <><Wallet className="h-3 w-3 mr-0.5" /> Qualified</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-0.5" /> Pending</>
                            )}
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: "1", text: "Share your referral link with friends" },
                  { step: "2", text: "They sign up on ZiVo using your link" },
                  { step: "3", text: "When they make their first purchase, you get $0.50 ZiVo Credit!" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-primary">{item.step}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pt-0.5">{item.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <p className="text-[9px] text-center text-muted-foreground/60">
              ZiVo Credits have no cash value. Credits are applied to future purchases.
              See <button type="button" onClick={() => navigate("/terms")} className="text-primary underline">Terms</button> for details.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
