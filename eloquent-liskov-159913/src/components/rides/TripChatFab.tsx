import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import TripChatSheet from "./TripChatSheet";

interface Props {
  rideRequestId: string;
  counterpartName?: string;
  senderRole: "rider" | "driver";
  className?: string;
}

export default function TripChatFab({ rideRequestId, counterpartName, senderRole, className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className={`fixed right-4 z-40 w-12 h-12 rounded-full shadow-lg bg-emerald-500 hover:bg-emerald-600 ${className ?? ""}`}
        style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 6rem)" }}
        aria-label="Open trip chat"
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </Button>
      <TripChatSheet open={open} onOpenChange={setOpen} rideRequestId={rideRequestId} counterpartName={counterpartName} senderRole={senderRole} />
    </>
  );
}
