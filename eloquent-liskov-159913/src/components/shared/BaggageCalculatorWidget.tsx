import { useState } from "react";
import { Luggage, Plus, Minus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BagType {
  id: string;
  name: string;
  maxWeight: number;
  price: number;
  included: boolean;
}

interface BaggageCalculatorWidgetProps {
  className?: string;
  includedBags?: number;
  maxWeight?: number;
  maxBagsAllowed?: number;
  additionalBagPrice?: number;
  overweightFeePerKg?: number;
  currency?: string;
  initialWeight?: number;
  onBaggageChange?: (bags: BagType[], totalCost: number) => void;
}

const BaggageCalculatorWidget = ({ 
  className, 
  includedBags = 1,
  maxWeight = 23,
  maxBagsAllowed = 4,
  additionalBagPrice = 35,
  overweightFeePerKg = 15,
  currency = "$",
  initialWeight = 18,
  onBaggageChange
}: BaggageCalculatorWidgetProps) => {
  const [bags, setBags] = useState<BagType[]>([
    { id: "1", name: "Checked Bag 1", maxWeight, price: 0, included: true },
  ]);
  const [currentWeight, setCurrentWeight] = useState(initialWeight);

  const addBag = () => {
    if (bags.length < maxBagsAllowed) {
      const newBags = [...bags, {
        id: String(bags.length + 1),
        name: `Checked Bag ${bags.length + 1}`,
        maxWeight,
        price: bags.length >= includedBags ? additionalBagPrice : 0,
        included: bags.length < includedBags
      }];
      setBags(newBags);
      const totalCost = newBags.reduce((sum, bag) => sum + bag.price, 0) + 
        (currentWeight > maxWeight ? (currentWeight - maxWeight) * overweightFeePerKg : 0);
      onBaggageChange?.(newBags, totalCost);
    }
  };

  const removeBag = () => {
    if (bags.length > 1) {
      const newBags = bags.slice(0, -1);
      setBags(newBags);
      const totalCost = newBags.reduce((sum, bag) => sum + bag.price, 0) + 
        (currentWeight > maxWeight ? (currentWeight - maxWeight) * overweightFeePerKg : 0);
      onBaggageChange?.(newBags, totalCost);
    }
  };

  const handleWeightChange = (weight: number) => {
    setCurrentWeight(weight);
    const totalCost = bags.reduce((sum, bag) => sum + bag.price, 0) + 
      (weight > maxWeight ? (weight - maxWeight) * overweightFeePerKg : 0);
    onBaggageChange?.(bags, totalCost);
  };

  const totalCost = bags.reduce((sum, bag) => sum + bag.price, 0);
  const weightPercentage = (currentWeight / maxWeight) * 100;
  const isOverweight = currentWeight > maxWeight;
  const overweightFee = isOverweight ? (currentWeight - maxWeight) * overweightFeePerKg : 0;

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Luggage className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Baggage Calculator</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {includedBags} bag{includedBags > 1 ? 's' : ''} included
        </Badge>
      </div>

      {/* Bag Counter */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div>
          <p className="text-sm font-medium">Checked Bags</p>
          <p className="text-xs text-muted-foreground">Max {maxBagsAllowed} bags per passenger</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Remove bag"
            className="h-8 w-8"
            onClick={removeBag}
            disabled={bags.length <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg w-6 text-center">{bags.length}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Add bag"
            className="h-8 w-8"
            onClick={addBag}
            disabled={bags.length >= maxBagsAllowed}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weight Calculator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Bag Weight</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="32"
              value={currentWeight}
              onChange={(e) => handleWeightChange(Number(e.target.value))}
              className="w-20 h-2 bg-muted rounded-xl appearance-none cursor-pointer"
            />
            <span className={cn(
              "font-bold text-sm w-12 text-right",
              isOverweight ? "text-red-400" : "text-foreground"
            )}>
              {currentWeight} kg
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(weightPercentage, 100)} 
          className={cn("h-2", isOverweight && "[&>div]:bg-red-500")}
        />
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>0 kg</span>
          <span>Max: {maxWeight} kg</span>
        </div>
      </div>

      {/* Weight Status */}
      {isOverweight ? (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Overweight</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Excess baggage fee: {currency}{overweightFeePerKg}/kg = {currency}{overweightFee}
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Within Limit</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {maxWeight - currentWeight} kg remaining before excess fees apply
          </p>
        </div>
      )}

      {/* Cost Summary */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
        <p className="text-xs text-muted-foreground mb-2">Baggage Summary</p>
        <div className="space-y-1">
          {bags.map((bag) => (
            <div key={bag.id} className="flex items-center justify-between text-sm">
              <span>{bag.name}</span>
              <span className={bag.included ? "text-emerald-400" : "text-foreground"}>
                {bag.included ? "Included" : `${currency}${bag.price}`}
              </span>
            </div>
          ))}
          {isOverweight && (
            <div className="flex items-center justify-between text-sm text-red-400">
              <span>Overweight Fee</span>
              <span>{currency}{overweightFee}</span>
            </div>
          )}
        </div>
        <div className="border-t border-border/50 mt-2 pt-2 flex items-center justify-between font-semibold">
          <span>Total</span>
          <span>{currency}{totalCost + overweightFee}</span>
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>Pre-pay for extra bags online and save up to 40% vs airport prices.</p>
      </div>
    </div>
  );
};

export default BaggageCalculatorWidget;
