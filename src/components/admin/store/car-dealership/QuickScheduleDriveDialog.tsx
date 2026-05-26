/**
 * QuickScheduleDriveDialog — mini-dialog to schedule a test drive from a lead.
 *
 * Surfaces only the editable fields (when / duration / status / notes); the
 * customer and vehicle come from the lead and are shown as a read-only summary
 * at the top so the user can see the context at a glance.
 *
 * Used by CarDealershipLeadsSection from the per-card ⋯ menu.
 */
import { useEffect, useState } from "react";
import { Car, User, Calendar, AlarmClock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type { DealershipLead } from "@/hooks/car-dealership/useDealershipLeads";
import type {
  DealershipTestDriveDraft, DealershipTestDriveStatus,
} from "@/hooks/car-dealership/useDealershipTestDrives";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead: DealershipLead | null;
  saving: boolean;
  onSubmit: (draft: DealershipTestDriveDraft) => Promise<void> | void;
}

// Default scheduled time = next round half-hour, at least 1 hour from now.
function defaultScheduledAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  // Round to next half-hour
  const m = d.getMinutes();
  d.setMinutes(m < 30 ? 30 : 60, 0, 0);
  return d.toISOString();
}

// Strip seconds for datetime-local input
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function QuickScheduleDriveDialog({
  open, onOpenChange, lead, saving, onSubmit,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt());
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState<DealershipTestDriveStatus>("scheduled");
  const [notes, setNotes] = useState("");

  // Reset on (re)open
  useEffect(() => {
    if (open) {
      setScheduledAt(defaultScheduledAt());
      setDuration(30);
      setStatus("scheduled");
      setNotes("");
    }
  }, [open]);

  if (!lead) return null;

  const handleSubmit = async () => {
    const draft: DealershipTestDriveDraft = {
      lead_id: lead.id,
      vehicle_id: lead.vehicle_id,
      customer_id: lead.customer_id,
      salesperson_user_id: lead.assigned_to_user_id,
      customer_name: lead.display_name,
      customer_phone: lead.phone,
      vehicle_label: lead.vehicle_label ?? "",
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      status,
      start_odometer: null,
      end_odometer: null,
      start_fuel_level: null,
      end_fuel_level: null,
      notes: notes.trim() || null,
      cancellation_reason: null,
      completed_at: null,
    };
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule test drive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Read-only context from lead ── */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold truncate">{lead.display_name}</span>
              {lead.phone && (
                <span className="text-xs text-muted-foreground truncate">· {lead.phone}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              {lead.vehicle_label ? (
                <span className="truncate">{lead.vehicle_label}</span>
              ) : (
                <span className="text-muted-foreground italic">No vehicle linked — the rep can pick at the lot</span>
              )}
            </div>
          </div>

          {/* ── Editable fields ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <AlarmClock className="h-3.5 w-3.5" /> When
              </Label>
              <Input
                type="datetime-local"
                value={toLocalInput(scheduledAt)}
                onChange={(e) => setScheduledAt(new Date(e.target.value).toISOString())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DealershipTestDriveStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests, accompanying party, route preference..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Scheduling..." : "Schedule drive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
