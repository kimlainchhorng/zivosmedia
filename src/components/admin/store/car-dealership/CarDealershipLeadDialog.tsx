/**
 * Lead add/edit dialog — with Activity Log tab when editing.
 */
import { useEffect, useState } from "react";
import {
  Phone, Mail, StickyNote, Calendar, Car, Handshake, ArrowRightLeft,
  MoreHorizontal, Plus, Trash2, Loader2, SendHorizonal,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  DealershipLead, DealershipLeadDraft, DealershipLeadSource, DealershipLeadStatus,
} from "@/hooks/car-dealership/useDealershipLeads";
import {
  useDealershipLeadActivities,
  type DealershipActivityType,
  type DealershipLeadActivity,
} from "@/hooks/car-dealership/useDealershipLeadActivities";

// ─── activity type config ──────────────────────────────────────────────────
const ACTIVITY_TYPES: Array<{ value: DealershipActivityType; label: string; Icon: React.ElementType; color: string }> = [
  { value: "note",          label: "Note",          Icon: StickyNote,      color: "text-zinc-500" },
  { value: "call",          label: "Call",          Icon: Phone,           color: "text-blue-500" },
  { value: "email",         label: "Email",         Icon: Mail,            color: "text-indigo-500" },
  { value: "meeting",       label: "Meeting",       Icon: Calendar,        color: "text-violet-500" },
  { value: "test_drive",    label: "Test drive",    Icon: Car,             color: "text-amber-500" },
  { value: "offer_made",    label: "Offer made",    Icon: Handshake,       color: "text-emerald-500" },
  { value: "status_change", label: "Status change", Icon: ArrowRightLeft,  color: "text-rose-500" },
  { value: "other",         label: "Other",         Icon: MoreHorizontal,  color: "text-muted-foreground" },
];

const activityConfig = (type: DealershipActivityType) =>
  ACTIVITY_TYPES.find((t) => t.value === type) ?? ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];

const fmtOccurred = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

// ─── lead form helpers ─────────────────────────────────────────────────────
const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  return Math.round(parseFloat(cleaned) * 100);
};
const toDollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toString());

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

// ─── props ─────────────────────────────────────────────────────────────────
interface Props {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DealershipLead | null;
  saving: boolean;
  onSubmit: (draft: DealershipLeadDraft) => Promise<void> | void;
}

// ─── activity log panel ────────────────────────────────────────────────────
function ActivityLog({ storeId, leadId }: { storeId: string; leadId: string }) {
  const { activities, loading, saving, log, remove } = useDealershipLeadActivities(storeId, leadId);
  const [type, setType] = useState<DealershipActivityType>("note");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("");

  const handleLog = async () => {
    if (!summary.trim()) return;
    const ok = await log({ activity_type: type, summary, body: body || null, outcome: outcome || null });
    if (ok) {
      setSummary("");
      setBody("");
      setOutcome("");
      toast.success("Activity logged.");
    } else {
      toast.error("Couldn't save activity.");
    }
  };

  const handleDelete = async (a: DealershipLeadActivity) => {
    const ok = await remove(a.id);
    if (!ok) toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      {/* Log form */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Log activity</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DealershipActivityType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-1.5">
                      <t.Icon className={cn("h-3 w-3", t.color)} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Outcome (optional)</Label>
            <Input
              className="h-8 text-xs"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Left voicemail, replied, etc."
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Summary *</Label>
          <Input
            className="h-8 text-xs"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Called about 2023 Camry, interested in test drive"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleLog(); } }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            rows={2}
            className="text-xs resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detailed notes..."
          />
        </div>
        <Button
          size="sm"
          className="w-full h-8"
          onClick={handleLog}
          disabled={saving || !summary.trim()}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <SendHorizonal className="h-3 w-3 mr-1" />}
          Log
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          No activities yet — log your first touchpoint above.
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {activities.map((a) => {
            const cfg = activityConfig(a.activity_type);
            return (
              <div key={a.id} className="relative flex gap-3 pb-4 group">
                {/* icon bubble */}
                <div className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm",
                )}>
                  <cfg.Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                {/* content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{a.summary}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {cfg.label} · {fmtOccurred(a.occurred_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {a.body && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                  )}
                  {a.outcome && (
                    <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5">
                      {a.outcome}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── main dialog ───────────────────────────────────────────────────────────
export default function CarDealershipLeadDialog({
  storeId, open, onOpenChange, editing, saving, onSubmit,
}: Props) {
  const [draft, setDraft] = useState<DealershipLeadDraft>(emptyDraft());
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (editing) {
      const { id, store_id, created_at, updated_at, ...rest } = editing;
      setDraft(rest);
    } else if (open) {
      setDraft(emptyDraft());
    }
    setActiveTab("details");
  }, [editing, open]);

  const update = <K extends keyof DealershipLeadDraft>(key: K, value: DealershipLeadDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!draft.display_name.trim()) return;
    await onSubmit(draft);
  };

  const isEditing = editing !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle>{isEditing ? editing.display_name : "New lead"}</DialogTitle>
        </DialogHeader>

        {isEditing ? (
          /* Tabbed layout when editing */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-3 w-auto self-start shrink-0">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Activity log</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-2 mt-3 data-[state=inactive]:hidden">
              <LeadDetailsForm draft={draft} update={update} />
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 pb-2 mt-3 data-[state=inactive]:hidden">
              <ActivityLog storeId={storeId} leadId={editing.id} />
            </TabsContent>

            <div className="shrink-0 border-t px-6 py-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              {activeTab === "details" && (
                <Button onClick={handleSubmit} disabled={saving || !draft.display_name.trim()}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              )}
            </div>
          </Tabs>
        ) : (
          /* Simple layout when adding */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <LeadDetailsForm draft={draft} update={update} />
            </div>
            <div className="shrink-0 border-t px-6 py-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !draft.display_name.trim()}>
                {saving ? "Saving..." : "Add lead"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── extracted form so it can live in both layouts ─────────────────────────
function LeadDetailsForm({
  draft,
  update,
}: {
  draft: DealershipLeadDraft;
  update: <K extends keyof DealershipLeadDraft>(key: K, value: DealershipLeadDraft[K]) => void;
}) {
  return (
    <div className="space-y-4">
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
          <Input
            value={draft.lost_reason ?? ""}
            onChange={(e) => update("lost_reason", e.target.value || null)}
            placeholder="Went with competitor / price / etc."
          />
        </div>
      )}
    </div>
  );
}
