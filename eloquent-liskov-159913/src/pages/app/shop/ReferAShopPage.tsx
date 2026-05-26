/**
 * ReferAShopPage — Merchants invite new shop owners to ZiVo
 * Both get 1 month free boosted visibility on the Map
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Gift, Users, Copy, Send, Check, Clock, Loader2,
  Share2, Sparkles, Store, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Referral {
  id: string;
  referred_email: string;
  referral_code: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

export default function ReferAShopPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: store } = await (supabase as any)
        .from("store_profiles")
        .select("id, name")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!store) { setLoading(false); return; }
      setStoreId(store.id);
      setStoreName(store.name || "My Store");

      const { data: refs } = await (supabase as any)
        .from("merchant_referrals")
        .select("id, referred_email, referral_code, status, created_at, accepted_at")
        .eq("referrer_store_id", store.id)
        .order("created_at", { ascending: false });

      setReferrals(refs || []);
    } catch {
      toast.error("Failed to load referrals");
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!email || !storeId) return;
    if (!email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    setSending(true);
    try {
      const { error } = await (supabase as any)
        .from("merchant_referrals")
        .insert({
          referrer_store_id: storeId,
          referred_email: email.trim().toLowerCase(),
          status: "pending",
        });
      if (error) {
        if (error.code === "23505") {
          toast.error("You've already invited this email");
        } else {
          throw error;
        }
      } else {
        toast.success(`Invitation sent to ${email}!`);
        setEmail("");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    }
    setSending(false);
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/partner-login?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = (code: string) => {
    const link = `${window.location.origin}/partner-login?ref=${code}`;
    const text = `Join ZiVo and we both get 30 days of 0% transaction fees! Sign up here: ${link}`;
    if (navigator.share) {
      navigator.share({ title: "Join ZiVo", text, url: link });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Share text copied!");
    }
  };

  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const acceptedCount = referrals.filter((r) => r.status === "accepted").length;

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
            <h1 className="text-lg font-bold flex-1">Refer a Shop</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !storeId ? (
          <div className="text-center py-16 px-4">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">You need a store to refer others</p>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-5">
            {/* Hero card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                <CardContent className="p-5 text-center relative">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h2 className="text-xl font-black mb-1">Invite a Shop, Both Win!</h2>
                   <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    When you refer a new shop owner and they make their first sale, you <strong>both</strong> get{" "}
                    <span className="text-primary font-bold">30 days of 0% transaction fees</span> — keeping 100% of your revenue!
                  </p>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{acceptedCount}</p>
                      <p className="text-[10px] text-muted-foreground">Accepted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Invite form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="h-4 w-4" /> Invite by Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  placeholder="shopowner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <Button
                  onClick={handleInvite}
                  disabled={sending || !email}
                  className="w-full rounded-xl font-bold"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </CardContent>
            </Card>

            {/* Referral list */}
            {referrals.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Your Referrals
                </p>
                <div className="space-y-2">
                  {referrals.map((ref, i) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-border/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{ref.referred_email}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Invited {new Date(ref.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant={ref.status === "accepted" ? "default" : "secondary"}
                              className={cn(
                                "text-[10px]",
                                ref.status === "accepted" && "bg-emerald-500"
                              )}
                            >
                              {ref.status === "accepted" ? (
                                <><Check className="h-3 w-3 mr-0.5" /> Joined</>
                              ) : (
                                <><Clock className="h-3 w-3 mr-0.5" /> Pending</>
                              )}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs rounded-lg"
                              onClick={() => copyReferralLink(ref.referral_code)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {copied ? "Copied!" : "Copy Link"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs rounded-lg"
                              onClick={() => shareReferral(ref.referral_code)}
                            >
                              <Share2 className="h-3 w-3 mr-1" /> Share
                            </Button>
                          </div>
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
                  { step: "1", text: "Enter the shop owner's email and send an invite" },
                  { step: "2", text: "They sign up using your referral link" },
                  { step: "3", text: "Once they make their first sale, you both get 30 days of 0% transaction fees" },
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
          </div>
        )}
      </div>
    </AppLayout>
  );
}
