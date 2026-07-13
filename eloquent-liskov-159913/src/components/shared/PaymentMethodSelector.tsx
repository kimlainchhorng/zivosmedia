import { useState } from "react";
import { 
  CreditCard, 
  Wallet,
  Banknote,
  Gift,
  ChevronRight,
  Check,
  Plus,
  Lock,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCountry } from "@/hooks/useCountry";

interface PaymentMethodSelectorProps {
  className?: string;
  totalAmount?: number;
}

interface PaymentMethod {
  id: string;
  type: "card" | "wallet" | "bnpl" | "gift" | "aba";
  label: string;
  description: string;
  icon: typeof CreditCard;
  available: boolean;
  badge?: string;
  countryOnly?: string; // restrict to specific country
}

const paymentMethods: PaymentMethod[] = [
  { 
    id: "aba", 
    type: "aba", 
    label: "ABA Pay", 
    description: "ABA Bank · KHQR · Cards",
    icon: Building2,
    available: true,
    badge: "Popular",
    countryOnly: "KH"
  },
  { 
    id: "card", 
    type: "card", 
    label: "Credit/Debit Card", 
    description: "Visa, Mastercard, Amex",
    icon: CreditCard,
    available: true
  },
  { 
    id: "wallet", 
    type: "wallet", 
    label: "Digital Wallet", 
    description: "Apple Pay, Google Pay",
    icon: Wallet,
    available: true,
    badge: "Fastest"
  },
  { 
    id: "bnpl", 
    type: "bnpl", 
    label: "Pay Later", 
    description: "Split into 4 payments",
    icon: Banknote,
    available: true,
    badge: "0% APR"
  },
  { 
    id: "gift", 
    type: "gift", 
    label: "Gift Card / Credits", 
    description: "$50.00 available",
    icon: Gift,
    available: true
  },
];

const PaymentMethodSelector = ({ className, totalAmount = 1299 }: PaymentMethodSelectorProps) => {
  const { country } = useCountry();
  const isCambodia = country === "KH";

  // Filter methods by country
  const filteredMethods = paymentMethods.filter(m => {
    if (m.countryOnly) return m.countryOnly === country;
    return true;
  });

  const [selectedMethod, setSelectedMethod] = useState<string>(isCambodia ? "aba" : "card");
  const [savedCards] = useState([
    { id: "1", last4: "4242", brand: "Visa", isDefault: true },
    { id: "2", last4: "8888", brand: "Mastercard", isDefault: false },
  ]);

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Payment Method</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          Secure
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-2 mb-4">
        {filteredMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <button type="button"
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border/50 hover:border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl",
                isSelected ? "bg-primary/10" : "bg-muted/30"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{method.label}</span>
                  {method.badge && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {method.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
              {isSelected ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* ABA Pay info (if ABA selected) */}
      {selectedMethod === "aba" && (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">ABA Payway Checkout</p>
          <p className="text-xs text-muted-foreground">
            You'll be redirected to ABA's secure checkout to complete payment via ABA Mobile, KHQR, or card.
          </p>
        </div>
      )}

      {/* Saved Cards (if card selected) */}
      {selectedMethod === "card" && (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">Saved Cards</p>
          <div className="space-y-2">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-background/50"
              >
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {card.brand} •••• {card.last4}
                </span>
                {card.isDefault && (
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Default
                  </Badge>
                )}
              </div>
            ))}
            <button type="button" className="w-full flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.98] touch-manipulation">
              <Plus className="w-3 h-3" />
              Add new card
            </button>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold">${totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
