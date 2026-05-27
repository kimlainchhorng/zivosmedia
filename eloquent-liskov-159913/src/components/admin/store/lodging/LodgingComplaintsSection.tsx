/**
 * Lodging — Guest Complaints & Feedback.
 * In-house complaint resolution log with priority triage and resolution tracking.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircleWarning, Plus, Pencil, Trash2, CheckCircle2,
  AlertTriangle, ArrowUp, Minus,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type Category = "cleanliness" | "noise" | "service" | "maintenance" | "food" | "billing" | "safety" | "other";
type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "in_progress" | "resolved" | "escalated" | "closed";

interface Complaint {
  id: string;
  room_number: string | null;
  guest_name: string | null;
  category: Category;
  priority: Priority;
  description: string;
  status: Status;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

const CAT_LABEL: Record<Category, string> = {
  cleanliness: "Cleanliness",
  noise: "Noise",
  service: "Service",
  maintenance: "Maintenance",
  food: "Food & Dining",
  billing: "Billing",
  safety: "Safety",
  other: "Other",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  medium: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

const PRIORITY_ICON: Record<Priority, any> = {
  low: Minus,
  medium: Minus,
  high: AlertTriangle,
  urgent: ArrowUp,
};

const STATUS_COLOR: Record<Status, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  escalated: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  closed: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const BLANK: Partial<Complaint> = {
  room_number: "", guest_name: "", category: "service", priority: "medium",
  description: "", status: "open", assigned_to: "", resolution_notes: "",
};

export default function LodgingComplaintsSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<Status | "open_all" | "all">("open_all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [form, setForm] = useState<Partial<Complaint>>(BLANK);

  const query = useQuery({
    queryKey: ["lodge_complaints", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_complaints")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Complaint[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setDialogOpen(true); };
  const openEdit = (c: Complaint) => { setEditing(c); setForm(c); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        room_number: form.room_number || null,
        guest_name: form.guest_name || null,
        category: form.category,
        priority: form.priority,
        description: form.description,
        status: form.status,
        assigned_to: form.assigned_to || null,
        resolution_notes: form.resolution_notes || null,
        resolved_at: form.status === "resolved" || form.status === "closed" ? new Date().toISOString() : null,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_complaints").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_complaints").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Complaint updated" : "Complaint logged");
      qc.invalidateQueries({ queryKey: ["lodge_complaints", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_complaints").update({
        status: "resolved",
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint resolved");
      qc.invalidateQueries({ queryKey: ["lodge_complaints", storeId] });
      setResolveDialogId(null);
      setResolutionNotes("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await (supabase as any).from("lodge_complaints").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_complaints", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteComplaint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_complaints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_complaints", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const filtered = all.filter(c => {
    const statusMatch = filterStatus === "all" ? true
      : filterStatus === "open_all" ? ["open", "in_progress", "escalated"].includes(c.status)
      : c.status === filterStatus;
    const priMatch = filterPriority === "all" || c.priority === filterPriority;
    return statusMatch && priMatch;
  });

  const openCount = all.filter(c => ["open", "in_progress", "escalated"].includes(c.status)).length;
  const urgentCount = all.filter(c => c.priority === "urgent" && c.status !== "closed" && c.status !== "resolved").length;

  const isValid = form.description?.trim();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <MessageCircleWarning className="h-5 w-5" /> Guest Complaints
        </CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Log complaint
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-complaints" />
        <LodgingSectionStatusBanner
          title="Guest Complaints"
          icon={MessageCircleWarning}
          countLabel="Open complaints"
          countValue={openCount}
          fixLabel="Open Reviews"
          fixTab="lodge-reviews"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Open", value: openCount },
            { label: "Urgent", value: urgentCount },
            { label: "Resolved today", value: all.filter(c => c.resolved_at?.startsWith(new Date().toISOString().slice(0, 10))).length },
            { label: "Total logged", value: all.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Urgent alert */}
        {urgentCount > 0 && (
          <div className="rounded-lg border border-border bg-secondary p-3 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">{urgentCount} urgent complaint{urgentCount > 1 ? "s" : ""} require immediate attention.</span>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {(["open_all", "all", "open", "in_progress", "escalated", "resolved", "closed"] as const).map(s => (
              <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {s === "open_all" ? "All open" : s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "urgent", "high", "medium", "low"] as const).map(p => (
              <button type="button" key={p} onClick={() => setFilterPriority(p as any)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterPriority === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {p === "all" ? "Any priority" : p}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0 ? "No complaints logged. Use 'Log complaint' to track in-house feedback." : "No complaints match these filters."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const PIcon = PRIORITY_ICON[c.priority];
              return (
                <div key={c.id} className={`rounded-lg border p-3 ${["resolved", "closed"].includes(c.status) ? "opacity-70" : ""} ${c.priority === "urgent" && !["resolved", "closed"].includes(c.status) ? "border-rose-500/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <PIcon className={`h-4 w-4 mt-0.5 shrink-0 ${c.priority === "urgent" ? "text-rose-600" : c.priority === "high" ? "text-amber-600" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {c.room_number && <span className="font-semibold text-sm">Room {c.room_number}</span>}
                        {c.guest_name && <span className="text-xs text-muted-foreground">{c.guest_name}</span>}
                        <Badge variant="outline" className="text-[10px]">{CAT_LABEL[c.category]}</Badge>
                        <Badge className={`text-[10px] border ${PRIORITY_COLOR[c.priority]}`}>{c.priority}</Badge>
                        <Badge className={`text-[10px] border ml-auto ${STATUS_COLOR[c.status]}`}>{c.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm">{c.description}</p>
                      {c.assigned_to && <p className="text-[11px] text-muted-foreground mt-0.5">Assigned: {c.assigned_to}</p>}
                      {c.resolution_notes && <p className="text-[11px] text-emerald-700 mt-0.5">Resolution: {c.resolution_notes}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-col items-end">
                      {c.status === "open" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] px-2"
                          onClick={() => setStatus.mutate({ id: c.id, status: "in_progress" })}>
                          In progress
                        </Button>
                      )}
                      {["open", "in_progress"].includes(c.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-500/30"
                          onClick={() => { setResolveDialogId(c.id); setResolutionNotes(""); }}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                        </Button>
                      )}
                      {c.status !== "escalated" && !["resolved", "closed"].includes(c.status) && (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-foreground"
                          onClick={() => setStatus.mutate({ id: c.id, status: "escalated" })}>
                          Escalate
                        </Button>
                      )}
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Delete this complaint?")) deleteComplaint.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Log / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit complaint" : "Log guest complaint"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Room number</Label>
                <Input value={form.room_number || ""} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 203" />
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={form.guest_name || ""} onChange={e => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CAT_LABEL) as Category[]).map(k => (
                      <SelectItem key={k} value={k}>{CAT_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned to</Label>
                <Input value={form.assigned_to || ""} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Staff name" />
              </div>
              <div className="sm:col-span-2">
                <Label>Description *</Label>
                <Textarea rows={3} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the guest's complaint in detail…" />
              </div>
              <div className="sm:col-span-2">
                <Label>Resolution notes</Label>
                <Textarea rows={2} value={form.resolution_notes || ""} onChange={e => setForm({ ...form, resolution_notes: e.target.value })}
                  placeholder="What was done to resolve the issue?" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Log complaint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve dialog */}
        <Dialog open={Boolean(resolveDialogId)} onOpenChange={v => { if (!v) setResolveDialogId(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Resolve complaint</DialogTitle></DialogHeader>
            <div>
              <Label>Resolution notes</Label>
              <Textarea rows={3} value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                placeholder="What was done to resolve this complaint? (e.g. Moved guest to quieter room, issued discount)" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogId(null)}>Cancel</Button>
              <Button onClick={() => resolve.mutate(resolveDialogId!)} disabled={resolve.isPending}>
                {resolve.isPending ? "Resolving…" : "Mark resolved"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
