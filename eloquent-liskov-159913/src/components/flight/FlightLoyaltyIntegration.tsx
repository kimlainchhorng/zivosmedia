import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Star,
  Sparkles,
  Plus,
  Check,
  ChevronRight,
  Plane,
  Award,
  Gift,
  Wallet,
  Edit2,
  Trash2,
  Coins,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LoyaltyProgram {
  id: string;
  name: string;
  airline: string;
  alliance: "star" | "oneworld" | "skyteam" | "independent";
  memberNumber?: string;
  tier?: "basic" | "silver" | "gold" | "platinum" | "diamond";
  miles?: number;
  logo?: string;
}

const allianceIcons = {
  star: { Icon: Star, color: "text-amber-400" },
  oneworld: { Icon: Globe, color: "text-blue-400" },
  skyteam: { Icon: Plane, color: "text-sky-400" },
  independent: { Icon: Award, color: "text-violet-400" },
};

const tierColors = {
  basic: "from-muted-foreground/20 to-muted-foreground/10 border-muted-foreground/40 text-muted-foreground",
  silver: "from-muted-foreground/30 to-muted-foreground/15 border-muted-foreground/50 text-muted-foreground",
  gold: "from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-400",
  platinum: "from-purple-500/20 to-violet-500/10 border-purple-500/40 text-purple-400",
  diamond: "from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400",
};

const tierIcons = {
  basic: Star,
  silver: Star,
  gold: Crown,
  platinum: Crown,
  diamond: Sparkles,
};

const availablePrograms: Omit<LoyaltyProgram, "memberNumber" | "tier" | "miles">[] = [
  { id: "ua-mileage", name: "MileagePlus", airline: "United Airlines", alliance: "star" },
  { id: "aa-aadvantage", name: "AAdvantage", airline: "American Airlines", alliance: "oneworld" },
  { id: "dl-skymiles", name: "SkyMiles", airline: "Delta Air Lines", alliance: "skyteam" },
  { id: "ek-skywards", name: "Skywards", airline: "Emirates", alliance: "independent" },
  { id: "sq-krisflyer", name: "KrisFlyer", airline: "Singapore Airlines", alliance: "star" },
  { id: "qr-privilege", name: "Privilege Club", airline: "Qatar Airways", alliance: "oneworld" },
  { id: "ba-avios", name: "Avios", airline: "British Airways", alliance: "oneworld" },
  { id: "lh-miles", name: "Miles & More", airline: "Lufthansa", alliance: "star" },
  { id: "af-bluemiles", name: "Flying Blue", airline: "Air France-KLM", alliance: "skyteam" },
  { id: "cx-marco", name: "Marco Polo Club", airline: "Cathay Pacific", alliance: "oneworld" },
];

interface FlightLoyaltyIntegrationProps {
  onProgramSelect?: (program: LoyaltyProgram | null) => void;
  selectedFlightAlliance?: string;
  className?: string;
}

export const FlightLoyaltyIntegration = ({
  onProgramSelect,
  selectedFlightAlliance,
  className,
}: FlightLoyaltyIntegrationProps) => {
  const [linkedPrograms, setLinkedPrograms] = useState<LoyaltyProgram[]>([
    {
      id: "ua-mileage",
      name: "MileagePlus",
      airline: "United Airlines",
      alliance: "star",
      memberNumber: "MP123456789",
      tier: "gold",
      miles: 47832,
    },
  ]);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [activeProgram, setActiveProgram] = useState<string | null>(linkedPrograms[0]?.id || null);

  const handleAddProgram = () => {
    if (!selectedProgram || !newMemberNumber) {
      toast.error("Please select a program and enter your member number");
      return;
    }

    const program = availablePrograms.find((p) => p.id === selectedProgram);
    if (!program) return;

    const newProgram: LoyaltyProgram = {
      ...program,
      memberNumber: newMemberNumber,
      tier: "basic",
      miles: 0,
    };

    setLinkedPrograms([...linkedPrograms, newProgram]);
    setIsAddingProgram(false);
    setSelectedProgram(null);
    setNewMemberNumber("");
    toast.success(`${program.name} linked successfully!`);
  };

  const handleRemoveProgram = (programId: string) => {
    setLinkedPrograms(linkedPrograms.filter((p) => p.id !== programId));
    if (activeProgram === programId) {
      setActiveProgram(linkedPrograms[0]?.id || null);
    }
    toast.info("Program removed");
  };

  const handleSelectForBooking = (programId: string) => {
    setActiveProgram(programId);
    const program = linkedPrograms.find((p) => p.id === programId);
    onProgramSelect?.(program || null);
    toast.success("Program selected for this booking");
  };

  const unlinkedPrograms = availablePrograms.filter(
    (p) => !linkedPrograms.some((lp) => lp.id === p.id)
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Frequent Flyer Programs</h3>
            <p className="text-sm text-muted-foreground">Earn miles on your booking</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingProgram(true)}
          className="gap-2 rounded-xl active:scale-[0.95] transition-all duration-200 touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Link Program
        </Button>
      </div>

      {/* Linked Programs */}
      {linkedPrograms.length > 0 && (
        <div className="space-y-3">
          {linkedPrograms.map((program) => {
            const TierIcon = tierIcons[program.tier || "basic"];
            const isActive = activeProgram === program.id;
            const isAllianceMatch =
              selectedFlightAlliance &&
              (program.alliance === selectedFlightAlliance.toLowerCase() ||
                program.alliance === "independent");

            return (
              <motion.div
                key={program.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "relative rounded-xl p-4 border transition-all cursor-pointer",
                  isActive
                    ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/50 ring-1 ring-primary/20"
                    : "bg-card/50 border-border/50 hover:border-border"
                )}
                onClick={() => handleSelectForBooking(program.id)}
              >
                {/* Alliance Match Badge */}
                {isAllianceMatch && (
                  <Badge
                    className="absolute -top-2 right-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Alliance Match
                  </Badge>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Program Logo/Icon */}
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      {(() => { const a = allianceIcons[program.alliance]; return <a.Icon className={`w-6 h-6 ${a.color}`} />; })()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{program.name}</h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs bg-gradient-to-br border",
                            tierColors[program.tier || "basic"]
                          )}
                        >
                          <TierIcon className="w-3 h-3 mr-1" />
                          {program.tier?.charAt(0).toUpperCase()}
                          {program.tier?.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{program.airline}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {program.memberNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-right">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-lg">
                        {program.miles?.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">miles</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Edit functionality
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProgram(program.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Program Modal */}
      <AnimatePresence>
        {isAddingProgram && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-dashed border-2 border-border bg-secondary">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-foreground" />
                    Link Frequent Flyer Program
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingProgram(false);
                      setSelectedProgram(null);
                      setNewMemberNumber("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Program Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {unlinkedPrograms.slice(0, 9).map((program) => (
                    <button type="button"
                      key={program.id}
                      onClick={() => setSelectedProgram(program.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98] touch-manipulation text-left",
                        selectedProgram === program.id
                          ? "bg-sky-500/10 border-sky-500/50 shadow-sm"
                          : "bg-muted/30 border-border/50 hover:border-border"
                      )}
                    >
                      {(() => { const a = allianceIcons[program.alliance]; return <a.Icon className={`w-5 h-5 ${a.color}`} />; })()}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{program.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {program.airline}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Member Number Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member Number</label>
                  <Input
                    placeholder="Enter your member number"
                    value={newMemberNumber}
                    onChange={(e) => setNewMemberNumber(e.target.value)}
                    className="h-11 bg-background/50"
                  />
                </div>

                <Button
                  onClick={handleAddProgram}
                  disabled={!selectedProgram || !newMemberNumber}
                  className="w-full text-primary-foreground rounded-xl active:scale-[0.97] transition-all duration-200 touch-manipulation bg-foreground"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Link Program
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {linkedPrograms.length === 0 && !isAddingProgram && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Gift className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="font-semibold mb-2">No Programs Linked</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Link your frequent flyer programs to earn miles on every booking
            </p>
            <Button onClick={() => setIsAddingProgram(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Miles Earning Info */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Earn Miles on This Flight</p>
            <p className="text-xs text-muted-foreground">
              Based on your selected program and fare class, you could earn{" "}
              <span className="text-amber-500 font-semibold">500-2,500 miles</span> on
              this booking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightLoyaltyIntegration;
