import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldAlert, Download } from "lucide-react";
import { SUPABASE_URL } from "@/integrations/supabase/client";

interface FlaggedMessage {
  id: string;
  ride_request_id: string | null;
  sender_id: string;
  sender_role: string | null;
  content: string;
  moderation_status: string;
  moderation_reason: string | null;
  created_at: string;
}

export default function AdminMessageModerationPage() {
  const [tab, setTab] = useState("pending_review");
  const [items, setItems] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trip_messages")
      .select("id, ride_request_id, sender_id, sender_role, content, moderation_status, moderation_reason, created_at")
      .eq("moderation_status", tab)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [tab]);

  const updateStatus = async (id: string, newStatus: string) => {
    setBusyId(id);
    const { error } = await supabase.from("trip_messages").update({ moderation_status: newStatus } as any).eq("id", id);
    setBusyId(null);
    if (error) { toast.error("Failed"); return; }
    toast.success(`Marked ${newStatus}`);
    setItems((prev) => prev.filter((m) => m.id !== id));
  };

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error("Not signed in"); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/export-moderation-actions-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error("Export failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moderation-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } finally { setExporting(false); }
  };

  return (
    <AppLayout title="Message Moderation">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">In-trip message moderation</h1>
            <p className="text-sm text-muted-foreground">Messages flagged by automated moderation are hidden from the recipient until reviewed.</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting} className="gap-1.5 shrink-0">
            <Download className="w-3.5 h-3.5" /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending_review">Pending review</TabsTrigger>
            <TabsTrigger value="blocked">Blocked</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : items.length === 0 ? (
              <Card className="p-12 text-center text-sm text-muted-foreground">Queue is clear ✨</Card>
            ) : (
              <div className="space-y-2">
                {items.map((m) => (
                  <Card key={m.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{m.sender_role || "—"}</Badge>
                          <Badge className={m.moderation_status === "blocked" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}>{m.moderation_status}</Badge>
                          <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        {m.moderation_reason && <p className="text-[11px] text-muted-foreground mt-1">Reason: {m.moderation_reason}</p>}
                        {m.ride_request_id && <p className="text-[10px] text-muted-foreground mt-1">Ride {m.ride_request_id.slice(0, 8)}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateStatus(m.id, "clean")} disabled={busyId === m.id} className="gap-1.5 bg-emerald-500 hover:bg-emerald-600">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(m.id, "blocked")} disabled={busyId === m.id} className="gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> Block
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
