import { useState } from "react";
import { Plane, Clock, MapPin, QrCode, Download, Share2, Smartphone, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

interface BoardingPassWidgetProps {
  className?: string;
  passengerName?: string;
  flightNumber?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureCode?: string;
  arrivalCode?: string;
  departureTime?: string;
  gate?: string;
  seat?: string;
  boardingGroup?: string;
  bookingRef?: string;
  terminal?: string;
  airlineName?: string;
  boardingStatus?: "ready" | "boarding" | "final-call" | "departed";
  onDownloadPDF?: () => void;
  onAddToWallet?: (type: "apple" | "google") => void;
  onShare?: () => void;
}

const BoardingPassWidget = ({ 
  className,
  passengerName = "JOHN DOE",
  flightNumber = "AA 1234",
  departureCity = "New York",
  arrivalCity = "Los Angeles",
  departureCode = "JFK",
  arrivalCode = "LAX",
  departureTime = "08:45",
  gate = "B24",
  seat = "14A",
  boardingGroup = "2",
  bookingRef = "XK7F9M",
  terminal = "Terminal 4",
  airlineName = "ZIVO AIR",
  boardingStatus = "ready",
  onDownloadPDF,
  onAddToWallet,
  onShare
}: BoardingPassWidgetProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const statusConfig = {
    ready: { label: "Ready to Board", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    boarding: { label: "Boarding Now", color: "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" },
    "final-call": { label: "Final Call", color: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" },
    departed: { label: "Departed", color: "bg-muted/50 text-muted-foreground border-muted/30" },
  };

  const status = statusConfig[boardingStatus];

  return (
    <div className={cn("relative perspective-1000", className)}>
      <motion.div
        className="relative w-full cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of Pass */}
        <div 
          className={cn(
            "p-4 rounded-xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 shadow-xl backface-hidden",
            isFlipped && "pointer-events-none"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg">{airlineName}</p>
                <p className="text-xs text-muted-foreground">Boarding Pass</p>
              </div>
            </div>
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>

          {/* Passenger */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">PASSENGER</p>
            <p className="font-bold text-xl tracking-wide">{passengerName}</p>
          </div>

          {/* Route */}
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold">{departureCode}</p>
              <p className="text-xs text-muted-foreground">{departureCity}</p>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="flex-1 h-px bg-border/50" />
              <Plane className="w-5 h-5 mx-2 text-primary rotate-90" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{arrivalCode}</p>
              <p className="text-xs text-muted-foreground">{arrivalCity}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="p-2 rounded-xl bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">FLIGHT</p>
              <p className="font-bold text-sm">{flightNumber}</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">GATE</p>
              <p className="font-bold text-sm">{gate}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">SEAT</p>
              <p className="font-bold text-sm">{seat}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">GROUP</p>
              <p className="font-bold text-sm">{boardingGroup}</p>
            </div>
          </div>

          {/* Boarding Time */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">BOARDING TIME</p>
                <p className="font-bold">{departureTime}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">REF</p>
              <p className="font-mono font-bold">{bookingRef}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex items-center justify-center p-4 rounded-lg bg-white">
            <QRCodeSVG 
              value={`ZIVO-${bookingRef}-${flightNumber}-${seat}`}
              size={120}
              level="M"
            />
          </div>

          {/* Flip hint */}
          <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Tap to flip
          </p>
        </div>

        {/* Back of Pass */}
        <div 
          className={cn(
            "absolute inset-0 p-4 rounded-xl bg-card border border-border/50 shadow-xl backface-hidden",
            !isFlipped && "pointer-events-none"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Digital Pass Options</h3>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={onDownloadPDF}>
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => onAddToWallet?.("apple")}>
              <Smartphone className="w-4 h-4" />
              Add to Apple Wallet
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => onAddToWallet?.("google")}>
              <Smartphone className="w-4 h-4" />
              Add to Google Wallet
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={onShare}>
              <Share2 className="w-4 h-4" />
              Share Pass
            </Button>
          </div>

          {/* Important Info */}
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs font-medium mb-2">Important Information</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Arrive at gate 30 minutes before departure</li>
              <li>• Have valid ID ready for boarding</li>
              <li>• Check carry-on size restrictions</li>
              <li>• Electronic devices must be charged</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 p-3 rounded-lg bg-primary/10">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Gate {gate} • {terminal}</span>
          </div>

          {/* Flip hint */}
          <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Tap to flip
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BoardingPassWidget;
