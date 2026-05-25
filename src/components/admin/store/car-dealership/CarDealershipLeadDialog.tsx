/**
 * Lead add/edit dialog.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type {
  DealershipLead, DealershipLeadDraft, DealershipLeadSource, DealershipLeadStatus,
} from "@/hooks/car-dealership/useDealershipLeads";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DealershipLead | null;
  saving: boolean;
  onSubmit: (draft: DealershipLeadDraft) => Promise<void> | void;
}

const emptyDraft = (): DealershipLeadDraft => ({
  customer_id: null,
  vehicle_id: null,
  assigned_to_user_id: null,
  display_name: "",
  email: null,
  phone: null,
  vehicle_label: null,
  source: "walk_in",
  status: "new",
  budget_min_cents: null,
  budget_max_cents: null,
  desired_make: null,
  desired_model: null,
  desired_year_min: null,
  desired_year_max: null,
  trade_in_interested: false,
  financing_needed: false,
  notes: null,
  last_contacted_at: null,
  next_followup_at: null,
  lost_reason: null,
});

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  return Math.round(parseFloat(cleaned) * 100);
};
const toDollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toString());

export default function CarDealershipLeadDialog({ open, onOpenChange, editing, saving, onSubmit }: Props) {
  const [draft, setDraft] = useState<DealershipLeadDraft>(emptyDraft());

  useEffect(() => {
    if (editing) {
      const { id, store_id, created_at, updated_at, ...rest } = editing;
      setDraft(rest);
    } else if (open) {
      setDraft(emptyDraft());
    }
  }, [editing, open]);

  const update = <K extends keyof DealershipLeadDraft>(key: K, value: DealershipLeadDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!draft.display_name.trim()) return;
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={draft.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="Jane Doe" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={draft.phone ?? ""} onChange={(e) => update("phone", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={draft.email ?? ""} onChange={(e) => update("email", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={draft.source} onValueChange={(v) => update("source", v as DealershipLeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="web">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social media</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="auto_trader">AutoTrader</SelectItem>
                  <SelectItem value="cars_com">Cars.com</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => update("status", v as DealershipLeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="test_drive_scheduled">Test drive scheduled</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vehicle of interest</Label>
            <Input
              value={draft.vehicle_label ?? ""}
              onChange={(e) => update("vehicle_label", e.target.value || null)}
              placeholder="2023 Toyota Camry SE"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Budget min ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.budget_min_cents)}
                onChange={(e) => update("budget_min_cents", fromDollars(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Budget max ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.budget_max_cents)}
                onChange={(e) => update("budget_max_cents", fromDollars(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label className="text-sm">Trade-in</Label>
              <Switch checked={draft.trade_in_interested} onCheckedChange={(v) => update("trade_in_interested", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label className="text-sm">Financing</Label>
              <Switch checked={draft.financing_needed} onCheckedChange={(v) => update("financing_needed", v)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Next follow-up</Label>
            <Input
              type="datetime-local"
              value={draft.next_followup_at ? draft.next_followup_at.slice(0, 16) : ""}
              onChange={(e) => update("next_followup_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value || null)}
              placeholder="Discussion notes, preferences, urgency..."
            />
          </div>

          {draft.status === "lost" && (
            <div className="space-y-1.5">
              <Label>Lost reason</Label>
              <Input value={draft.lost_reason ?? ""} onChange={(e) => update("lost_reason", e.target.value || null)} placeholder="Went with competitor / price / etc" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !draft.display_name.trim()}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
