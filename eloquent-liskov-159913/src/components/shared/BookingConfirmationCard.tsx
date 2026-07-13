import { 
  CheckCircle2, 
  Plane, 
  Hotel, 
  Car,
  Clock,
  MapPin,
  Calendar,
  Download,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookingConfirmationCardProps {
  className?: string;
  type?: "flight" | "hotel" | "car";
  confirmationCode?: string;
  status?: "confirmed" | "pending" | "processing";
}

const typeConfig = {
  flight: { 
    icon: Plane, 
    color: "text-sky-500", 
    bg: "bg-sky-500/10",
    title: "Flight Confirmed",
    details: "NYC → Paris • Jun 15, 2024"
  },
  hotel: { 
    icon: Hotel, 
    color: "text-amber-500", 
    bg: "bg-amber-500/10",
    title: "Hotel Reserved",
    details: "Le Grand Hotel • 5 nights"
  },
  car: { 
    icon: Car, 
    color: "text-emerald-500", 
    bg: "bg-emerald-500/10",
    title: "Car Rental Booked",
    details: "BMW 3 Series • 7 days"
  },
};

const statusConfig = {
  confirmed: { label: "Confirmed", color: "bg-emerald-500/10 text-emerald-500" },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500" },
  processing: { label: "Processing", color: "bg-sky-500/10 text-sky-500" },
};

const BookingConfirmationCard = ({ 
  className, 
  type = "flight",
  confirmationCode = "ZV-2024-ABC123",
  status = "confirmed"
}: BookingConfirmationCardProps) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-5 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 relative overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.01]",
      className
    )}>
      {/* Success Animation Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", config.bg)}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold">{config.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{config.details}</p>
          </div>
        </div>
        <Badge className={statusConfig[status].color}>
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* Confirmation Code */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/30 mb-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Confirmation Code</p>
            <p className="text-lg font-mono font-bold tracking-wider">{confirmationCode}</p>
          </div>
          <div className="p-2 rounded-lg bg-background">
            <QrCode className="w-10 h-10 text-foreground" />
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">Jun 15</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">10:30 AM</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">Terminal 4</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl active:scale-95 transition-all duration-200 touch-manipulation">
          <Download className="w-4 h-4 mr-1" />
          E-Ticket
        </Button>
        <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-teal-500 rounded-xl shadow-md active:scale-95 transition-all duration-200 touch-manipulation">
          View Details
        </Button>
      </div>
    </div>
  );
};

export default BookingConfirmationCard;
