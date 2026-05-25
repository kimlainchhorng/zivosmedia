/**
 * Leads / sales pipeline section. Kanban board grouped by status.
 */
import { memo, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ClipboardList, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDealershipLeads, type DealershipLead, type DealershipLeadStatus } from "@/hooks/car-dealership/useDealershipLeads";
import CarDealershipLeadDialog from "./CarDealershipLeadDialog";

const COLUMNS: Array<{ id: DealershipLeadStatus; label: string; color: string }> = [
  { id: "new", label: "New", color: "border-blue-500/40 bg-blue-500/5" },
  { id: "contacted", label: "Contacted", color: "border-indigo-500/40 bg-indigo-500/5" },
  { id: "qualified", label: "Qualified", color: "border-amber-500/40 bg-amber-500/5" },
  { id: "test_drive_scheduled", label: "Test drive", color: "border-violet-500/40 bg-violet-500/5" },
  { id: "negotiating", label: "Negotiating", color: "border-orange-500/40 bg-orange-500/5" },
  { id: "won", label: "Won", color: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "lost", label: "Lost", color: "border-zinc-500/40 bg-zinc-500/5" },
];

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

interface Props { storeId: string; }

function CarDealershipLeadsSectionInner({ storeId }: Props) {
  const { leads, loading, saving, create, update, remove } = useDealershipLeads(storeId);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipLead | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Leads & Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} total · {leads.filter((l) => !["won", "lost"].includes(l.status)).length} active
          </p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />New lead</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, phone, email, or vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Capture your first prospect to start building the pipeline.</p>
          <Button onClick={handleAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New lead</Button>
        </Card>
      ) : (
        <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <div key={col.id} className={cn("rounded-xl border-2 border-dashed p-2 min-h-[200px]", col.color)}>
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs font-bold uppercase tracking-wide">{col.label}</p>
                <Badge variant="secondary" className="text-[10px]">{grouped[col.id].length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[col.id].map((l) => {
                  const overdue = l.next_followup_at && new Date(l.next_followup_at).getTime() < Date.now();
                  return (
                    <Card key={l.id} className="p-2.5 bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(l)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold truncate flex-1">{l.display_name}</p>
                        <button
                          type="button"
                          className="opacity-50 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); handleDelete(l); }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {l.vehicle_label && <p className="mt-0.5 text-xs text-muted-foreground truncate">{l.vehicle_label}</p>}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {l.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{l.phone}</span>}
                        {l.email && <Mail className="h-2.5 w-2.5" />}
                      </div>
                      {l.next_followup_at && (
                        <div className={cn(
                          "mt-1.5 flex items-center gap-1 text-[10px] font-medium",
                          overdue ? "text-red-600" : "text-muted-foreground",
                        )}>
                          <Calendar className="h-2.5 w-2.5" /> {overdue ? "Overdue · " : ""}{fmtDate(l.next_followup_at)}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {COLUMNS.filter((c) => c.id !== l.status).slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveTo(l, c.id); }}
                            className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted hover:bg-primary/10 hover:text-primary"
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
      )}

      <CarDealershipLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

const CarDealershipLeadsSection = memo(CarDealershipLeadsSectionInner);
export default CarDealershipLeadsSection;
