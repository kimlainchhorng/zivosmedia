/**
 * Gift Card Purchase Success Page
 * Verifies payment and shows gift card code
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gift, Copy, Check, Loader2, Send, Ticket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGiftCards } from "@/hooks/useGiftCards";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function GiftCardSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { verifyPurchase } = useGiftCards();
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [giftCard, setGiftCard] = useState<{
    code: string;
    amount: number;
    recipient_email: string | null;
    recipient_name: string | null;
    message: string | null;
  } | null>(null);

  useEffect(() => {
    if (sessionId && !verified) {
      verifyPurchase.mutateAsync(sessionId).then((result) => {
        if (result.success) {
          setGiftCard(result.gift_card);
          setVerified(true);
        }
      }).catch(() => {
        // Error handled by mutation
      });
    }
  }, [sessionId]);

  const copyCode = () => {
    if (giftCard?.code) {
      navigator.clipboard.writeText(giftCard.code);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid session. Please try again.</p>
          <Button variant="ghost" onClick={() => navigate("/account/gift-cards")} className="mt-4 text-primary">
            Go to Gift Cards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead title="Gift Card Purchased — ZIVO" description="Your ZIVO gift card is ready" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-4">
          <button type="button"
            onClick={() => navigate("/account/gift-cards")}
            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Purchase Complete</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-6 py-8">
        {verifyPurchase.isPending ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your purchase...</p>
          </div>
        ) : verifyPurchase.isError ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">Something went wrong verifying your purchase.</p>
            <Button variant="ghost" onClick={() => navigate("/account/gift-cards")} className="text-primary">
              Go to Gift Cards
            </Button>
          </div>
        ) : giftCard ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Success Animation */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-1">Gift Card Ready!</h2>
              <p className="text-muted-foreground">
                {giftCard.recipient_email
                  ? `Sent to ${giftCard.recipient_name || giftCard.recipient_email}`
                  : "Your gift card is ready to use"}
              </p>
            </div>

            {/* Gift Card Display */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">ZIVO Gift Card</span>
              </div>
              <p className="text-4xl font-bold text-center mb-4">
                ${giftCard.amount.toFixed(2)}
              </p>

              {/* Code */}
              <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                <span className="font-mono text-lg tracking-wider">{giftCard.code}</span>
                <button type="button"
                  onClick={copyCode}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {giftCard.message && (
                <p className="text-sm text-muted-foreground mt-4 italic text-center">"{giftCard.message}"</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {giftCard.recipient_email ? (
                <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
                  <Send className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Gift card sent!</p>
                    <p className="text-xs text-muted-foreground">
                      The recipient will receive the code at {giftCard.recipient_email}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => navigate("/account/gift-cards?tab=redeem")}
                  className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  Redeem Now
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => navigate("/account/wallet")}
                className="w-full text-primary"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Go to Wallet
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate("/account/gift-cards")}
                className="w-full text-muted-foreground"
              >
                Buy Another Gift Card
              </Button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}