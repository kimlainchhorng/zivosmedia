import { useState } from "react";
import { 
  Edit3, 
  Calendar, 
  Users, 
  ArrowLeftRight,
  AlertCircle,
  Check,
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModificationOption {
  id: string;
  icon: React.ElementType;
  label: string;
  fee: number;
  available: boolean;
}

interface TripModificationWidgetProps {
  className?: string;
  bookingType?: "flight" | "hotel" | "car";
  confirmationCode?: string;
  bookingStatus?: "confirmed" | "pending" | "cancelled";
  modificationOptions?: ModificationOption[];
  freeModificationWindow?: string;
  onModify?: (optionId: string) => void;
  onCancel?: () => void;
}

const defaultModificationOptions: ModificationOption[] = [
  { id: "dates", icon: Calendar, label: "Change Dates", fee: 75, available: true },
  { id: "passengers", icon: Users, label: "Add Travelers", fee: 0, available: true },
  { id: "route", icon: ArrowLeftRight, label: "Change Route", fee: 150, available: false },
  { id: "upgrade", icon: Edit3, label: "Upgrade Class", fee: 0, available: true },
];

const TripModificationWidget = ({ 
  className, 
  bookingType = "flight",
  confirmationCode = "ZV-2024-ABC123",
  bookingStatus = "confirmed",
  modificationOptions = defaultModificationOptions,
  freeModificationWindow = "24h before",
  onModify,
  onCancel
}: TripModificationWidgetProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const statusColors = {
    confirmed: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400"
  };

  const handleContinue = () => {
    if (selectedOption && onModify) {
      onModify(selectedOption);
    }
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Modify Booking</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Free until {freeModificationWindow}
        </Badge>
      </div>

      {/* Current Booking Summary */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confirmation</span>
          <span className="font-mono font-bold">{confirmationCode}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Status</span>
          <Badge className={cn("text-xs", statusColors[bookingStatus])}>
            {bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Modification Options */}
      <div className="space-y-2 mb-4">
        {modificationOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption === option.id;
          
          return (
            <button type="button"
              key={option.id}
              onClick={() => option.available && setSelectedOption(isSelected ? null : option.id)}
              disabled={!option.available}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : option.available
                  ? "border-border/50 hover:border-border"
                  : "border-border/30 opacity-50 cursor-not-allowed"
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
                <span className="text-sm font-medium">{option.label}</span>
                {!option.available && (
                  <p className="text-xs text-muted-foreground">Not available for this booking</p>
                )}
              </div>
              {option.available && (
                <span className={cn(
                  "text-xs font-medium",
                  option.fee === 0 ? "text-emerald-400" : "text-muted-foreground"
                )}>
                  {option.fee === 0 ? "Free" : `+$${option.fee}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-500/10 text-xs mb-4">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Changes within {freeModificationWindow} of departure may incur additional fees
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel Booking
        </Button>
        <Button 
          size="sm" 
          className="flex-1 bg-gradient-to-r from-primary to-teal-500"
          disabled={!selectedOption}
          onClick={handleContinue}
        >
          <Check className="w-3 h-3 mr-1" />
          Continue
        </Button>
      </div>
    </div>
  );
};

export default TripModificationWidget;
