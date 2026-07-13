/**
 * CheckInOutCard - 2x2 time pickers + quick-fill standard preset.
 */
import { Clock, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  checkInFrom?: string;
  checkInUntil?: string;
  checkOutFrom?: string;
  checkOutUntil?: string;
  onChange: (patch: { check_in_from?: string; check_in_until?: string; check_out_from?: string; check_out_until?: string }) => void;
}

export default function CheckInOutCard({ checkInFrom, checkInUntil, checkOutFrom, checkOutUntil, onChange }: Props) {
  const fillStandard = () =>
    onChange({ check_in_from: "15:00", check_in_until: "23:00", check_out_from: "07:00", check_out_until: "11:00" });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-[13px]"><Clock className="h-3.5 w-3.5" /> Check-in & check-out windows</CardTitle>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={fillStandard}>
          <Wand2 className="h-3 w-3" /> Standard (15:00 / 11:00)
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        <div>
          <Label className="text-[11px] text-muted-foreground">Check-in from</Label>
          <Input type="time" value={checkInFrom || ""} onChange={e => onChange({ check_in_from: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Check-in until</Label>
          <Input type="time" value={checkInUntil || ""} onChange={e => onChange({ check_in_until: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Check-out from</Label>
          <Input type="time" value={checkOutFrom || ""} onChange={e => onChange({ check_out_from: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Check-out until</Label>
          <Input type="time" value={checkOutUntil || ""} onChange={e => onChange({ check_out_until: e.target.value })} className="h-9" />
        </div>
      </CardContent>
    </Card>
  );
}
