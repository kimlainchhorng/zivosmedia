/**
 * MerchantBoostModal — Budget selector with KHQR or Stripe payment
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Rocket, Zap, CreditCard, QrCode, Loader2, Check } from "lucide-react";
import KHQRPaymentModal from "./KHQRPaymentModal";
import { cn } from "@/lib/utils";

interface MerchantBoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  reelId?: string;
}

const BOOST_TIERS = [
  { amount: 500, label: "$5", reach: "5,000", duration: "24h" },
  { amount: 1000, label: "$10", reach: "12,000", duration: "24h" },
  { amount: 2000, label: "$20", reach: "30,000", duration: "24h" },
];

export default function MerchantBoostModal({
  open,
  onOpenChange,
  storeId,
  reelId,
}: MerchantBoostModalProps) {
  const [selectedTier, setSelectedTier] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "khqr">("stripe");
  const [loading, setLoading] = useState(false);
  const [showKHQR, setShowKHQR] = useState(false);

  const tier = BOOST_TIERS[selectedTier];

  const handleStripeBoost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-reel-boost", {
        body: { reel_id: reelId || "", store_id: storeId, amount: tier.amount },
      });
      if (error || !data?.url) throw new Error("Failed to create checkout");
      window.open(data.url, "_blank");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Boost failed");
    }
    setLoading(false);
  };

  const handleKHQRBoost = () => {
    setShowKHQR(true);
  };

  const handleKHQRSuccess = async (transactionId: string) => {
    // Record boost in database
    try {
      await (supabase as any).from("merchant_boosts").insert({
        store_id: storeId,
        amount_cents: tier.amount,
        currency: "USD",
        paid_via: "khqr",
        payment_ref: transactionId,
        status: "active",
      });
      await (supabase as any).from("merchant_ad_spend").insert({
        store_id: storeId,
        reel_id: reelId || null,
        amount_cents: tier.amount,
        currency: "USD",
        source: "boost_khqr",
      });
    } catch {
      // silent
    }
    toast.success(`🚀 Boost activated! Your shop will reach ${tier.reach} more people.`);
    setShowKHQR(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showKHQR} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-amber-500" />
              Boost My Shop
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Budget selector */}
            <div>
              <p className="text-sm font-semibold mb-2">Select Budget</p>
              <div className="grid grid-cols-3 gap-2">
                {BOOST_TIERS.map((t, i) => (
                  <button type="button"
                    key={t.amount}
                    onClick={() => setSelectedTier(i)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-center transition-all",
                      selectedTier === i
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border hover:border-amber-500/50"
                    )}
                  >
                    <p className="text-lg font-black">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.reach} reach</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-sm font-semibold mb-2">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 p-3 transition-all",
                    paymentMethod === "stripe"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Card</p>
                    <p className="text-[10px] text-muted-foreground">Visa, Mastercard</p>
                  </div>
                  {paymentMethod === "stripe" && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
                <button type="button"
                  onClick={() => setPaymentMethod("khqr")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 p-3 transition-all",
                    paymentMethod === "khqr"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <QrCode className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">KHQR</p>
                    <p className="text-[10px] text-muted-foreground">ABA, ACLEDA</p>
                  </div>
                  {paymentMethod === "khqr" && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              </div>
            </div>

            {/* Summary */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Your shop & reels will be featured for</p>
                <p className="text-lg font-black text-amber-600">{tier.duration}</p>
                <p className="text-xs text-muted-foreground">reaching up to {tier.reach} people nearby</p>
              </CardContent>
            </Card>

            <Button
              onClick={paymentMethod === "stripe" ? handleStripeBoost : handleKHQRBoost}
              disabled={loading}
              className="w-full rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Pay {tier.label} & Boost
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <KHQRPaymentModal
        open={showKHQR}
        onOpenChange={setShowKHQR}
        amount={tier.amount / 100}
        currency="USD"
        description={`ZIVO Shop Boost - ${tier.label}`}
        sourceTable="merchant_boosts"
        sourceId={storeId}
        onSuccess={handleKHQRSuccess}
        onCancel={() => setShowKHQR(false)}
      />
    </>
  );
}
