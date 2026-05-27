import { useState } from "react";
import { Utensils, Check, Leaf, Fish, Beef, Wheat, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MealOption {
  id: string;
  name: string;
  description: string;
  type: "standard" | "vegetarian" | "vegan" | "seafood" | "gluten-free";
  price: number;
  icon: React.ElementType;
  popular?: boolean;
}

interface MealPreferenceWidgetProps {
  className?: string;
  mealOptions?: MealOption[];
  currency?: string;
  preSelectedMealId?: string;
  onMealSelect?: (meal: MealOption | null) => void;
  onConfirm?: (meal: MealOption, specialRequests: string) => void;
}

const defaultMealOptions: MealOption[] = [
  { 
    id: "standard", 
    name: "Classic Chicken", 
    description: "Grilled chicken with seasonal vegetables",
    type: "standard",
    price: 0,
    icon: Beef,
    popular: true
  },
  { 
    id: "vegetarian", 
    name: "Garden Vegetarian", 
    description: "Pasta primavera with fresh vegetables",
    type: "vegetarian",
    price: 0,
    icon: Leaf
  },
  { 
    id: "vegan", 
    name: "Plant-Based Bowl", 
    description: "Quinoa bowl with roasted vegetables",
    type: "vegan",
    price: 5,
    icon: Leaf
  },
  { 
    id: "seafood", 
    name: "Atlantic Salmon", 
    description: "Pan-seared salmon with lemon butter",
    type: "seafood",
    price: 12,
    icon: Fish
  },
  { 
    id: "gluten-free", 
    name: "Gluten-Free Plate", 
    description: "Grilled steak with rice and vegetables",
    type: "gluten-free",
    price: 8,
    icon: Wheat
  },
];

const MealPreferenceWidget = ({ 
  className,
  mealOptions = defaultMealOptions,
  currency = "$",
  preSelectedMealId,
  onMealSelect,
  onConfirm
}: MealPreferenceWidgetProps) => {
  const [selectedMeal, setSelectedMeal] = useState<MealOption | null>(
    preSelectedMealId ? mealOptions.find(m => m.id === preSelectedMealId) || null : null
  );
  const [specialRequests, setSpecialRequests] = useState("");

  const handleMealClick = (meal: MealOption) => {
    setSelectedMeal(meal);
    onMealSelect?.(meal);
  };

  const handleConfirm = () => {
    if (selectedMeal) {
      onConfirm?.(selectedMeal, specialRequests);
    }
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Meal Selection</h3>
        </div>
        {selectedMeal && (
          <Badge className="bg-primary/10 text-primary">
            {selectedMeal.price > 0 ? `+${currency}${selectedMeal.price}` : "Included"}
          </Badge>
        )}
      </div>

      {/* Meal Options */}
      <div className="space-y-2 mb-4">
        {mealOptions.map((meal) => {
          const Icon = meal.icon;
          const isSelected = selectedMeal?.id === meal.id;
          
          return (
            <button type="button"
              key={meal.id}
              onClick={() => handleMealClick(meal)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left active:scale-[0.98] touch-manipulation",
                isSelected 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/20 border-border/30 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl",
                isSelected ? "bg-primary/20" : "bg-muted/30"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{meal.name}</p>
                  {meal.popular && (
                    <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{meal.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {meal.price > 0 ? `+${currency}${meal.price}` : "Free"}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Special Requests */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1.5 block">
          Special Dietary Requirements (optional)
        </label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Allergies, religious requirements, etc."
          className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Selection Summary */}
      {selectedMeal && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedMeal.name}</p>
              <p className="text-xs text-muted-foreground">{selectedMeal.description}</p>
            </div>
            <Button size="sm" onClick={handleConfirm}>Confirm</Button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>Meal preferences can be changed up to 24 hours before departure. Premium meals are prepared fresh.</p>
      </div>
    </div>
  );
};

export default MealPreferenceWidget;
