/**
 * PairPage — `/pair/:token`
 * Phone scans the QR from the desktop's "Continue on phone" dialog and lands here.
 * Shows the shop identity and a Confirm/Cancel choice. No sign-in required.
 * On confirm, stores a paired identity locally and redirects to /go-live.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, Radio, Smartphone, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  getPairSession,
  confirmPairSession,
  cancelPairSession,
  savePairedIdentity,
  savePairToken,
  type PairSession,
} from "@/lib/livePairing";
import { toast } from "sonner";

export default function PairPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<PairSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"confirm" | "cancel" | null>(null);
  const [done, setDone] = useState<"confirmed" | "cancelled" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const s = await getPairSession(token);
        if (!alive) return;
        if (!s) setError("This pairing link is invalid or has expired.");
        else if (s.status !== "pending") setError(`This pairing was already ${s.status}.`);
        setSession(s);
      } catch (e: any) {
        setError(e?.message ?? "Could not load pairing.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const onConfirm = async () => {
    if (!token || !session) return;
    setActing("confirm");
    try {
      await confirmPairSession(token);
      savePairToken(token);
      savePairedIdentity({
        store_id: session.store_id,
        store_name: session.store_name,
        store_avatar_url: session.store_avatar_url,
      });
      setDone("confirmed");
      toast.success("Paired! Opening studio…");
      setTimeout(() => navigate("/go-live"), 1100);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not confirm");
      setActing(null);
    }
  };

  const onCancel = async () => {
    if (!token) return;
    setActing("cancel");
    try {
      await cancelPairSession(token);
      setDone("cancelled");
      setTimeout(() => window.close(), 800);
    } catch {
      setActing(null);
    }
  };

  const initial = session?.store_name?.[0]?.toUpperCase() ?? "S";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/10 rounded-3xl">
          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/30">
                <Smartphone className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-ig-gradient leading-tight">Pair this phone</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">to go live as your shop</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm font-medium text-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">Open the QR again on your computer.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {!done && (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="space-y-5"
                  >
                    {/* Shop identity */}
                    <div className="flex flex-col items-center text-center space-y-2.5 py-2">
                      <Avatar className="w-20 h-20 ring-4 ring-primary/15 shadow-lg">
                        <AvatarImage src={session?.store_avatar_url ?? undefined} alt={session?.store_name ?? "Shop"} />
                        <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">You'll go live as</p>
                        <h2 className="text-lg font-bold text-foreground leading-tight">
                          {session?.store_name ?? "Your Shop"}
                        </h2>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Verified pairing</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-[11px] text-muted-foreground leading-relaxed">
                      Confirming gives this phone permission to broadcast live as
                      <span className="font-semibold text-foreground"> {session?.store_name ?? "your shop"}</span>.
                      You can stop the stream anytime from any device.
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        onClick={onConfirm}
                        disabled={!!acting}
                        className="w-full h-12 rounded-xl text-sm font-bold gap-2 shadow-md shadow-primary/20"
                      >
                        {acting === "confirm" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirm & Go Live
                      </Button>
                      <Button
                        onClick={onCancel}
                        disabled={!!acting}
                        variant="ghost"
                        className="w-full h-10 rounded-xl text-sm font-medium gap-2 text-muted-foreground"
                      >
                        {acting === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}

                {done === "confirmed" && (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6 space-y-3"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" strokeWidth={3} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">Confirmed!</h3>
                    <p className="text-xs text-muted-foreground">Opening Go Live studio…</p>
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <Radio className="w-3 h-3 text-primary animate-pulse" />
                      <span className="text-[11px] font-semibold text-primary">Ready to broadcast</span>
                    </div>
                  </motion.div>
                )}

                {done === "cancelled" && (
                  <motion.div
                    key="no"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 space-y-2"
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <X className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Pairing cancelled</p>
                    <p className="text-xs text-muted-foreground">You can close this window.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
