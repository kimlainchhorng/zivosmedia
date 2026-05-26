import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gift,
  CreditCard,
  Wallet,
  Tag,
  CheckCircle,
  Plus,
  Trash2,
  Sparkles,
  Coins,
  Percent,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  originalAmount: number;
  expiresAt: string;
  type: 'gift' | 'promo' | 'credit';
}

interface PromoCode {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  description: string;
  minPurchase?: number;
}

interface GiftCardsCreditsProps {
  className?: string;
  totalAmount?: number;
  zivoCredits?: number;
}

export const GiftCardsCredits = ({
  className,
  totalAmount = 649,
  zivoCredits = 75.50
}: GiftCardsCreditsProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('apply');
  const [promoCode, setPromoCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCards, setAppliedGiftCards] = useState<GiftCard[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [useCredits, setUseCredits] = useState(false);
  const [userGiftCards, setUserGiftCards] = useState<GiftCard[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("gift_cards").select("id, code, current_balance, initial_balance, expires_at, is_active")
      .eq("purchaser_user_id", user.id).eq("is_active", true).then(({ data }) => {
        if (data) setUserGiftCards(data.map(g => ({
          id: g.id, code: g.code, balance: g.current_balance,
          originalAmount: g.initial_balance, expiresAt: g.expires_at ?? "", type: "gift" as const,
        })));
      });
    (supabase as any).from("promo_codes").select("code, discount_value, discount_type, min_order_amount")
      .eq("is_active", true).then(({ data }: { data: any[] | null }) => {
        if (data) setPromoCodes(data.map((p: any) => ({
          code: p.code, discount: p.discount_value ?? 0,
          type: (p.discount_type === "percent" ? "percent" : "fixed") as "percent" | "fixed",
          description: `${p.discount_value}${p.discount_type === "percent" ? "% off" : "$ off"}`, minPurchase: p.min_order_amount ?? undefined,
        })));
      });
  }, [user]);

  const giftCardTotal = appliedGiftCards.reduce((sum, gc) => sum + Math.min(gc.balance, totalAmount - sum), 0);
  const promoDiscount = appliedPromo 
    ? appliedPromo.type === 'percent' 
      ? Math.round(totalAmount * appliedPromo.discount / 100)
      : appliedPromo.discount
    : 0;
  const creditsApplied = useCredits ? Math.min(zivoCredits, totalAmount - giftCardTotal - promoDiscount) : 0;
  const finalAmount = Math.max(0, totalAmount - giftCardTotal - promoDiscount - creditsApplied);

  const applyPromoCode = () => {
    const promo = promoCodes.find(p => p.code.toLowerCase() === promoCode.toLowerCase());
    if (promo) {
      if (promo.minPurchase && totalAmount < promo.minPurchase) {
        toast.error(`Minimum purchase of $${promo.minPurchase} required`);
        return;
      }
      setAppliedPromo(promo);
      setPromoCode('');
      toast.success(`Promo code applied! ${promo.description}`);
    } else {
      toast.error('Invalid promo code');
    }
  };

  const applyGiftCard = async () => {
    let existingCard = userGiftCards.find(gc => gc.code.toLowerCase() === giftCardCode.toLowerCase());
    if (!existingCard) {
      const { data } = await supabase.from("gift_cards").select("id, code, current_balance, initial_balance, expires_at").eq("code", giftCardCode.toUpperCase()).eq("is_active", true).single();
      if (data) existingCard = { id: data.id, code: data.code, balance: data.current_balance, originalAmount: data.initial_balance, expiresAt: data.expires_at ?? "", type: "gift" as const };
    }
    if (existingCard && !appliedGiftCards.find(gc => gc.id === existingCard.id)) {
      setAppliedGiftCards([...appliedGiftCards, existingCard]);
      setGiftCardCode('');
      toast.success(`Gift card applied! Balance: $${existingCard.balance}`);
    } else if (appliedGiftCards.find(gc => gc.code.toLowerCase() === giftCardCode.toLowerCase())) {
      toast.error('Gift card already applied');
    } else {
      toast.error('Invalid gift card code');
    }
  };

  const removeGiftCard = (id: string) => {
    setAppliedGiftCards(appliedGiftCards.filter(gc => gc.id !== id));
    toast.success('Gift card removed');
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
              <CardTitle className="text-xl">Gift Cards & Credits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Apply discounts to your booking
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* ZIVO Credits */}
        {zivoCredits > 0 && (
          <div className="p-4 border-b border-border/50">
            <button type="button"
              onClick={() => setUseCredits(!useCredits)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                useCredits
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border/50 bg-muted/30 hover:border-border"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                useCredits ? "bg-emerald-500/20" : "bg-muted/50"
              )}>
                <Coins className={cn("w-6 h-6", useCredits ? "text-emerald-400" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">ZIVO Credits</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Available</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  You have ${zivoCredits.toFixed(2)} in credits
                </p>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                useCredits ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground"
              )}>
                {useCredits && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
              </div>
            </button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="apply" className="gap-2">
              <Tag className="w-4 h-4" />
              Promo Code
            </TabsTrigger>
            <TabsTrigger value="giftcard" className="gap-2">
              <Gift className="w-4 h-4" />
              Gift Card
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apply" className="space-y-4 mt-0">
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <Button onClick={applyPromoCode} disabled={!promoCode}>
                Apply
              </Button>
            </div>

            {appliedPromo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-medium">{appliedPromo.code}</p>
                    <p className="text-sm text-muted-foreground">{appliedPromo.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    -{appliedPromo.type === 'percent' ? `${appliedPromo.discount}%` : `$${appliedPromo.discount}`}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    aria-label="Remove promo code"
                    onClick={() => setAppliedPromo(null)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Suggested Codes from Supabase */}
            {promoCodes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Available codes:</p>
                <div className="flex flex-wrap gap-2">
                  {promoCodes.map(code => (
                    <Badge
                      key={code.code}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setPromoCode(code.code)}
                    >
                      {code.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="giftcard" className="space-y-4 mt-0">
            <div className="flex gap-2">
              <Input
                placeholder="Enter gift card code"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <Button onClick={applyGiftCard} disabled={!giftCardCode}>
                Apply
              </Button>
            </div>

            {appliedGiftCards.length > 0 && (
              <div className="space-y-2">
                {appliedGiftCards.map(gc => (
                  <motion.div
                    key={gc.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="w-5 h-5 text-foreground" />
                      <div>
                        <p className="font-medium">{gc.code}</p>
                        <p className="text-sm text-muted-foreground">
                          Balance: ${gc.balance} • Expires: {gc.expiresAt}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      aria-label="Remove gift card"
                      onClick={() => removeGiftCard(gc.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* My Gift Cards from Supabase */}
            {userGiftCards.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Your gift cards:</p>
              <div className="space-y-2">
                {userGiftCards.filter(gc => !appliedGiftCards.find(a => a.id === gc.id)).map(gc => (
                  <button type="button"
                    key={gc.id}
                    onClick={() => {
                      setAppliedGiftCards([...appliedGiftCards, gc]);
                      toast.success(`Gift card applied! Balance: $${gc.balance}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:border-primary/20 hover:shadow-sm transition-all duration-200 text-left"
                  >
                    <Gift className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{gc.code}</p>
                      <p className="text-xs text-muted-foreground">${gc.balance} available</p>
                    </div>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </div>
            </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Summary */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <h4 className="font-medium mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trip Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            
            {giftCardTotal > 0 && (
              <div className="flex justify-between text-foreground">
                <span>Gift Cards</span>
                <span>-${giftCardTotal.toFixed(2)}</span>
              </div>
            )}
            
            {promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo ({appliedPromo?.code})</span>
                <span>-${promoDiscount.toFixed(2)}</span>
              </div>
            )}
            
            {creditsApplied > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>ZIVO Credits</span>
                <span>-${creditsApplied.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
              <span>Amount Due</span>
              <span className="text-primary">${finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/50">
          <Button className="w-full" size="lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${finalAmount.toFixed(2)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GiftCardsCredits;
