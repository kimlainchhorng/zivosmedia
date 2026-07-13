/**
 * StayHeroCard — header for the guest trip detail page: status, dates, room.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  propertyName: string;
  roomLabel?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  hold: "outline",
  confirmed: "secondary",
  checked_in: "default",
  checked_out: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

const statusLabel: Record<string, string> = {
  hold: "On hold",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export default function StayHeroCard({
  propertyName,
  roomLabel,
  checkIn,
  checkOut,
  nights,
  status,
}: Props) {
  const ci = parseISO(checkIn);
  const co = parseISO(checkOut);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Hotel className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant={statusVariant[status] || "outline"} className="mb-2">
              {statusLabel[status] || status}
            </Badge>
            <h1 className="text-2xl font-bold leading-tight">{propertyName}</h1>
            {roomLabel && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {roomLabel}
              </p>
            )}
          </div>
        </div>
      </div>
      <CardContent className="grid grid-cols-3 gap-4 p-6 border-t">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Check-in</p>
          <p className="font-semibold mt-1">{format(ci, "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(ci, "EEEE")}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Check-out</p>
          <p className="font-semibold mt-1">{format(co, "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(co, "EEEE")}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Nights</p>
          <p className="font-semibold mt-1 text-2xl">{nights}</p>
        </div>
      </CardContent>
    </Card>
  );
}
