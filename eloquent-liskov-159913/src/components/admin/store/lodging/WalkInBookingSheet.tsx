/**
 * WalkInBookingSheet - quick walk-in booking dialog.
 * Creates a lodge_reservations row with status 'checked_in', today→tomorrow.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

interface Props {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillGuestName?: string;
  prefillRoom?: string | null;
}

export default function WalkInBookingSheet({ storeId, open, onOpenChange, prefillGuestName = "", prefillRoom = "" }: Props) {
  const { upsert } = useLodgeReservations(storeId, "all");
  const [guestName, setGuestName] = useState(prefillGuestName);
  const [roomNumber, setRoomNumber] = useState(prefillRoom || "");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rate, setRate] = useState(0);
  const [phone, setPhone] = useState("");

  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 86400000));

  const submit = async () => {
    if (!guestName.trim()) { toast.error("Guest name is required"); return; }
    try {
      await upsert.mutateAsync({
        store_id: storeId,
        guest_name: guestName.trim(),
        guest_phone: phone.trim() || null as any,
        room_number: roomNumber.trim() || null as any,
        adults, children,
        check_in: today,
        check_out: tomorrow,
        nights: 1,
        status: "checked_in" as any,
        source: "walk_in",
        rate_cents: Math.round((rate || 0) * 100),
        total_cents: Math.round((rate || 0) * 100),
      });
      toast.success("Walk-in checked in", { description: `${guestName} · ${roomNumber || "no room set"}` });
      onOpenChange(false);
      setGuestName(""); setRoomNumber(""); setAdults(1); setChildren(0); setRate(0); setPhone("");
    } catch (e: any) {
      toast.error(e?.message || "Could not create walk-in");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LogIn className="h-4 w-4" /> New walk-in booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Guest name</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Room</Label>
              <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 204" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Adults</Label>
              <Input type="number" min={1} value={adults} onChange={(e) => setAdults(parseInt(e.target.value || "1", 10))} />
            </div>
            <div>
              <Label>Children</Label>
              <Input type="number" min={0} value={children} onChange={(e) => setChildren(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <Label>Rate ($)</Label>
              <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(parseFloat(e.target.value || "0"))} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Check-in today ({today}) · Check-out tomorrow ({tomorrow}). Status: Checked-in.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Check in guest"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
