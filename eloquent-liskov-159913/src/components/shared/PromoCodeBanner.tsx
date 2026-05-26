import { Gift, Copy, Clock, Sparkles, Check, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const promoCodes = [
  { code: "FIRST25", discount: "25% off", description: "First booking", expires: "Limited time", color: "from-green-500 to-emerald-500" },
  { code: "SUMMER20", discount: "20% off", description: "Summer deals", expires: "Aug 31", color: "from-amber-500 to-orange-500" },
  { code: "WEEKEND15", discount: "15% off", description: "Weekend rentals", expires: "Ongoing", color: "from-violet-500 to-purple-500" },
];

const PromoCodeBanner = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Promo code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/20">
            <Gift className="w-3 h-3 mr-1" /> Promo Codes
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Exclusive Savings
          </h2>
          <p className="text-muted-foreground">
            Use these codes at checkout for instant discounts
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {promoCodes.map((promo) => (
            <div
              key={promo.code}
              className="relative overflow-hidden p-5 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl group"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${promo.color} opacity-20 blur-2xl rounded-full`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`bg-gradient-to-r ${promo.color} text-primary-foreground border-0`}>
                    {promo.discount}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {promo.expires}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-2 bg-muted rounded-xl font-mono font-bold text-center border-2 border-dashed border-border">
                    {promo.code}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(promo.code)}
                    className="flex-shrink-0"
                    aria-label="Copy promo code"
                  >
                    {copiedCode === promo.code ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoCodeBanner;
