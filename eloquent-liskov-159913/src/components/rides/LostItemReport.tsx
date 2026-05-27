/**
 * LostItemReport - In-app lost & found with item recovery tracking
 * Inspired by Uber/Lyft's lost item flow
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, Phone, MessageSquare, Camera, ChevronRight, Check, Clock, MapPin, AlertCircle, Smartphone, Wallet, Key, Headphones, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

interface LostItemReportProps {
  tripId?: string;
  driverName?: string;
  tripDate?: string;
  onSubmit?: (data: { category: string; description: string }) => void;
  onContactDriver?: () => void;
}

const itemCategories = [
  { id: "phone", icon: Smartphone, label: "Phone", color: "text-sky-500", bg: "bg-sky-500/10" },
  { id: "wallet", icon: Wallet, label: "Wallet / Cards", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "keys", icon: Key, label: "Keys", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "headphones", icon: Headphones, label: "Headphones", color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "bag", icon: ShoppingBag, label: "Bag / Luggage", color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "other", icon: Package, label: "Other", color: "text-muted-foreground", bg: "bg-muted/50" },
];

const recoverySteps = [
  { id: 1, label: "Report submitted", status: "done" as const },
  { id: 2, label: "Driver notified", status: "done" as const },
  { id: 3, label: "Driver responded", status: "current" as const },
  { id: 4, label: "Item recovered", status: "pending" as const },
];

export default function LostItemReport({
  tripId = "ZIVO-R-48291",
  driverName = "Marcus T.",
  tripDate = "Today, 2:34 PM",
  onSubmit,
  onContactDriver,
}: LostItemReportProps) {
  const [step, setStep] = useState<"select" | "describe" | "tracking">("select");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!selectedCategory) return;
    if (!confirmContentSafe(description, "item description")) return;
    onSubmit?.({ category: selectedCategory, description });
    setStep("tracking");
    toast.success("Lost item report submitted!");
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Lost Something?</h3>
            <p className="text-[10px] text-muted-foreground">Trip {tripId} • {tripDate}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select item category */}
        {step === "select" && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
            <span className="text-xs font-bold text-foreground mb-3 block">What did you leave behind?</span>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {itemCategories.map((cat) => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <button type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all",
                      active
                        ? `${cat.bg} border-current/20 ring-2 ring-primary/20`
                        : "bg-muted/20 border-border/30 hover:bg-muted/40"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", active ? cat.color : "text-muted-foreground")} />
                    <span className={cn("text-[10px] font-bold", active ? "text-foreground" : "text-muted-foreground")}>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => selectedCategory && setStep("describe")}
              disabled={!selectedCategory}
              className="w-full h-11 rounded-xl font-bold"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Describe item */}
        {step === "describe" && (
          <motion.div key="describe" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4">
            <span className="text-xs font-bold text-foreground mb-2 block">Describe your item</span>
            <Textarea
              placeholder="Color, brand, where you think you left it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] text-xs resize-none mb-3"
            />

            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30 mb-4">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                  {driverName.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="text-xs font-bold text-foreground">Driver: {driverName}</span>
                <p className="text-[10px] text-muted-foreground">Will be notified automatically</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-11 text-xs" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!description.trim()}
                className="flex-1 h-11 rounded-xl font-bold"
              >
                Submit Report <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Tracking */}
        {step === "tracking" && (
          <motion.div key="tracking" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-foreground">Recovery in progress</span>
            </div>

            {/* Timeline */}
            <div className="space-y-0 mb-4">
              {recoverySteps.map((rs, i) => (
                <div key={rs.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2",
                      rs.status === "done" ? "bg-emerald-500 border-emerald-500" :
                      rs.status === "current" ? "bg-primary/10 border-primary animate-pulse" :
                      "bg-muted/30 border-border/40"
                    )}>
                      {rs.status === "done" ? (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      ) : rs.status === "current" ? (
                        <Clock className="w-3 h-3 text-primary" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    {i < recoverySteps.length - 1 && (
                      <div className={cn(
                        "w-0.5 h-6",
                        rs.status === "done" ? "bg-emerald-500" : "bg-border/40"
                      )} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <span className={cn(
                      "text-xs font-medium",
                      rs.status === "done" ? "text-emerald-500" :
                      rs.status === "current" ? "text-foreground" :
                      "text-muted-foreground"
                    )}>
                      {rs.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact driver */}
            <Button
              variant="outline"
              onClick={onContactDriver}
              className="w-full h-11 rounded-xl text-xs font-bold"
            >
              <Phone className="w-3.5 h-3.5 mr-2" /> Contact {driverName}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
