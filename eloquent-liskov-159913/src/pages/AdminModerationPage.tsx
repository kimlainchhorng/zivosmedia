import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Shield, Users, Flag, AlertTriangle, CheckCircle, XCircle,
  Search, Eye, Ban, BarChart3, TrendingUp, Clock, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

interface Report {
  id: string;
  contentType: string;
  reason: string;
  severity: string | null;
  status: string | null;
  createdAt: string;
  contentId: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("reports");
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [stats, setStats] = useState({ pending: 0, resolved: 0, users: 0, flagged: 0 });

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("content_moderation_queue")
      .select("id, content_type, reason, severity, status, created_at, content_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setReports(data.map(r => ({
        id: r.id,
        contentType: r.content_type,
        reason: r.reason,
        severity: r.severity,
        status: r.status,
        createdAt: formatDistanceToNow(new Date(r.created_at!), { addSuffix: true }),
        contentId: r.content_id,
      })));
      const pending = data.filter(r => r.status === "pending" || !r.status).length;
      const resolved = data.filter(r => r.status === "resolved").length;
      const flagged = data.filter(r => r.severity === "high").length;
      setStats(s => ({ ...s, pending, resolved, flagged }));
    }
    setLoadingReports(false);
  }, []);

  const loadUsers = useCallback(async () => {
    if (users.length > 0) return;
    setLoadingUsers(true);
    const q = searchQuery.trim();
    let query = supabase.from("profiles").select("id, full_name, avatar_url, created_at").limit(20);
    if (q) query = query.ilike("full_name", `%${q}%`);
    const { data } = await query;
    if (data) setUsers(data as UserRow[]);
    setLoadingUsers(false);
  }, [searchQuery, users.length]);

  useEffect(() => { loadReports(); }, [loadReports]);
  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  const pendingReports = reports.filter(r => !r.status || r.status === "pending");
  const resolvedReports = reports.filter(r => r.status && r.status !== "pending");

  const handleAction = async (id: string, action: "resolved" | "dismissed") => {
    // Find the report so we know what content type/id to act on.
    const report = reports.find(r => r.id === id);

    // If admin "resolves" (i.e., upholds the report), actually take the
    // content down. Previously this only flipped a status flag and the
    // offending post stayed live.
    if (action === "resolved" && report?.contentType === "post" && report.contentId) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: hideErr } = await (supabase as any)
        .from("user_posts")
        .update({
          hidden_at: new Date().toISOString(),
          hidden_reason: report.reason || "Moderator action",
          hidden_by: user?.id ?? null,
        })
        .eq("id", report.contentId);
      if (hideErr) {
        toast.error("Could not hide post: " + hideErr.message);
        return;
      }
    }

    const { error } = await supabase
      .from("content_moderation_queue")
      .update({ status: action })
      .eq("id", id);
    if (error) {
      toast.error("Could not update report status: " + error.message);
      return;
    }

    // Audit the moderation action so we have a paper trail.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("moderation_actions").insert({
        action_type: action === "resolved" ? "content_hidden" : "report_dismissed",
        target_type: report?.contentType || "unknown",
        target_id: report?.contentId || id,
        moderator_id: user?.id ?? null,
        notes: report?.reason || null,
      });
    } catch (e) {
      console.warn("moderation_actions audit insert failed", e);
    }

    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    toast.success(
      action === "resolved"
        ? (report?.contentType === "post" ? "Post hidden + report resolved" : "Report resolved")
        : "Report dismissed"
    );
  };

  const severityVariant = (s: string | null): "destructive" | "default" | "secondary" => {
    if (s === "high") return "destructive";
    if (s === "medium") return "default";
    return "secondary";
  };

  const STAT_ITEMS = [
    { label: "Pending Reports", value: stats.pending.toString(), icon: Clock, color: "text-yellow-500" },
    { label: "Resolved Today", value: stats.resolved.toString(), icon: CheckCircle, color: "text-green-500" },
    { label: "Flagged (High)", value: stats.flagged.toString(), icon: AlertTriangle, color: "text-red-500" },
    { label: "Moderation Queue", value: reports.length.toString(), icon: Flag, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Moderation – ZIVO" description="Admin moderation panel." canonical="/admin/moderation" noIndex />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Admin & Moderation</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {STAT_ITEMS.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="reports" className="flex-1 gap-1">
            <Flag className="h-3 w-3" /> Reports
            {pendingReports.length > 0 && <Badge variant="destructive" className="text-xs ml-1">{pendingReports.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 gap-1">
            <Users className="h-3 w-3" /> Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1">
            <BarChart3 className="h-3 w-3" /> Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-3">
          {loadingReports ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {pendingReports.length === 0 && resolvedReports.length === 0 && (
                <div className="text-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No reports in queue</p>
                </div>
              )}

              {pendingReports.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground">Pending ({pendingReports.length})</h3>
                  {pendingReports.map((report) => (
                    <Card key={report.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant(report.severity)} className="text-xs capitalize">{report.severity ?? "low"}</Badge>
                          <Badge variant="outline" className="text-xs">{report.contentType}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{report.createdAt}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-3">{report.reason}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleAction(report.id, "resolved")}>
                          <CheckCircle className="h-3 w-3" /> Resolve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleAction(report.id, "dismissed")}>
                          <XCircle className="h-3 w-3" /> Dismiss
                        </Button>
                      </div>
                    </Card>
                  ))}
                </>
              )}

              {resolvedReports.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground mt-6">Resolved ({resolvedReports.length})</h3>
                  {resolvedReports.map((report) => (
                    <Card key={report.id} className="p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{report.contentType}</Badge>
                          <span className="text-sm text-foreground">{report.reason}</span>
                        </div>
                        <Badge variant={report.status === "resolved" ? "default" : "secondary"} className="text-xs">{report.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setUsers([]); }}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              className="pl-9" />
          </div>
          {loadingUsers ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            users.map((u) => (
              <Card key={u.id} className="p-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">{(u.full_name ?? "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{u.full_name ?? "Unknown User"}</p>
                  <p className="text-xs text-muted-foreground">Joined {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "—"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost"><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost"><Ban className="h-3 w-3" /></Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Moderation Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {[
                { label: "Total Reports", value: reports.length.toString() },
                { label: "Pending", value: pendingReports.length.toString() },
                { label: "Resolved", value: resolvedReports.length.toString() },
                { label: "High Severity", value: reports.filter(r => r.severity === "high").length.toString() },
                { label: "Resolution Rate", value: reports.length > 0 ? `${Math.round((resolvedReports.length / reports.length) * 100)}%` : "—" },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="text-sm font-medium text-foreground">{metric.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
