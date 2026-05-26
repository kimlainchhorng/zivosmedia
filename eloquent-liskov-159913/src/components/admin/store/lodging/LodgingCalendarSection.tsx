/**
 * Lodging — Calendar & Availability.
 * Month grid with booked + manual blocks + OTA-imported (channel) blocks.
 * Includes color legend and a "Block date range" dialog.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useLodgeBlocks } from "@/hooks/lodging/useLodgeBlocks";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

interface OtaBlock { block_date: string; source?: string | null }

function useOtaBlocks(roomId?: string) {
  return useQuery({
    queryKey: ["lodging-ota-blocks", roomId],
    queryFn: async () => {
      if (!roomId) return [] as OtaBlock[];
      const { data, error } = await supabase
        .from("lodge_room_blocks" as any)
        .select("block_date, source")
        .eq("room_id", roomId)
        .neq("source", "manual");
      if (error) return [] as OtaBlock[];
      return ((data || []) as any[])
        .filter(r => r.block_date)
        .map(r => ({ block_date: r.block_date, source: r.source })) as OtaBlock[];
    },
    enabled: !!roomId,
  });
}

export default function LodgingCalendarSection({ storeId }: { storeId: string }) {
  const { data: rooms = [] } = useLodgeRooms(storeId);
  const [roomId, setRoomId] = useState<string | undefined>();
  const activeRoomId = roomId || rooms[0]?.id;
  const { data: blocks = [], upsert: upsertBlock, remove: removeBlock } = useLodgeBlocks(storeId, activeRoomId);
  const { data: reservations = [] } = useLodgeReservations(storeId, "all");
  const { data: otaBlocks = [] } = useOtaBlocks(activeRoomId);

  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = cursor.getFullYear(); const month = cursor.getMonth();

  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(ymd(new Date()));
  const [rangeEnd, setRangeEnd] = useState(ymd(new Date()));
  const [rangeReason, setRangeReason] = useState("manual");

  const grid = useMemo(() => {
    const dim = daysInMonth(year, month);
    const startDow = new Date(year, month, 1).getDay();
    const cells: (Date | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [year, month]);

  const blockedSet = useMemo(() => new Set(blocks.map(b => b.block_date)), [blocks]);
  const otaMap = useMemo(() => {
    const m = new Map<string, string>();
    otaBlocks.forEach(b => m.set(b.block_date, b.source || "ota"));
    return m;
  }, [otaBlocks]);
  const reservedSet = useMemo(() => {
    const s = new Set<string>();
    reservations.filter(r => r.room_id === activeRoomId && !["cancelled", "no_show"].includes(r.status))
      .forEach(r => {
        const start = new Date(r.check_in); const end = new Date(r.check_out);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) s.add(ymd(d));
      });
    return s;
  }, [reservations, activeRoomId]);

  const toggleBlock = async (date: string) => {
    if (!activeRoomId) return;
    const existing = blocks.find(b => b.block_date === date);
    try {
      if (existing) { await removeBlock.mutateAsync(existing.id); toast.success("Block removed"); }
      else { await upsertBlock.mutateAsync({ store_id: storeId, room_id: activeRoomId, block_date: date, reason: "manual" } as any); toast.success("Date blocked"); }
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const blockRange = async () => {
    if (!activeRoomId) return;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (end < start) { toast.error("End date must be after start date"); return; }
    try {
      let count = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const date = ymd(d);
        if (reservedSet.has(date)) continue;
        await upsertBlock.mutateAsync({ store_id: storeId, room_id: activeRoomId, block_date: date, reason: rangeReason || "manual" } as any);
        count++;
      }
      toast.success(`${count} date${count === 1 ? "" : "s"} blocked`);
      setRangeOpen(false);
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="space-y-3">
      <LodgingQuickJump active="lodge-calendar" />
      <LodgingSectionStatusBanner title="Calendar & Availability" icon={CalendarDays} countLabel="Manual blocks" countValue={blocks.length} fixLabel="Open Reservations" fixTab="lodge-reservations" />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Calendar & Availability</CardTitle>
        {rooms.length > 0 && (
          <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5"><CalendarPlus className="h-3.5 w-3.5" /> Block date range</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block date range</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start date</Label>
                    <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">End date</Label>
                    <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Input value={rangeReason} onChange={(e) => setRangeReason(e.target.value)} placeholder="Maintenance, owner stay, etc." />
                </div>
                <p className="text-[11px] text-muted-foreground">Booked dates in the range are skipped automatically.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRangeOpen(false)}>Cancel</Button>
                <Button onClick={blockRange}>Block dates</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {rooms.length === 0 ? (
          <LodgingNeedsSetupEmptyState icon={CalendarDays} title="Availability calendar is ready" description="Add rooms first, then this calendar will show booked nights, manual blocks, and available dates." primaryAction={{ label: "Open rooms", tab: "lodge-rooms" }} secondaryAction={{ label: "Open rate plans", tab: "lodge-rate-plans" }} nextBestAction="Create rooms before blocking dates or reviewing availability." />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {rooms.map(r => (
                <button type="button" key={r.id} onClick={() => setRoomId(r.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${activeRoomId === r.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                  {r.name}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <p className="font-semibold text-sm">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
              <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-semibold">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                if (!d) return <div key={i} />;
                const key = ymd(d);
                const reserved = reservedSet.has(key);
                const blocked = blockedSet.has(key);
                const ota = otaMap.get(key);
                const cls = reserved
                  ? "bg-primary/15 text-primary border-primary/30 cursor-not-allowed"
                  : ota
                    ? "bg-amber-500/15 text-amber-700 border-amber-500/40"
                    : blocked
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-background border-border hover:bg-muted";
                return (
                  <button type="button" key={i} onClick={() => !reserved && !ota && toggleBlock(key)}
                    disabled={reserved || !!ota}
                    title={ota ? `OTA: ${ota}` : reserved ? "Booked" : blocked ? "Blocked" : "Available"}
                    className={`relative aspect-square rounded-md text-xs font-medium border transition ${cls}`}>
                    {d.getDate()}
                    {ota && <span className="absolute bottom-0.5 right-0.5 text-[8px] uppercase font-bold opacity-80">{(ota || "ota").slice(0, 3)}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/15 border border-primary/30 inline-block" /> Booked</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30 inline-block" /> Blocked</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/40 inline-block" /> OTA-imported</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-background border border-border inline-block" /> Available</span>
              <span>Click any free date to block / unblock</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
