/**
 * CheckInQrCard — shows a QR with the reservation reference for fast front-desk
 * scanning. Visible from 24h before check-in until check-out.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";

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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" /> Check-in code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <img
          src={qrUrl}
          alt="Check-in QR code"
          width={120}
	          height={120}
	          className="rounded-lg bg-white p-2"
	          loading="lazy"
	          decoding="async"
	        />
        <div>
          <p className="text-xs text-muted-foreground">Show this at the front desk</p>
          <p className="font-mono font-bold text-lg mt-1">{reservationNumber}</p>
          <p className="text-xs text-muted-foreground mt-1">No need to print — screen scan works.</p>
        </div>
      </CardContent>
    </Card>
  );
}
