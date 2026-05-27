/**
 * GroceryHowItWorks - Visual 3-step guide for the grocery flow
 */
import { motion } from "framer-motion";
import { Search, ShoppingBag, Truck, ChevronRight } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Browse & Add",
    desc: "Search real products from local stores and add to cart",
    color: "from-primary/20 to-primary/5",
    border: "border-primary/15",
    iconColor: "text-primary",
  },
  {
    icon: ShoppingBag,
    title: "Driver Shops",
    desc: "A verified ZIVO driver shops in-store for you",
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/15",
    iconColor: "text-violet-500",
  },
  {
    icon: Truck,
    title: "Delivered",
    desc: "Fresh items delivered same-day to your door",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/15",
    iconColor: "text-emerald-500",
  },
];

export function GroceryHowItWorks() {
  return (
    <div className="px-4 py-4">
      <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        How It Works
      </h3>
      <div className="flex items-start gap-2">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 24 }}
              className="flex-1 flex flex-col items-center relative"
            >
              {/* Connector arrow */}
              {i < STEPS.length - 1 && (
                <div className="absolute top-5 -right-1.5 z-10">
                  <ChevronRight className="h-3 w-3 text-muted-foreground/20" />
                </div>
              )}
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${step.color} border ${step.border} flex items-center justify-center mb-2 shadow-sm`}>
                <StepIcon className={`h-5 w-5 ${step.iconColor}`} />
              </div>
              <p className="text-[11px] font-bold text-foreground text-center leading-tight">{step.title}</p>
              <p className="text-[9px] text-muted-foreground text-center leading-snug mt-0.5 px-1">{step.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
