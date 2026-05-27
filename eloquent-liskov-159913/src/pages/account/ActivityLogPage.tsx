/**
 * ActivityLogPage — Full history of logins, actions, changes with filters,
 * search, CSV export, and pagination.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft, Shield, LogIn, Settings, Pencil, Trash2, Loader2, Clock,
  Search, X, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ACTION_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  settings_change: Settings,
  profile_update: Pencil,
  account_delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-sky-500/15 text-sky-500",
  settings_change: "bg-indigo-500/15 text-indigo-500",
  profile_update: "bg-emerald-500/15 text-emerald-500",
  account_delete: "bg-rose-500/15 text-rose-500",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "login", label: "Logins" },
  { value: "settings_change", label: "Settings" },
  { value: "profile_update", label: "Profile" },
];

const PAGE_SIZE = 50;

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ActivityLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-log", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("account_activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list: any[] = activities;
    if (filter !== "all") {
      list = list.filter((a: any) => a.action_type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a: any) => {
        const desc = (a.description || "").toLowerCase();
        const type = (a.action_type || "").toLowerCase();
        const dev = (a.device_info || "").toLowerCase();
        return desc.includes(q) || type.includes(q) || dev.includes(q);
      });
    }
    return list;
  }, [activities, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach((a: any) => {
      const label = getDateLabel(a.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const handleExportCsv = async () => {
    if (!user || filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setExporting(true);
    try {
      const header = ["created_at", "action_type", "description", "device_info"];
      const rows = filtered.map((a: any) => [
        a.created_at || "",
        a.action_type || "",
        a.description || "",
        a.device_info || "",
      ]);
      const csv = [
        header.join(","),
        ...rows.map((r) => r.map((v) => csvEscape(String(v))).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zivo-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} record${filtered.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const canLoadMore = activities.length >= limit;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Activity Log – ZIVO" description="Full history of your account activity including logins, settings changes, profile updates, and security events. Filter, search, and export for compliance." />
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Activity Log</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || filtered.length === 0}
            className="h-9 rounded-lg"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-1.5 text-xs hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl bg-muted/50 border-border/40 text-sm"
            aria-label="Search activity"
          />
          {search && (
            <button type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTER_OPTIONS.map(opt => (
          <button type="button"
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!isLoading && (filter !== "all" || search) && (
        <p className="px-4 pt-2 text-[11px] text-muted-foreground">
          {filtered.length} of {activities.length} record{activities.length === 1 ? "" : "s"}
          {filtered.length !== activities.length && (
            <button type="button"
              onClick={() => { setFilter("all"); setSearch(""); }}
              className="ml-2 text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </p>
      )}

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12 text-muted-foreground" />}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || filter !== "all" ? "No activity matches your filters" : "No activity recorded yet"}
            </p>
            {(search || filter !== "all") && (
              <Button
                variant="link"
                size="sm"
                onClick={() => { setFilter("all"); setSearch(""); }}
                className="mt-2 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
        {grouped.map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">{dateLabel}</p>
            <div className="space-y-1.5">
              {items.map((a: any, i: number) => {
                const Icon = ACTION_ICONS[a.action_type] || Shield;
                const colorClass = ACTION_COLORS[a.action_type] || "bg-primary/10 text-primary";
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/40"
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass.split(" ")[0]}`}>
                      <Icon className={`h-4 w-4 ${colorClass.split(" ")[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.description || a.action_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        {a.device_info && ` · ${a.device_info}`}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Load more */}
        {!isLoading && canLoadMore && (
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="w-full h-10 rounded-xl text-sm"
            >
              Load older activity
            </Button>
          </div>
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}
