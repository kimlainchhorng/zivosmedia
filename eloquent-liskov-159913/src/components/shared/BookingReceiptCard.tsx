import { 
  Receipt, 
  Download,
  Mail,
  Printer,
  CheckCircle2,
  Plane,
  Hotel,
  Car,
  CreditCard,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BookingReceiptCardProps {
  className?: string;
}

const BookingReceiptCard = ({ className }: BookingReceiptCardProps) => {
  const bookingItems = [
    { type: "flight", label: "NYC → Paris (Round Trip)", price: 899 },
    { type: "hotel", label: "Le Grand Hotel (5 nights)", price: 1250 },
    { type: "car", label: "BMW 3 Series (7 days)", price: 490 },
  ];

  const subtotal = bookingItems.reduce((sum, item) => sum + item.price, 0);
  const taxes = Math.round(subtotal * 0.08);
  const discount = 150;
  const milesUsed = 5000;
  const milesValue = 50;
  const total = subtotal + taxes - discount - milesValue;

  const typeIcons = {
    flight: Plane,
    hotel: Hotel,
    car: Car,
  };

  return (
    <div className={cn("p-5 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Booking Receipt</h3>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-500 font-medium">Confirmed</span>
        </div>
      </div>

      {/* Order ID */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Order ID</span>
          <span className="font-mono text-sm font-bold">ZV-2024-ABC123</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {bookingItems.map((item, index) => {
          const Icon = typeIcons[item.type as keyof typeof typeIcons];
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-sm font-medium">${item.price}</span>
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />

      {/* Calculations */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxes & Fees</span>
          <span>${taxes}</span>
        </div>
        <div className="flex justify-between text-emerald-400">
          <div className="flex items-center gap-1">
            <Gift className="w-3 h-3" />
            <span>Bundle Discount</span>
          </div>
          <span>-${discount}</span>
        </div>
        <div className="flex justify-between text-amber-400">
          <div className="flex items-center gap-1">
            <span>ZIVO Miles ({milesUsed.toLocaleString()})</span>
          </div>
          <span>-${milesValue}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Total */}
      <div className="flex justify-between items-center mb-4">
        <span className="font-medium">Total Paid</span>
        <span className="text-2xl font-bold">${total.toLocaleString()}</span>
      </div>

      {/* Payment Method */}
      <div className="p-3 rounded-xl bg-muted/20 border border-border/30 mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Visa •••• 4242</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="w-3 h-3 mr-1" />
          PDF
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Mail className="w-3 h-3 mr-1" />
          Email
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Printer className="w-3 h-3 mr-1" />
          Print
        </Button>
      </div>
    </div>
  );
};

export default BookingReceiptCard;
