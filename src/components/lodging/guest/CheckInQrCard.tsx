/**
 * CheckInQrCard shows a QR with the reservation reference for fast front-desk
 * scanning. Visible from 24h before check-in until check-out.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  reservationNumber: string;
  reservationId: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

export default function CheckInQrCard({
  reservationNumber,
  reservationId,
  checkIn,
  checkOut,
  status,
}: Props) {
  const hoursUntilCheckIn = differenceInHours(parseISO(checkIn), new Date());
  const hoursUntilCheckOut = differenceInHours(parseISO(checkOut), new Date());
  const visible =
    (hoursUntilCheckIn <= 24 && hoursUntilCheckOut >= 0) ||
    status === "checked_in";

  if (!visible || ["cancelled", "no_show", "checked_out"].includes(status)) return null;

  const payload = `zivo:lodge:${reservationId}`;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" /> Check-in code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-lg bg-white p-2 text-black" aria-label="Check-in QR code">
          <QRCodeSVG value={payload} size={112} level="M" includeMargin={false} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Show this at the front desk</p>
          <p className="font-mono font-bold text-lg mt-1">{reservationNumber}</p>
          <p className="text-xs text-muted-foreground mt-1">No need to print. Screen scan works.</p>
        </div>
      </CardContent>
    </Card>
  );
}
