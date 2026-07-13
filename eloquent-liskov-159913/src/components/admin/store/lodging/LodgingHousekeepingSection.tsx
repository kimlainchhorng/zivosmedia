/**
 * Lodging — Housekeeping board (per-room status).
 */
import { useEffect, useMemo, useState } from "react";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Sparkles, User } from "lucide-react";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useLodgeHousekeeping, type HousekeepingStatus } from "@/hooks/lodging/useLodgeHousekeeping";
import { useLodgeMaintenance } from "@/hooks/lodging/useLodgeMaintenance";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES: HousekeepingStatus[] = ["clean", "dirty", "in_progress", "inspected", "out_of_service"];
const LABEL: Record<HousekeepingStatus, string> = {
  clean: "Clean", dirty: "Dirty", in_progress: "In Progress", inspected: "Inspected", out_of_service: "Out of Service",
};
const COLOR: Record<HousekeepingStatus, string> = {
  clean: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  dirty: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  inspected: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  out_of_service: "bg-muted text-muted-foreground border-border",
};

export default function LodgingHousekeepingSection({ storeId }: { storeId: string }) {
  const { data: rooms = [] } = useLodgeRooms(storeId);
  const { data: tasks = [], isLoading, upsert, setStatus } = useLodgeHousekeeping(storeId);
  const { upsert: upsertMaintenance } = useLodgeMaintenance(storeId);
  const { data: housekeepers = [] } = useQuery({
    queryKey: ["housekeeping-staff", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_employees")
        .select("id, name, lodging_role, status")
        .eq("store_id", storeId)
        .eq("lodging_role", "housekeeping");
      return ((data || []) as any[]).filter(s => (s.status ?? "active") === "active");
    },
  });
  const [pendingOOS, setPendingOOS] = useState<{ roomId: string | null; roomNumber: string | null } | null>(null);
  const [statusFilter, setStatusFilter] = useState<HousekeepingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesQuery = !query.trim() || (task.room_number || "").toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  }), [tasks, statusFilter, query]);

  // Auto-create housekeeping rows for rooms that don't have one yet
  useEffect(() => {
    if (!rooms.length) return;
    const missing = rooms.filter(r => !tasks.find(t => t.room_id === r.id));
    missing.forEach(r => {
      upsert.mutate({ store_id: storeId, room_id: r.id, room_number: r.name, status: "clean" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.length, tasks.length]);

  const change = async (id: string, s: HousekeepingStatus, roomId: string | null, roomNumber: string | null) => {
    try {
      await setStatus.mutateAsync({ id, status: s });
      toast.success(`Marked ${LABEL[s]}`);
      if (s === "out_of_service") {
        setPendingOOS({ roomId, roomNumber });
      }
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const createTicketFromOOS = async () => {
    if (!pendingOOS) return;
    const { roomId, roomNumber } = pendingOOS;
    setPendingOOS(null);
    try {
      await upsertMaintenance.mutateAsync({
        store_id: storeId,
        room_id: roomId,
        room_number: roomNumber,
        title: `Room ${roomNumber || ""} — Out of service`.trim(),
        category: "general",
        priority: "high",
        status: "open",
        notes: "Auto-created from housekeeping",
      });
      toast.success("Ticket created", {
        action: {
          label: "View",
          onClick: () => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "lodge-maintenance" } })),
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create ticket");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Housekeeping</CardTitle>
      </CardHeader>
      <CardContent>
        <LodgingQuickJump active="lodge-housekeeping" />
        <LodgingSectionStatusBanner title="Housekeeping" icon={Sparkles} countLabel="Open tasks" countValue={tasks.filter((t: any) => t.status !== "completed").length} fixLabel="Open Rooms" fixTab="lodge-rooms" />
        {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          : tasks.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Add rooms first</p>
          : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STATUSES.map(s => <button type="button" key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg border p-2 text-left ${statusFilter === s ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{LABEL[s]}</p><p className="text-lg font-bold">{tasks.filter(t => t.status === s).length}</p></button>)}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStatusFilter("all")} className={`rounded-md border px-3 text-xs ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>All</button>
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search room" className="pl-9" /></div>
              </div>
              {filteredTasks.map(t => {
                const assignee = housekeepers.find((s: any) => s.id === t.assignee_id);
                return (
                <div key={t.id} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-semibold text-sm truncate">{t.room_number || "Room"}</p>
                    {assignee && <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><User className="h-2.5 w-2.5" /> {assignee.name}</p>}
                    {t.last_cleaned_at && <p className="text-[10px] text-muted-foreground">Cleaned {new Date(t.last_cleaned_at).toLocaleString()}</p>}
                  </div>
                  <Badge className={`text-[10px] border ${COLOR[t.status]}`}>{LABEL[t.status]}</Badge>
                  <select
                    value={t.assignee_id || ""}
                    onChange={(e) => upsert.mutate({ id: t.id, store_id: storeId, room_id: t.room_id, assignee_id: e.target.value || null } as any)}
                    className="h-8 text-xs rounded-md border border-input bg-background px-2 max-w-[150px]"
                    title="Assign housekeeper"
                  >
                    <option value="">Unassigned</option>
                    {housekeepers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={t.status} onChange={e => change(t.id, e.target.value as HousekeepingStatus, t.room_id, t.room_number)}
                    className="h-8 text-xs rounded-md border border-input bg-background px-2">
                    {STATUSES.map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </select>
                </div>
              );})}
              {filteredTasks.length === 0 && <p className="rounded-lg border border-dashed border-border bg-muted/20 py-6 text-center text-sm text-muted-foreground">No rooms match this filter.</p>}
            </div>
          )}
      </CardContent>

      <AlertDialog open={!!pendingOOS} onOpenChange={(open) => { if (!open) setPendingOOS(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open a maintenance ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Room {pendingOOS?.roomNumber || ""} was marked Out of Service. Create a maintenance ticket so the issue is tracked and assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={createTicketFromOOS}>Create ticket</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
