import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, RefreshCw, CheckCircle2, Siren, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface SecurityIncident {
  id: string;
  source: string;
  severity: "medium" | "high" | "critical";
  summary: string;
  acknowledged: boolean;
  created_at: string;
  chain_hash: string | null;
}

export default function AdminSecuritySentinelPage() {
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "chat_security" | "auth_shield">("all");

  const { data: incidents = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-security-sentinel-incidents", sourceFilter],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let query = (supabase as any)
        .from("security_incidents")
        .select("id, source, severity, summary, acknowledged, created_at, chain_hash")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SecurityIncident[];
    },
    enabled: true,
  });

  const ackMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const { error } = await (supabase as any).rpc("admin_ack_security_incident", { _incident_id: incidentId });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Incident acknowledged");
      await refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to acknowledge incident");
    },
  });

  const unacked = incidents.filter((i) => !i.acknowledged).length;
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const high = incidents.filter((i) => i.severity === "high").length;
  const authIncidents = incidents.filter((i) => i.source === "auth_shield").length;

  const severityBadges = useMemo(
    () => ({
      medium: "bg-yellow-500/10 text-yellow-700 border-yellow-400/40",
      high: "bg-orange-500/10 text-orange-700 border-orange-400/40",
      critical: "bg-red-500/10 text-red-700 border-red-400/40",
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">Security Sentinel</h1>
            <p className="text-muted-foreground">Tamper-evident incident command center</p>
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
            <ShieldAlert className="h-7 w-7 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{unacked}</p>
              <p className="text-xs text-muted-foreground">Unacknowledged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Siren className="h-7 w-7 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{critical}</p>
              <p className="text-xs text-muted-foreground">Critical (7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Shield className="h-7 w-7 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{high}</p>
              <p className="text-xs text-muted-foreground">High (7d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auth Shield Signals</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold">{authIncidents}</p>
            <p className="text-xs text-muted-foreground">Auth abuse incidents (7d)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={sourceFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("all")}>All</Button>
            <Button variant={sourceFilter === "chat_security" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("chat_security")}>Chat</Button>
            <Button variant={sourceFilter === "auth_shield" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("auth_shield")}>Auth</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading incidents...</p>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No escalated incidents in the last 7 days.</p>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={severityBadges[incident.severity]}>
                      {incident.severity}
                    </Badge>
                    <Badge variant="secondary">{incident.source}</Badge>
                    {incident.acknowledged ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-400/50">
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Unacknowledged</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                  </p>
                </div>

                <p className="text-sm text-foreground">{incident.summary}</p>

                <p className="text-[11px] text-muted-foreground break-all">
                  Chain hash: {incident.chain_hash || "n/a"}
                </p>

                {!incident.acknowledged && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={ackMutation.isPending && processingId === incident.id}
                    onClick={() => {
                      setProcessingId(incident.id);
                      ackMutation.mutate(incident.id);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Acknowledge
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
