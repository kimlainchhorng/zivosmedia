import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft, RefreshCw, Ban, TriangleAlert, Activity, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface SecurityEventRow {
  id: string;
  source_table: string;
  sender_id: string | null;
  blocked: boolean;
  risk_score: number;
  risk_labels: string[];
  content_excerpt: string | null;
  created_at: string;
}

interface SenderBlockRow {
  id: string;
  sender_id: string;
  reason: string;
  block_until: string;
  created_at: string;
}

export default function AdminChatSecurityPage() {
  const navigate = useNavigate();
  const [unblockingSenderId, setUnblockingSenderId] = useState<string | null>(null);

  const { data: events = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-chat-security-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("chat_security_events")
        .select("id, source_table, sender_id, blocked, risk_score, risk_labels, content_excerpt, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as SecurityEventRow[];
    },
  });

  const { data: senderBlocks = [], refetch: refetchSenderBlocks } = useQuery({
    queryKey: ["admin-chat-sender-blocks"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("chat_sender_blocks")
        .select("id, sender_id, reason, block_until, created_at")
        .gt("block_until", now)
        .order("block_until", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as SenderBlockRow[];
    },
  });

  const unblockSender = useMutation({
    mutationFn: async (senderId: string) => {
      const { error } = await (supabase as any).rpc("admin_clear_chat_sender_block", { _sender_id: senderId });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Sender quarantine removed");
      await Promise.all([refetch(), refetchSenderBlocks()]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to unblock sender");
    },
  });

  const totalEvents = events.length;
  const blockedEvents = events.filter((e) => e.blocked).length;
  const highRiskEvents = events.filter((e) => e.risk_score >= 80).length;

  const topLabels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      for (const label of event.risk_labels || []) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">Chat Security Monitor</h1>
            <p className="text-muted-foreground">Live suspicious and blocked chat events (last 24 hours)</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Signals (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Ban className="h-7 w-7 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{blockedEvents}</p>
              <p className="text-xs text-muted-foreground">Blocked Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{highRiskEvents}</p>
              <p className="text-xs text-muted-foreground">High Risk (score {">="} 80)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sender Quarantines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {senderBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sender quarantines.</p>
          ) : (
            senderBlocks.map((block) => (
              <div key={block.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{block.sender_id}</p>
                  <p className="text-xs text-muted-foreground">{block.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDistanceToNow(new Date(block.block_until), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={unblockSender.isPending && unblockingSenderId === block.sender_id}
                  onClick={() => {
                    setUnblockingSenderId(block.sender_id);
                    unblockSender.mutate(block.sender_id);
                  }}
                >
                  <UserX className="h-4 w-4" />
                  Unblock
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Threat Labels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {topLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suspicious labels recorded yet.</p>
          ) : (
            topLabels.map(([label, count]) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label} ({count})
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading security events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suspicious chat events in the last 24 hours.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={event.blocked ? "destructive" : "secondary"}>
                      {event.blocked ? "Blocked" : "Observed"}
                    </Badge>
                    <Badge variant="outline">{event.source_table}</Badge>
                    <Badge variant="outline">Risk {event.risk_score}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>

                {(event.risk_labels || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {event.risk_labels.map((label) => (
                      <Badge key={`${event.id}-${label}`} variant="secondary" className="text-[10px]">
                        <TriangleAlert className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}

                {event.content_excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {event.content_excerpt}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
