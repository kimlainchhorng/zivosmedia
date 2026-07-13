/**
 * Admin Support Dashboard — For support staff to manage tickets and user issues
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, AlertTriangle, CheckCircle2,
  Clock, Users, Search, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";

export default function AdminSupportDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: access } = useUserAccess(user?.id);
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (!sectionId) return;

    const target = document.getElementById(sectionId);
    if (!target) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  const isAuthorized = access?.isSupport || access?.isAdmin || user?.email === "chhorngkimlain1@gmail.com";

  // Fetch support metrics
  const { data: aiConversations } = useQuery({
    queryKey: ["support-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, question, answer, created_at, escalated, satisfaction_rating, role")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthorized,
  });

  const { data: securityAlerts } = useQuery({
    queryKey: ["support-security-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_security_alerts")
        .select("id, title, severity, alert_type, is_resolved, created_at")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthorized,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["support-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_activity_log")
        .select("id, action_type, description, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthorized,
  });

  const resolveAlert = async (id: string) => {
    setResolvingId(id);
    try {
      const { error } = await supabase
        .from("admin_security_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["support-security-alerts"] });
      toast.success("Alert resolved");
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-ig-gradient">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the Support Dashboard.</p>
          <Button onClick={() => navigate("/feed")} variant="outline">Go Home</Button>
        </div>
      </div>
    );
  }

  const totalConversations = aiConversations?.length || 0;
  const escalatedCount = aiConversations?.filter(c => c.escalated)?.length || 0;
  const resolvedCount = aiConversations?.filter(c => c.satisfaction_rating && c.satisfaction_rating >= 4)?.length || 0;
  const openAlerts = securityAlerts?.length || 0;

  const filteredConversations = searchQuery
    ? aiConversations?.filter(c =>
        c.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.answer?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : aiConversations;

  const filteredActivity = searchQuery
    ? recentActivity?.filter(a =>
        a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.action_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentActivity;

  const stats = [
    { label: "Total Conversations", value: totalConversations, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Escalated", value: escalatedCount, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Satisfied", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Open Alerts", value: openAlerts, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <AdminLayout title="Support Dashboard" brandLabel="ZIVO Support">
      <div id="overview" className="space-y-6 scroll-mt-24">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <div id="conversations" className="bg-card rounded-2xl border border-border/40 p-5 scroll-mt-24">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Recent AI Conversations
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredConversations?.slice(0, 10).map((conv) => (
                <div key={conv.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors space-y-1">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{conv.question || "No question"}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conv.created_at!).toLocaleDateString()}
                    </span>
                    {conv.escalated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                        Escalated
                      </span>
                    )}
                    {conv.satisfaction_rating && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                        ★ {conv.satisfaction_rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!filteredConversations || filteredConversations.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations found</p>
              )}
            </div>
          </div>

          {/* Security Alerts */}
          <div id="alerts" className="bg-card rounded-2xl border border-border/40 p-5 scroll-mt-24">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open Security Alerts
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {securityAlerts?.map((alert) => (
                <div key={alert.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 shrink-0"
                      disabled={resolvingId === alert.id}
                      onClick={() => resolveAlert(alert.id)}
                    >
                      {resolvingId === alert.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><CheckCircle2 className="h-3 w-3 mr-1" />Resolve</>}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      alert.severity === "critical" ? "bg-red-500/10 text-red-600" :
                      alert.severity === "high" ? "bg-orange-500/10 text-orange-600" :
                      "bg-amber-500/10 text-amber-600"
                    )}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {(!securityAlerts || securityAlerts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No open alerts</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-2xl border border-border/40 p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Account Activity
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredActivity?.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{activity.description || activity.action_type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}