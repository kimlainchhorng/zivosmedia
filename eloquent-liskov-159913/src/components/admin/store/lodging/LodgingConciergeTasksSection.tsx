import { useMemo, useState } from "react";
import { BellRing, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface ConciergeTask {
  id: string;
  store_id: string;
  reservation_id?: string | null;
  guest_name?: string | null;
  room_number?: string | null;
  request_type: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  assigned_to?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  active: boolean;
}

const REQUEST_TYPES = ["general", "transport", "restaurant", "tour_booking", "gift", "shopping", "tickets", "spa", "translation", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["open", "in_progress", "completed", "cancelled"];
const blank: Partial<ConciergeTask> = { request_type: "general", priority: "normal", status: "open", active: true };

export default function LodgingConciergeTasksSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<ConciergeTask>("lodging_concierge_tasks", storeId);
  const [editing, setEditing] = useState<Partial<ConciergeTask> | null>(null);
  const rows = list.data || [];

  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    urgent: rows.filter((r) => r.priority === "urgent" && r.status !== "completed").length,
  }), [rows]);

  return (
    <SectionShell title="Concierge Tasks" subtitle="Track guest service requests beyond rooms — taxis, restaurant bookings, gifts, tickets, errands." icon={BellRing}>
      <LodgingQuickJump active="lodge-concierge" />
      <LodgingSectionStatusBanner title="Concierge Tasks" icon={BellRing} countLabel="Open + In progress" countValue={stats.open + stats.inProgress} fixLabel="Open Front Desk" fixTab="lodge-frontdesk" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="All tasks" value={String(stats.total)} icon={BellRing} />
          <StatCard label="Open" value={String(stats.open)} icon={Clock} />
          <StatCard label="In progress" value={String(stats.inProgress)} icon={Clock} />
          <StatCard label="Urgent" value={String(stats.urgent)} icon={AlertCircle} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No concierge tasks yet"
          emptyBody="Log guest requests like taxi pickup, restaurant reservation, gift delivery, or tour tickets so nothing falls through the cracks."
          addLabel="New task"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "title", label: "Task", render: (r) => (
              <>
                <span className="font-semibold">{r.title}</span>
                <p className="text-xs text-muted-foreground capitalize">
                  <Badge variant="outline" className="mr-1.5">{r.request_type.replace(/_/g, " ")}</Badge>
                  {r.guest_name || "—"}{r.room_number ? ` · Room ${r.room_number}` : ""}
                </p>
              </>
            )},
            { key: "priority", label: "Priority", className: "w-24", render: (r) => (
              <Badge variant={r.priority === "urgent" ? "destructive" : r.priority === "high" ? "secondary" : "outline"} className="capitalize">{r.priority}</Badge>
            )},
            { key: "status", label: "Status", className: "w-28", render: (r) => (
              <Badge variant={r.status === "completed" ? "secondary" : r.status === "cancelled" ? "outline" : "default"} className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
            )},
            { key: "due", label: "Due", className: "w-32", render: (r) => r.due_at ? new Date(r.due_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—" },
          ]}
        />

        <NextActions actions={[
          { label: "Open Front Desk", tab: "lodge-frontdesk", hint: "See arriving and in-house guests." },
          { label: "Check guest inbox", tab: "lodge-inbox", hint: "New requests often start as messages." },
          { label: "Track add-ons sold", tab: "lodge-addons", hint: "Review experiences guests have already paid for." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit task" : "New concierge task"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.title?.trim()) return;
              upsert.mutate(editing as ConciergeTask, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Book taxi to airport — 6:30 AM" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editing.request_type} onValueChange={(v) => setEditing({ ...editing, request_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REQUEST_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={editing.guest_name || ""} onChange={(e) => setEditing({ ...editing, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Room number</Label>
                <Input value={editing.room_number || ""} onChange={(e) => setEditing({ ...editing, room_number: e.target.value })} placeholder="201" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned to</Label>
                <Input value={editing.assigned_to || ""} onChange={(e) => setEditing({ ...editing, assigned_to: e.target.value })} placeholder="Concierge name" />
              </div>
              <div className="sm:col-span-2">
                <Label>Due at</Label>
                <Input type="datetime-local" value={editing.due_at?.slice(0, 16) || ""} onChange={(e) => setEditing({ ...editing, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Internal notes</Label>
                <Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
