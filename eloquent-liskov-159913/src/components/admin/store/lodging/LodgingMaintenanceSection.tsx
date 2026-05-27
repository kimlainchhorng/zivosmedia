/**
 * Lodging — Maintenance / Work Orders board.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Search, X } from "lucide-react";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import {
  useLodgeMaintenance, type MaintenanceStatus, type MaintenancePriority,
} from "@/hooks/lodging/useLodgeMaintenance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Open", in_progress: "In Progress", blocked: "Blocked", done: "Done",
};
const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  open: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  blocked: "bg-muted text-muted-foreground border-border",
  done: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};
const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  low: "Low", normal: "Normal", high: "High", urgent: "Urgent",
};
const PRIORITY_COLOR: Record<MaintenancePriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700",
  high: "bg-amber-500/15 text-amber-700",
  urgent: "bg-rose-500/20 text-rose-700",
};
const PRIORITY_RANK: Record<MaintenancePriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const STATUS_RANK: Record<MaintenanceStatus, number> = { open: 0, in_progress: 1, blocked: 2, done: 3 };
const CATEGORIES = ["general", "plumbing", "electrical", "hvac", "furniture", "appliance", "exterior"];

type SortKey = "newest" | "oldest" | "priority" | "status";

interface Filters {
  q: string;
  room: string;        // "" = all, "__none__" = no room
  assignee: string;    // "" = all, "__unassigned__" = unassigned
  category: string;    // "" = all
  priority: string;    // "" = all
  from: string;        // yyyy-mm-dd
  to: string;
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  q: "", room: "", assignee: "", category: "", priority: "", from: "", to: "", sort: "newest",
};

export default function LodgingMaintenanceSection({ storeId }: { storeId: string }) {
  const { data: rooms = [] } = useLodgeRooms(storeId);
  const { data: tickets = [], isLoading, upsert, setStatus, remove } = useLodgeMaintenance(storeId);
  const [filterStatus, setFilterStatus] = useState<"all" | MaintenanceStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", room_id: "", category: "general",
    priority: "normal" as MaintenancePriority, notes: "",
  });

  const storageKey = `lodge-maint-filters:${storeId}`;
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(filters)); } catch {}
  }, [filters, storageKey]);

  const updateFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters(prev => ({ ...prev, [k]: v }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === "open").length;
    const inProgress = tickets.filter(t => t.status === "in_progress").length;
    const weekAgo = Date.now() - 7 * 86400000;
    const doneWeek = tickets.filter(t => t.status === "done" && t.resolved_at && new Date(t.resolved_at).getTime() > weekAgo).length;
    const resolved = tickets.filter(t => t.resolved_at);
    const avgHours = resolved.length
      ? Math.round(resolved.reduce((acc, t) => acc + (new Date(t.resolved_at!).getTime() - new Date(t.reported_at).getTime()) / 3600000, 0) / resolved.length)
      : 0;
    return { open, inProgress, doneWeek, avgHours };
  }, [tickets]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.assignee_name) set.add(t.assignee_name); });
    return Array.from(set).sort();
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const fromTs = filters.from ? new Date(filters.from + "T00:00:00").getTime() : null;
    const toTs = filters.to ? new Date(filters.to + "T23:59:59").getTime() : null;

    let out = tickets.filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (q) {
        const hay = [t.title, t.notes, t.room_number, t.assignee_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.room === "__none__" ? t.room_id : filters.room ? t.room_id !== filters.room : false) return false;
      if (filters.assignee === "__unassigned__") { if (t.assignee_name) return false; }
      else if (filters.assignee && t.assignee_name !== filters.assignee) return false;
      if (filters.category && (t.category || "general") !== filters.category) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      const ts = new Date(t.reported_at).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      switch (filters.sort) {
        case "oldest": return new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime();
        case "priority": return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case "status": return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        default: return new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime();
      }
    });
    return out;
  }, [tickets, filters, filterStatus]);

  const hasActiveFilters = useMemo(() => {
    return JSON.stringify({ ...filters, sort: "newest" }) !== JSON.stringify({ ...DEFAULT_FILTERS, sort: "newest" });
  }, [filters]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const room = rooms.find(r => r.id === form.room_id);
    try {
      await upsert.mutateAsync({
        store_id: storeId,
        title: form.title.trim(),
        room_id: form.room_id || null,
        room_number: room?.name || null,
        category: form.category,
        priority: form.priority,
        notes: form.notes.trim() || null,
      });
      toast.success("Ticket created");
      setDialogOpen(false);
      setForm({ title: "", room_id: "", category: "general", priority: "normal", notes: "" });
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const ageStr = (iso: string) => {
    const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  };

  const selectCls = "h-9 text-xs rounded-md border border-input bg-background px-2";

  return (
    <div className="space-y-3">
      <LodgingQuickJump active="lodge-maintenance" />
      <LodgingSectionStatusBanner title="Maintenance & Work Orders" icon={Wrench} countLabel="Open tickets" countValue={stats.open + stats.inProgress} fixLabel="Open Housekeeping" fixTab="lodge-housekeeping" />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Maintenance & Work Orders</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Open", value: stats.open, icon: AlertTriangle, color: "text-rose-600" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-600" },
            { label: "Done (7d)", value: stats.doneWeek, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Avg Resolve", value: `${stats.avgHours}h`, icon: Clock, color: "text-primary" },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <k.icon className={cn("h-4 w-4", k.color)} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
              </div>
              <p className="text-2xl font-extrabold mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Status chip strip */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "open", "in_progress", "blocked", "done"] as const).map(s => (
            <button type="button"
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted",
              )}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={e => updateFilter("q", e.target.value)}
                placeholder="Search title, notes, room, assignee…"
                className="h-9 pl-8 text-xs"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <select className={selectCls} value={filters.room} onChange={e => updateFilter("room", e.target.value)}>
              <option value="">All rooms</option>
              <option value="__none__">— No room —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className={selectCls} value={filters.assignee} onChange={e => updateFilter("assignee", e.target.value)}>
              <option value="">All assignees</option>
              <option value="__unassigned__">Unassigned</option>
              {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className={selectCls} value={filters.category} onChange={e => updateFilter("category", e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
            <select className={selectCls} value={filters.priority} onChange={e => updateFilter("priority", e.target.value)}>
              <option value="">All priorities</option>
              {(["urgent", "high", "normal", "low"] as MaintenancePriority[]).map(p => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <Input type="date" value={filters.from} onChange={e => updateFilter("from", e.target.value)} className="h-9 text-xs" aria-label="From date" />
            <Input type="date" value={filters.to} onChange={e => updateFilter("to", e.target.value)} className="h-9 text-xs" aria-label="To date" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              Showing <strong className="text-foreground">{filtered.length}</strong> of {tickets.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Sort:</span>
              <select className={selectCls} value={filters.sort} onChange={e => updateFilter("sort", e.target.value as SortKey)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority (urgent → low)</option>
                <option value="status">Status (open → done)</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Wrench className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {tickets.length === 0 ? "No tickets — open one when something breaks." : "No tickets match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{t.title}</p>
                      <Badge className={cn("text-[10px]", PRIORITY_COLOR[t.priority])}>{PRIORITY_LABEL[t.priority]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.category || "general"}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t.room_number ? `Room ${t.room_number} · ` : ""}{ageStr(t.reported_at)}
                      {t.assignee_name ? ` · ${t.assignee_name}` : ""}
                    </p>
                    {t.notes && <p className="text-xs text-foreground/70 mt-1">{t.notes}</p>}
                  </div>
                  <Badge className={cn("text-[10px] border", STATUS_COLOR[t.status])}>{STATUS_LABEL[t.status]}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={t.status}
                    onChange={e => setStatus.mutate({ id: t.id, status: e.target.value as MaintenanceStatus })}
                    className="h-8 text-xs rounded-md border border-input bg-background px-2"
                  >
                    {(["open", "in_progress", "blocked", "done"] as MaintenanceStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  {t.status !== "done" && (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5"
                      onClick={() => setStatus.mutate({ id: t.id, status: "done" })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Delete ticket?")) remove.mutate(t.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* New ticket dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Maintenance Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="AC not cooling, leaking faucet…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room</Label>
                <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">— None / general —</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-1.5">
                {(["low", "normal", "high", "urgent"] as MaintenancePriority[]).map(p => (
                  <button type="button" key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-bold border",
                      form.priority === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted",
                    )}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending ? "Creating…" : "Create Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
