import { useState } from "react";
import { UtensilsCrossed, Leaf, Fish, Beef, Wheat, Star, Check, Wine, GlassWater, Cake, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mealOptions: { id: string; name: string; description: string; dietary: string[]; price: number; mealIcon: LucideIcon; iconGradient: string; iconColor: string; rating: number; included?: boolean; icon?: LucideIcon }[] = [
  { 
    id: "standard", 
    name: "Classic Menu", 
    description: "Chef's choice of chicken or beef with sides",
    dietary: ["Contains gluten"],
    price: 0,
    mealIcon: UtensilsCrossed,
    iconGradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
    rating: 4.5,
    included: true
  },
  { 
    id: "vegetarian", 
    name: "Vegetarian Delight", 
    description: "Garden fresh vegetables with quinoa and herbs",
    dietary: ["Vegetarian", "Vegan option available"],
    price: 5,
    mealIcon: Leaf,
    iconGradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-500",
    rating: 4.7,
    icon: Leaf
  },
  { 
    id: "seafood", 
    name: "Ocean Fresh", 
    description: "Grilled salmon with lemon butter and vegetables",
    dietary: ["Pescatarian", "High protein"],
    price: 12,
    mealIcon: Fish,
    iconGradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-500",
    rating: 4.8,
    icon: Fish
  },
  { 
    id: "premium", 
    name: "Premium Steak", 
    description: "Prime beef tenderloin with truffle mash",
    dietary: ["High protein", "Gluten-free"],
    price: 18,
    mealIcon: Beef,
    iconGradient: "from-red-500/20 to-rose-500/20",
    iconColor: "text-red-500",
    rating: 4.9,
    icon: Beef
  },
  { 
    id: "glutenfree", 
    name: "Gluten-Free Feast", 
    description: "Rice-based dishes with fresh ingredients",
    dietary: ["Gluten-free", "Dairy-free option"],
    price: 8,
    mealIcon: Wheat,
    iconGradient: "from-amber-500/20 to-yellow-500/20",
    iconColor: "text-amber-400",
    rating: 4.6,
    icon: Wheat
  },
];

const FlightMealPreorder = () => {
  const [selectedMeal, setSelectedMeal] = useState<string | null>("standard");

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-orange-500/20 text-orange-400 border-orange-500/30">
            <UtensilsCrossed className="w-3 h-3 mr-1" /> In-Flight Dining
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Pre-Order Your Meal
          </h2>
          <p className="text-muted-foreground">Choose your preferred meal and enjoy a delicious flight</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealOptions.map((meal) => {
            const isSelected = selectedMeal === meal.id;

            return (
              <button type="button"
                key={meal.id}
                onClick={() => setSelectedMeal(meal.id)}
                className={cn(
                  "relative text-left p-5 rounded-2xl border transition-all",
                  isSelected 
                    ? "bg-orange-500/10 border-orange-500/30 ring-2 ring-orange-500/20" 
                    : "bg-card/60 border-border/50 hover:border-border hover:bg-card/80"
                )}
              >
                {meal.included && (
                  <Badge className="absolute -top-2 right-4 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Included
                  </Badge>
                )}

                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4", meal.iconGradient)}>
                  <meal.mealIcon className={cn("w-8 h-8", meal.iconColor)} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold">{meal.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs">{meal.rating}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {meal.dietary.map((tag) => (
                    <span 
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-muted/50 rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  {meal.price === 0 ? (
                    <span className="text-green-400 font-bold">Free</span>
                  ) : (
                    <span className="font-bold">+${meal.price}</span>
                  )}
                  <span className="text-xs text-muted-foreground">per passenger</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="mt-8 bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
          <h3 className="font-bold mb-4">Enhance Your Meal</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { name: "Premium Wine", price: 15, addonIcon: Wine, gradient: "from-muted to-muted", color: "text-red-400" },
              { name: "Champagne", price: 25, addonIcon: GlassWater, gradient: "from-amber-500/20 to-yellow-500/20", color: "text-amber-400" },
              { name: "Dessert Platter", price: 8, addonIcon: Cake, gradient: "from-muted to-muted", color: "text-pink-400" },
              { name: "Cheese Board", price: 12, addonIcon: UtensilsCrossed, gradient: "from-amber-500/20 to-orange-500/20", color: "text-amber-500" },
            ] as const).map((addon) => (
              <button type="button"
                key={addon.name}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-center"
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br mx-auto mb-2 flex items-center justify-center", addon.gradient)}>
                  <addon.addonIcon className={cn("w-6 h-6", addon.color)} />
                </div>
                <p className="text-sm font-medium">{addon.name}</p>
                <p className="text-xs text-muted-foreground">+${addon.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20">
          <div className="flex items-center gap-3">
            {(() => {
              const selected = mealOptions.find(m => m.id === selectedMeal);
              const MealIcon = selected?.mealIcon || UtensilsCrossed;
              return (
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", selected?.iconGradient || "from-muted to-muted")}>
                  <MealIcon className={cn("w-5 h-5", selected?.iconColor || "text-muted-foreground")} />
                </div>
              );
            })()}
            <div>
              <p className="font-bold">{mealOptions.find(m => m.id === selectedMeal)?.name || "No meal selected"}</p>
              <p className="text-sm text-muted-foreground">Your meal selection</p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-amber-500">
            Confirm Meal Selection
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FlightMealPreorder;
