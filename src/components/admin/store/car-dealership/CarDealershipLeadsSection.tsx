/**
 * Leads / sales pipeline section.
 * - "Today's Queue" strip above the Kanban for overdue + due-today follow-ups
 * - Kanban board grouped by status with quick follow-up date setter
 * - Per-card move buttons for frictionless status changes
 */
import { memo, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, ClipboardList, Phone, Mail,
  Calendar, Loader2, AlarmClock, Check, ChevronDown, X,
  MoreHorizontal, FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipLeads,
  type DealershipLead,
  type DealershipLeadStatus,
} from "@/hooks/car-dealership/useDealershipLeads";
import { useDealershipTestDrives, type DealershipTestDriveDraft } from "@/hooks/car-dealership/useDealershipTestDrives";
import { useDealershipSales, type DealershipSaleDraft } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import CarDealershipLeadDialog from "./CarDealershipLeadDialog";
import QuickScheduleDriveDialog from "./QuickScheduleDriveDialog";
import QuickCreateDealDialog, { type QuickDealSeed } from "./QuickCreateDealDialog";

// ─── Kanban column config ─────────────────────────────────────────────────────

const COLUMNS: Array<{ id: DealershipLeadStatus; label: string; color: string }> = [
  { id: "new",                   label: "New",        color: "border-blue-500/40 bg-blue-500/5" },
  { id: "contacted",             label: "Contacted",  color: "border-indigo-500/40 bg-indigo-500/5" },
  { id: "qualified",             label: "Qualified",  color: "border-amber-500/40 bg-amber-500/5" },
  { id: "test_drive_scheduled",  label: "Test drive", color: "border-violet-500/40 bg-violet-500/5" },
  { id: "negotiating",           label: "Negotiating",color: "border-orange-500/40 bg-orange-500/5" },
  { id: "won",                   label: "Won",        color: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "lost",                  label: "Lost",       color: "border-zinc-500/40 bg-zinc-500/5" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0); // 9 am on target day
  return d.toISOString();
};

const isOverdue = (iso: string | null) =>
  !!iso && new Date(iso).getTime() < Date.now();

const isDueToday = (iso: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

// ─── Quick follow-up date picker ─────────────────────────────────────────────

interface FollowupPickerProps {
  lead: DealershipLead;
  onSet: (iso: string | null) => void;
}

function FollowupPicker({ lead, onSet }: FollowupPickerProps) {
  const hasDate = !!lead.next_followup_at;
  const overdue = isOverdue(lead.next_followup_at);
  const dueToday = isDueToday(lead.next_followup_at);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
            overdue
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : dueToday
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : hasDate
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
          onClick={(e) => e.stopPropagation()}
          title="Set follow-up date"
        >
          <AlarmClock className="h-2.5 w-2.5" />
          {hasDate ? fmtDate(lead.next_followup_at) : "Follow up"}
          <ChevronDown className="h-2 w-2 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onSet(addDays(0))}>
          <AlarmClock className="h-3.5 w-3.5 mr-2" />Today
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSet(addDays(1))}>
          Tomorrow
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSet(addDays(3))}>
          In 3 days
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSet(addDays(7))}>
          Next week
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSet(addDays(14))}>
          In 2 weeks
        </DropdownMenuItem>
        {hasDate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSet(null)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-2" />Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Conversion actions menu ─────────────────────────────────────────────────

const CAN_SCHEDULE_DRIVE: DealershipLeadStatus[] = [
  "new", "contacted", "qualified", "test_drive_scheduled", "negotiating",
];
const CAN_CREATE_DEAL: DealershipLeadStatus[] = [
  "qualified", "test_drive_scheduled", "negotiating",
];

interface ActionsMenuProps {
  lead: DealershipLead;
  onScheduleDrive: (l: DealershipLead) => void;
  onCreateDeal: (l: DealershipLead) => void;
  /** Optional compact mode (icon-only, smaller) for tight kanban cards. */
  compact?: boolean;
}

function LeadActionsMenu({ lead, onScheduleDrive, onCreateDeal, compact = false }: ActionsMenuProps) {
  const canDrive = CAN_SCHEDULE_DRIVE.includes(lead.status);
  const canDeal = CAN_CREATE_DEAL.includes(lead.status);
  if (!canDrive && !canDeal) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded transition-colors",
            compact
              ? "h-5 w-5 text-muted-foreground/60 hover:text-foreground hover:bg-muted"
              : "rounded px-2 py-1 text-[10px] font-medium bg-muted hover:bg-muted/80 gap-1",
          )}
          onClick={(e) => e.stopPropagation()}
          title="Convert lead"
          aria-label="Convert lead"
        >
          <MoreHorizontal className={compact ? "h-3 w-3" : "h-2.5 w-2.5"} />
          {!compact && <span>Convert</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {canDrive && (
          <DropdownMenuItem onSelect={() => onScheduleDrive(lead)}>
            <Calendar className="h-3.5 w-3.5 mr-2 text-violet-600" />
            Schedule test drive
          </DropdownMenuItem>
        )}
        {canDeal && (
          <DropdownMenuItem onSelect={() => onCreateDeal(lead)}>
            <FileSignature className="h-3.5 w-3.5 mr-2 text-emerald-600" />
            Create deal
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Today's queue strip ──────────────────────────────────────────────────────

interface QueueProps {
  leads: DealershipLead[];
  onEdit: (l: DealershipLead) => void;
  onSnooze: (l: DealershipLead, iso: string | null) => void;
  onScheduleDrive: (l: DealershipLead) => void;
  onCreateDeal: (l: DealershipLead) => void;
}

function TodaysQueue({ leads, onEdit, onSnooze, onScheduleDrive, onCreateDeal }: QueueProps) {
  const [collapsed, setCollapsed] = useState(false);

  const queued = useMemo(
    () => leads
      .filter((l) => l.next_followup_at && (isOverdue(l.next_followup_at) || isDueToday(l.next_followup_at)))
      .sort((a, b) => new Date(a.next_followup_at!).getTime() - new Date(b.next_followup_at!).getTime()),
    [leads],
  );

  if (queued.length === 0) return null;

  const overdueCount = queued.filter((l) => isOverdue(l.next_followup_at)).length;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-amber-700" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Follow-up queue
          </span>
          <Badge className="border-0 bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px]">
            {queued.length}
          </Badge>
          {overdueCount > 0 && (
            <Badge className="border-0 bg-red-500/20 text-red-700 text-[10px]">
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-amber-700 transition-transform", collapsed && "-rotate-90")} />
      </button>

      {/* Cards */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 pt-0">
          {queued.map((l) => {
            const over = isOverdue(l.next_followup_at);
            return (
              <div
                key={l.id}
                className="rounded-lg border bg-card p-3 flex flex-col gap-1.5 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => onEdit(l)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{l.display_name}</p>
                  <Badge className={cn(
                    "border-0 text-[9px] shrink-0",
                    over ? "bg-red-500/15 text-red-700" : "bg-amber-500/15 text-amber-700",
                  )}>
                    {over ? "Overdue" : "Today"}
                  </Badge>
                </div>

                {l.vehicle_label && (
                  <p className="text-xs text-muted-foreground truncate">{l.vehicle_label}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-2.5 w-2.5" />{l.phone}
                    </a>
                  )}
                  {l.email && <Mail className="h-2.5 w-2.5" />}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-muted hover:bg-muted/80"
                      >
                        <AlarmClock className="h-2.5 w-2.5" />Snooze
                        <ChevronDown className="h-2 w-2 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      {[
                        { label: "Tomorrow",   days: 1 },
                        { label: "In 3 days",  days: 3 },
                        { label: "Next week",  days: 7 },
                        { label: "In 2 weeks", days: 14 },
                      ].map(({ label, days }) => (
                        <DropdownMenuItem key={days} onSelect={() => onSnooze(l, addDays(days))}>
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
                    onClick={() => onSnooze(l, null)}
                  >
                    <Check className="h-2.5 w-2.5" />Done
                  </button>

                  <LeadActionsMenu
                    lead={l}
                    onScheduleDrive={onScheduleDrive}
                    onCreateDeal={onCreateDeal}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── main section ─────────────────────────────────────────────────────────────

interface Props { storeId: string; }

function CarDealershipLeadsSectionInner({ storeId }: Props) {
  const { leads, loading, saving, create, update, remove } = useDealershipLeads(storeId);
  const { create: createTestDrive, saving: savingDrive } = useDealershipTestDrives(storeId);
  const { create: createSale, saving: savingSale } = useDealershipSales(storeId);
  const { vehicles } = useDealershipInventory(storeId);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipLead | null>(null);
  const [scheduleDriveFor, setScheduleDriveFor] = useState<DealershipLead | null>(null);
  const [createDealFor, setCreateDealFor] = useState<DealershipLead | null>(null);

  // Vehicle lookup for seeding deal sale_price from the linked vehicle's asking price.
  const vehicleMap = useMemo(() => {
    const m = new Map<string, { asking_price_cents: number; vin: string | null; label: string }>();
    for (const v of vehicles) {
      m.set(v.id, {
        asking_price_cents: v.asking_price_cents,
        vin: v.vin,
        label: `${v.year ?? ""} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`.trim(),
      });
    }
    return m;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return leads;
    return leads.filter((l) =>
      `${l.display_name} ${l.email ?? ""} ${l.phone ?? ""} ${l.vehicle_label ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const out: Record<DealershipLeadStatus, DealershipLead[]> = {
      new: [], contacted: [], qualified: [], test_drive_scheduled: [],
      negotiating: [], won: [], lost: [],
    };
    for (const l of filtered) out[l.status].push(l);
    return out;
  }, [filtered]);

  const handleAdd = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (l: DealershipLead) => { setEditing(l); setDialogOpen(true); };

  const handleDelete = async (l: DealershipLead) => {
    if (!window.confirm(`Delete lead "${l.display_name}"?`)) return;
    const ok = await remove(l.id);
    if (ok) toast.success("Lead removed.");
    else toast.error("Couldn't delete lead.");
  };

  const moveTo = async (l: DealershipLead, status: DealershipLeadStatus) => {
    if (l.status === status) return;
    const ok = await update(l.id, { status });
    if (!ok) toast.error("Couldn't update status.");
  };

  const setFollowup = async (l: DealershipLead, iso: string | null) => {
    const ok = await update(l.id, { next_followup_at: iso });
    if (ok) {
      if (iso === null) toast.success("Follow-up cleared.");
      else toast.success(`Follow-up set for ${fmtDate(iso)}.`);
    } else {
      toast.error("Couldn't update follow-up.");
    }
  };

  const handleSubmit = async (draft: Parameters<typeof create>[0]) => {
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Lead updated."); setDialogOpen(false); }
      else toast.error("Couldn't save changes.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Lead added."); setDialogOpen(false); }
      else toast.error("Couldn't add lead.");
    }
  };

  // ── Conversion: lead → test drive ─────────────────────────────────────────
  const handleDriveSubmit = async (driveDraft: DealershipTestDriveDraft) => {
    if (!scheduleDriveFor) return;
    const drive = await createTestDrive(driveDraft);
    if (!drive) {
      toast.error("Couldn't schedule test drive.");
      return;
    }
    const lead = scheduleDriveFor;
    // Auto-advance the lead's status if it's still earlier in the funnel.
    const earlier: DealershipLeadStatus[] = ["new", "contacted", "qualified"];
    if (earlier.includes(lead.status)) {
      await update(lead.id, { status: "test_drive_scheduled" });
      toast.success("Test drive scheduled · lead advanced.");
    } else {
      toast.success("Test drive scheduled.");
    }
    setScheduleDriveFor(null);
  };

  // ── Conversion: lead → deal ───────────────────────────────────────────────
  const buildDealSeed = (lead: DealershipLead): QuickDealSeed => {
    const v = lead.vehicle_id ? vehicleMap.get(lead.vehicle_id) : null;
    return {
      lead_id: lead.id,
      customer_id: lead.customer_id,
      customer_name: lead.display_name,
      customer_phone: lead.phone,
      customer_email: lead.email,
      vehicle_id: lead.vehicle_id,
      vehicle_label: v?.label ?? lead.vehicle_label ?? "",
      vehicle_vin: v?.vin ?? null,
      sale_price_cents: v?.asking_price_cents ?? 0,
      salesperson_user_id: lead.assigned_to_user_id,
    };
  };

  const handleDealSubmit = async (dealDraft: DealershipSaleDraft) => {
    if (!createDealFor) return;
    const deal = await createSale(dealDraft);
    if (!deal) {
      toast.error("Couldn't create deal.");
      return;
    }
    const lead = createDealFor;
    if (lead.status !== "won") {
      await update(lead.id, { status: "won" });
      toast.success("Deal created · lead marked won.");
    } else {
      toast.success("Deal created.");
    }
    setCreateDealFor(null);
  };

  return (
    <div className="space-y-4">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Leads & Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} total · {leads.filter((l) => !["won", "lost"].includes(l.status)).length} active
          </p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />New lead</Button>
      </div>

      {/* ── search ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone, email, or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture your first prospect to start building the pipeline.
          </p>
          <Button onClick={handleAdd} className="mt-4">
            <Plus className="h-4 w-4 mr-1" />New lead
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Today's follow-up queue ── */}
          <TodaysQueue
            leads={filtered}
            onEdit={handleEdit}
            onSnooze={setFollowup}
            onScheduleDrive={setScheduleDriveFor}
            onCreateDeal={setCreateDealFor}
          />

          {/* ── Kanban ── */}
          <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className={cn("rounded-xl border-2 border-dashed p-2 min-h-[200px]", col.color)}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide">{col.label}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {grouped[col.id].length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {grouped[col.id].map((l) => {
                    const over = isOverdue(l.next_followup_at);
                    const dueNow = isDueToday(l.next_followup_at);
                    return (
                      <Card
                        key={l.id}
                        className="p-2.5 bg-card cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleEdit(l)}
                      >
                        {/* Name + actions */}
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-semibold truncate flex-1">{l.display_name}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <LeadActionsMenu
                              lead={l}
                              onScheduleDrive={setScheduleDriveFor}
                              onCreateDeal={setCreateDealFor}
                              compact
                            />
                            <button
                              type="button"
                              className="opacity-40 hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); handleDelete(l); }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Vehicle interest */}
                        {l.vehicle_label && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {l.vehicle_label}
                          </p>
                        )}

                        {/* Contact */}
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {l.phone && (
                            <a
                              href={`tel:${l.phone}`}
                              className="flex items-center gap-1 hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-2.5 w-2.5" />{l.phone}
                            </a>
                          )}
                          {l.email && <Mail className="h-2.5 w-2.5" />}
                        </div>

                        {/* Follow-up picker */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <FollowupPicker lead={l} onSet={(iso) => setFollowup(l, iso)} />
                          {(over || dueNow) && !l.next_followup_at && null}
                        </div>

                        {/* Move-to buttons */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {COLUMNS.filter((c) => c.id !== l.status).slice(0, 3).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveTo(l, c.id); }}
                              className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CarDealershipLeadDialog
        storeId={storeId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />

      {/* ── Pipeline shortcuts ── */}
      <QuickScheduleDriveDialog
        open={!!scheduleDriveFor}
        onOpenChange={(o) => { if (!o) setScheduleDriveFor(null); }}
        lead={scheduleDriveFor}
        saving={savingDrive}
        onSubmit={handleDriveSubmit}
      />
      <QuickCreateDealDialog
        open={!!createDealFor}
        onOpenChange={(o) => { if (!o) setCreateDealFor(null); }}
        seed={createDealFor ? buildDealSeed(createDealFor) : null}
        saving={savingSale}
        onSubmit={handleDealSubmit}
      />
    </div>
  );
}

const CarDealershipLeadsSection = memo(CarDealershipLeadsSectionInner);
export default CarDealershipLeadsSection;
