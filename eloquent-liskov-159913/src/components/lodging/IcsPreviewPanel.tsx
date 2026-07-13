/**
 * IcsPreviewPanel — editable preview of the .ics calendar file before download.
 * Locks edits inside the host's prep window (`ics_lock_hours`, default 24h).
 */
import { useMemo, useState } from "react";
import { CalendarPlus, RotateCcw, MapPin, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildBookingIcs, downloadIcsFile, type IcsEventInput } from "@/lib/lodging/ics";
import { differenceInHours, format } from "date-fns";

interface Defaults {
  reference: string;
  storeName: string;
  roomName: string;
  storePhone?: string | null;
  storeUrl?: string | null;
  guestName: string;
  guestEmail?: string | null;
  checkIn: string;
  checkOut: string;
  defaultAddress: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  defaultTimezone: string;
  totalText?: string;
  cancellationText?: string;
  /** Hours before check-in when calendar edits become read-only. Default 24. */
  lockHours?: number;
}

interface Props {
  defaults: Defaults;
}

export function IcsPreviewPanel({ defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [ciTime, setCiTime] = useState(defaults.defaultCheckInTime);
  const [coTime, setCoTime] = useState(defaults.defaultCheckOutTime);
  const [address, setAddress] = useState(defaults.defaultAddress);

  const lockHours = Math.max(0, defaults.lockHours ?? 24);

  const hoursUntilCheckIn = useMemo(() => {
    try {
      const [h, m] = (defaults.defaultCheckInTime || "15:00").split(":").map(Number);
      const ci = new Date(defaults.checkIn);
      ci.setHours(h || 0, m || 0, 0, 0);
      return differenceInHours(ci, new Date());
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }, [defaults.checkIn, defaults.defaultCheckInTime]);

  const locked = hoursUntilCheckIn <= lockHours;

  const reset = () => {
    setCiTime(defaults.defaultCheckInTime);
    setCoTime(defaults.defaultCheckOutTime);
    setAddress(defaults.defaultAddress);
  };

  const formatPreview = (date: string, time: string) => {
    try {
      const [h, m] = time.split(":").map(Number);
      const d = new Date(date);
      d.setHours(h || 0, m || 0, 0, 0);
      return format(d, "EEE d MMM · h:mm a");
    } catch {
      return `${date} ${time}`;
    }
  };

  const download = () => {
    const useCiTime = locked ? defaults.defaultCheckInTime : ciTime;
    const useCoTime = locked ? defaults.defaultCheckOutTime : coTime;
    const useAddress = locked ? defaults.defaultAddress : address;
    const input: IcsEventInput = {
      reference: defaults.reference,
      storeName: defaults.storeName,
      roomName: defaults.roomName,
      storeAddress: useAddress || null,
      storePhone: defaults.storePhone || null,
      storeUrl: defaults.storeUrl || null,
      guestName: defaults.guestName,
      guestEmail: defaults.guestEmail || null,
      checkIn: defaults.checkIn,
      checkOut: defaults.checkOut,
      checkInTime: useCiTime,
      checkOutTime: useCoTime,
      timezone: defaults.defaultTimezone,
      totalText: defaults.totalText,
      cancellationText: defaults.cancellationText,
    };
    const ics = buildBookingIcs(input);
    downloadIcsFile(defaults.reference, ics);
  };

  if (!open) {
    return (
      <Button variant="outline" className="gap-1.5 w-full" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Add to calendar
      </Button>
    );
  }

  const previewCi = locked ? defaults.defaultCheckInTime : ciTime;
  const previewCo = locked ? defaults.defaultCheckOutTime : coTime;
  const previewAddress = locked ? defaults.defaultAddress : address;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold flex items-center gap-1.5">
          <CalendarPlus className="h-3.5 w-3.5 text-primary" /> Confirm calendar details
        </p>
        <span className="text-[10px] text-muted-foreground">TZ · {defaults.defaultTimezone}</span>
      </div>

      {locked ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 flex items-start gap-1.5">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          <p>
            Check-in is in <strong>{Math.max(0, hoursUntilCheckIn)}h</strong>. Calendar details are locked
            to match the host's prep window. Download will use the property defaults.
          </p>
        </div>
      ) : (
        lockHours > 0 && (
          <p className="text-[10px] text-muted-foreground -mt-1">
            Edits lock {lockHours}h before check-in.
          </p>
        )
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Check-in time</Label>
          <Input
            type="time"
            value={ciTime}
            onChange={(e) => setCiTime(e.target.value)}
            className="h-8 text-xs"
            readOnly={locked}
            disabled={locked}
          />
        </div>
        <div>
          <Label className="text-[11px]">Check-out time</Label>
          <Input
            type="time"
            value={coTime}
            onChange={(e) => setCoTime(e.target.value)}
            className="h-8 text-xs"
            readOnly={locked}
            disabled={locked}
          />
        </div>
      </div>

      <div>
        <Label className="text-[11px]">Address</Label>
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="text-xs"
          placeholder="Property address"
          readOnly={locked}
          disabled={locked}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-2 text-[11px] space-y-1">
        <div className="flex items-start gap-1.5">
          <Clock className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold">Check-in: {formatPreview(defaults.checkIn, previewCi)}</p>
            {previewAddress && <p className="text-muted-foreground flex items-start gap-1"><MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />{previewAddress}</p>}
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Clock className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">Check-out: {formatPreview(defaults.checkOut, previewCo)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {!locked ? (
          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={reset}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        ) : <div />}
        <Button size="sm" className="gap-1 h-8 text-xs font-bold" onClick={download}>
          <CalendarPlus className="h-3 w-3" /> Download .ics
        </Button>
      </div>
    </div>
  );
}
