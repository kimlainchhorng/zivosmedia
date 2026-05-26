import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TripChatSheet from "@/components/rides/TripChatSheet";
import { Check, Circle, X } from "lucide-react";

type CheckState = "idle" | "pass" | "fail";

interface RecentRide {
  ride_request_id: string;
  count: number;
}

export default function AdminModerationQAPage() {
  const { user } = useAuth();
  const [rideId, setRideId] = useState("");
  const [recent, setRecent] = useState<RecentRide[]>([]);
  const [open, setOpen] = useState(false);
  const [activeRide, setActiveRide] = useState<string | null>(null);

  const [chkVisible, setChkVisible] = useState<CheckState>("idle");
  const [chkApprove, setChkApprove] = useState<CheckState>("idle");
  const [chkBlock, setChkBlock] = useState<CheckState>("idle");
  const [chkAudit, setChkAudit] = useState<CheckState>("idle");

  // Load recent rides with messages
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("trip_messages")
        .select("ride_request_id")
        .order("created_at", { ascending: false })
        .limit(200);
      const counts = new Map<string, number>();
      for (const r of (data as any[]) || []) {
        if (r.ride_request_id) counts.set(r.ride_request_id, (counts.get(r.ride_request_id) || 0) + 1);
      }
      setRecent(Array.from(counts.entries()).slice(0, 10).map(([ride_request_id, count]) => ({ ride_request_id, count })));
    })();
  }, []);

  // Subscribe to trip_messages updates + admin_actions for the active ride
  useEffect(() => {
    if (!activeRide || !user) return;
    setChkVisible("idle"); setChkApprove("idle"); setChkBlock("idle"); setChkAudit("idle");

    // Mark visible as soon as we observe at least one message in DB
    (async () => {
      const { data } = await supabase.from("trip_messages").select("id").eq("ride_request_id", activeRide).limit(1);
      if (data && data.length) setChkVisible("pass");
      else setChkVisible("fail");
    })();

    const since = new Date(Date.now() - 60_000).toISOString();
    const ch = supabase
      .channel(`qa-${activeRide}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trip_messages", filter: `ride_request_id=eq.${activeRide}` }, (payload) => {
        const ns = (payload.new as any).moderation_status;
        if (ns === "clean") setChkApprove("pass");
        if (ns === "blocked") setChkBlock("pass");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_actions", filter: `admin_id=eq.${user.id}` }, (payload) => {
        const at = (payload.new as any).action_type;
        const created = (payload.new as any).created_at;
        if (created && created >= since && (at === "approve_message" || at === "block_message")) {
          setChkAudit("pass");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeRide, user?.id]);

  const openChat = () => {
    const id = rideId.trim();
    if (!id) return;
    setActiveRide(id);
    setOpen(true);
  };

  const Row = ({ label, state }: { label: string; state: CheckState }) => (
    <div className="flex items-center gap-3 py-2">
      {state === "pass" ? (
        <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center"><Check className="w-3.5 h-3.5" /></span>
      ) : state === "fail" ? (
        <span className="w-5 h-5 rounded-full bg-destructive/15 text-destructive flex items-center justify-center"><X className="w-3.5 h-3.5" /></span>
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground/40" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <AppLayout title="Moderation QA">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Moderation QA checklist</h1>
          <p className="text-sm text-muted-foreground">Open any trip in admin mode and confirm Approve / Block updates land in real time.</p>
        </div>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">1. Pick a ride</div>
          <div className="flex gap-2">
            <Input
              placeholder="ride_request_id (uuid)"
              value={rideId}
              onChange={(e) => setRideId(e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={openChat} disabled={!rideId.trim()}>Open chat</Button>
          </div>
          {recent.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Recent rides with messages:</div>
              <Select onValueChange={(v) => setRideId(v)}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Pick recent ride" /></SelectTrigger>
                <SelectContent>
                  {recent.map((r) => (
                    <SelectItem key={r.ride_request_id} value={r.ride_request_id}>
                      <span className="font-mono">{r.ride_request_id.slice(0, 8)}…</span> · {r.count} msgs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">2. Live checklist</div>
            {activeRide && <Badge variant="outline" className="font-mono text-[10px]">{activeRide.slice(0, 8)}…</Badge>}
          </div>
          <div className="divide-y divide-border/40">
            <Row label="Messages visible regardless of moderation_status" state={chkVisible} />
            <Row label="Approve sets moderation_status='clean' (realtime)" state={chkApprove} />
            <Row label="Block sets moderation_status='blocked' (realtime)" state={chkBlock} />
            <Row label="admin_actions row appears for current admin (last 60s)" state={chkAudit} />
          </div>
          {!activeRide && (
            <p className="text-[11px] text-muted-foreground mt-3">Open a chat above, then approve/block a non-clean message to flip the checks green.</p>
          )}
        </Card>

        {activeRide && (
          <TripChatSheet
            open={open}
            onOpenChange={setOpen}
            rideRequestId={activeRide}
            senderRole="rider"
            adminMode
          />
        )}
      </div>
    </AppLayout>
  );
}
