/**
 * ActivityLogPage — Full history of logins, actions, changes with filters,
 * search, CSV export, and pagination.
 */
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft, Shield, LogIn, Settings, Pencil, Trash2, Loader2, Clock,
  Search, X, Download, AlertCircle, RefreshCw, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ACTION_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  account_hub: Clock,
  settings_change: Settings,
  profile_update: Pencil,
  account_delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-sky-500/15 text-sky-500",
  account_hub: "bg-cyan-500/15 text-cyan-500",
  settings_change: "bg-indigo-500/15 text-indigo-500",
  profile_update: "bg-emerald-500/15 text-emerald-500",
  account_delete: "bg-rose-500/15 text-rose-500",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "account_hub", label: "Hub" },
  { value: "security", label: "Security" },
  { value: "login", label: "Logins" },
  { value: "settings_change", label: "Settings" },
  { value: "profile_update", label: "Profile" },
];

const PAGE_SIZE = 50;
const SECURITY_ACTION_TYPES = ["login", "settings_change", "account_delete"];

type UnifiedActivity = {
  id: string;
  action_type: string;
  description: string;
  device_info: string;
  created_at: string;
  source?: string;
};

type ActivityLogResult = {
  rows: UnifiedActivity[];
  partialError: boolean;
};

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

function filenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function formatActivityPath(path: string | null | undefined) {
  if (!path) return "Account";
  const cleanPath = path.split("?")[0];
  const labels: Record<string, string> = {
    "/more": "Account hub",
    "/profile": "Profile",
    "/account/activity-log": "Activity log",
    "/account/security": "Security center",
    "/account/settings": "Account settings",
  };
  if (labels[cleanPath]) return labels[cleanPath];
  return cleanPath
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ") || "Account";
}

function formatSourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    more: "More hub",
    more_profile_copy: "Profile link copied",
    more_profile_share: "Profile shared",
    more_install_accepted: "App install started",
    more_install_dismissed: "App install dismissed",
    more_preference_theme: "Theme changed",
    more_preference_dnd: "Alert preference changed",
    more_preference_sound: "Sound preference changed",
    more_preference_region: "Region changed",
    more_preference_privacy: "Privacy mode changed",
    more_preference_density: "Directory view changed",
    account: "Account",
    profile: "Profile",
    security: "Security",
  };
  if (!source) return "";
  return labels[source] || source
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ActivityLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = FILTER_OPTIONS.some((opt) => opt.value === searchParams.get("filter"))
    ? searchParams.get("filter")!
    : "all";
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const urlFilter = searchParams.get("filter");
    const nextFilter = FILTER_OPTIONS.some((opt) => opt.value === urlFilter)
      ? urlFilter!
      : "all";
    setFilter((current) => (current === nextFilter ? current : nextFilter));
    const nextSearch = searchParams.get("q") || "";
    setSearch((current) => (current === nextSearch ? current : nextSearch));
  }, [searchParams]);

  const updateFilter = (nextFilter: string) => {
    setFilter(nextFilter);
    const next = new URLSearchParams(searchParams);
    if (nextFilter === "all") next.delete("filter");
    else next.set("filter", nextFilter);
    setSearchParams(next, { replace: true });
  };

  const updateSearch = (nextSearch: string) => {
    setSearch(nextSearch);
    const next = new URLSearchParams(searchParams);
    const cleaned = nextSearch.trim();
    if (cleaned) next.set("q", cleaned);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const {
    data: activityResult = { rows: [], partialError: false },
    dataUpdatedAt,
    isLoading,
    isFetching,
  } = useQuery<ActivityLogResult>({
    queryKey: ["activity-log", user?.id, limit],
    queryFn: async () => {
      if (!user) return { rows: [], partialError: false };
      const [accountResult, hubResult] = await Promise.all([
        (supabase as any)
          .from("account_activity_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
        (supabase as any)
          .from("account_hub_activity")
          .select("id, source, path, region_code, device_kind, platform, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const { data: accountRows, error: accountError } = accountResult;
      const { data: hubRows, error: hubError } = hubResult;

      const normalizedAccountRows = ((accountRows || []) as any[]).map((row) => ({
        id: row.id,
        action_type: row.action_type || "activity",
        description: row.description || row.action_type || "Account activity",
        device_info: row.device_info || "",
        created_at: row.created_at,
        source: "account",
      }));

      const normalizedHubRows = ((hubRows || []) as any[]).map((row) => ({
        id: `hub-${row.id}`,
        action_type: "account_hub",
        description: `Opened ${formatActivityPath(row.path)}`,
        device_info: [row.device_kind, row.platform, row.region_code].filter(Boolean).join(" · "),
        created_at: row.created_at,
        source: row.source || "more",
      }));

      const rows = [...normalizedAccountRows, ...normalizedHubRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit) as UnifiedActivity[];

      return {
        rows,
        partialError: Boolean(accountError || hubError),
      };
    },
    enabled: !!user,
  });
  const activities = activityResult.rows;

  const refreshActivity = () => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({ queryKey: ["activity-log", user.id] });
  };

  const copyCurrentViewLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      toast.success("Activity link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const filtered = useMemo(() => {
    let list: UnifiedActivity[] = activities;
    if (filter === "security") {
      list = list.filter((a) => SECURITY_ACTION_TYPES.includes(a.action_type));
    } else if (filter !== "all") {
      list = list.filter((a) => a.action_type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const desc = (a.description || "").toLowerCase();
        const type = (a.action_type || "").toLowerCase();
        const dev = (a.device_info || "").toLowerCase();
        const source = (a.source || "").toLowerCase();
        return desc.includes(q) || type.includes(q) || dev.includes(q) || source.includes(q);
      });
    }
    return list;
  }, [activities, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedActivity[]>();
    filtered.forEach((a) => {
      const label = getDateLabel(a.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const summaryStats = useMemo(() => {
    const hub = activities.filter((a) => a.action_type === "account_hub").length;
    const security = activities.filter((a) => SECURITY_ACTION_TYPES.includes(a.action_type)).length;
    const latest = activities[0]?.created_at
      ? formatDistanceToNow(new Date(activities[0].created_at), { addSuffix: true })
      : "No activity";

    return [
      { label: "Records", value: String(activities.length), icon: Clock, filter: "all" },
      { label: "Hub opens", value: String(hub), icon: Shield, filter: "account_hub" },
      { label: "Security", value: String(security), icon: LogIn, filter: "security" },
      { label: "Latest", value: latest, icon: Settings },
    ];
  }, [activities]);

  const filterCounts = useMemo(() => {
    const counts = new Map<string, number>([["all", activities.length]]);
    for (const activity of activities) {
      counts.set(activity.action_type, (counts.get(activity.action_type) || 0) + 1);
    }
    counts.set("security", activities.filter((a) => SECURITY_ACTION_TYPES.includes(a.action_type)).length);
    return counts;
  }, [activities]);

  const activeFilterLabel = FILTER_OPTIONS.find((opt) => opt.value === filter)?.label || "All";

  const handleExportCsv = async () => {
    if (!user || filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setExporting(true);
    try {
      const header = ["created_at", "action_type", "description", "device_info", "source"];
      const rows = filtered.map((a: UnifiedActivity) => [
        a.created_at || "",
        a.action_type || "",
        a.description || "",
        a.device_info || "",
        formatSourceLabel(a.source) || "",
      ]);
      const csv = [
        header.join(","),
        ...rows.map((r) => r.map((v) => csvEscape(String(v))).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filterPart = filter !== "all" ? `-${filenamePart(filter)}` : "";
      const searchPart = search.trim() ? `-${filenamePart(search)}` : "";
      a.href = url;
      a.download = `zivo-activity${filterPart}${searchPart}-${new Date().toISOString().slice(0, 10)}.csv`;
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
  const isHubFilter = filter === "account_hub";
  const updatedLabel = dataUpdatedAt
    ? `Updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}`
    : "Waiting for sync";

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Activity Log – ZIVO" description="Full history of your account activity including logins, settings changes, profile updates, and security events. Filter, search, and export for compliance." />
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold">Activity Log</h1>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Account, security, and hub activity · {updatedLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCurrentViewLink}
              aria-label="Copy activity view link"
              className="h-9 w-9 rounded-full px-0 sm:w-auto sm:px-3"
            >
              <Copy className="h-4 w-4" />
              <span className="ml-1.5 hidden text-xs font-bold sm:inline">Copy</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshActivity}
              disabled={isFetching}
              aria-label="Refresh activity"
              className="h-9 w-9 rounded-full px-0 sm:w-auto sm:px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              <span className="ml-1.5 hidden text-xs font-bold sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || filtered.length === 0}
              aria-label="Export activity CSV"
              className="h-9 w-9 rounded-full px-0 sm:w-auto sm:px-3"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="ml-1.5 hidden text-xs font-bold sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summaryStats.map((stat) => {
            const Icon = stat.icon;
            const isInteractive = Boolean(stat.filter);
            const isActive = stat.filter === filter || (stat.filter === "all" && filter === "all");
            const className = `rounded-2xl border p-3 text-left shadow-sm transition ${
              isActive
                ? "border-primary/30 bg-primary/10"
                : "border-border/45 bg-card/80"
            } ${isInteractive ? "active:scale-[0.98] hover:bg-muted/45" : ""}`;
            const content = (
              <>
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="truncate text-[14px] font-extrabold">{stat.value}</p>
                <p className="truncate text-[10px] font-semibold text-muted-foreground">{stat.label}</p>
              </>
            );
            if (isInteractive) {
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => updateFilter(stat.filter!)}
                  aria-label={`Filter activity by ${stat.label}`}
                  aria-pressed={isActive}
                  className={className}
                >
                  {content}
                </button>
              );
            }
            return (
              <div key={stat.label} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-2xl px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity…"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl bg-muted/50 border-border/40 text-sm"
            aria-label="Search activity"
          />
          {search && (
            <button type="button"
              onClick={() => updateSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {activityResult.partialError && (
        <div className="mx-4 mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold">Some activity sources are unavailable</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                Showing the records that loaded. Missing backend tables will appear after migration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 pb-1 pt-3 no-scrollbar">
        {FILTER_OPTIONS.map(opt => (
          <button type="button"
            key={opt.value}
            onClick={() => updateFilter(opt.value)}
            aria-pressed={filter === opt.value}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === opt.value
                ? "bg-ig-gradient text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{opt.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
              filter === opt.value
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-background/80 text-muted-foreground"
            }`}>
              {filterCounts.get(opt.value) || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Result count */}
      {!isLoading && (filter !== "all" || search) && (
        <div className="mx-auto max-w-2xl px-4 pt-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/35 px-3 py-2" aria-live="polite">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-foreground">
                Showing {activeFilterLabel}{search ? ` matching "${search}"` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {filtered.length} of {activities.length} record{activities.length === 1 ? "" : "s"}
              </p>
            </div>
            <button type="button"
              onClick={() => { updateFilter("all"); updateSearch(""); }}
              aria-label="Reset activity filters and search"
              className="shrink-0 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm active:scale-95 transition-transform"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12 text-muted-foreground" />}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-foreground">
              {isHubFilter && !search ? "No hub activity yet" : search || filter !== "all" ? "No activity matches your filters" : "No activity recorded yet"}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              {isHubFilter && !search
                ? "Open the More account hub again after the backend migration is applied to start seeing sessions here."
                : search || filter !== "all"
                  ? "Try another search term or clear your filters."
                  : "Account and security events will appear here as they happen."}
            </p>
            {(search || filter !== "all") && (
              <div className="mt-4 flex justify-center gap-2">
                {isHubFilter && !search && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate("/more?from=profile")}
                    className="h-9 rounded-full text-xs font-bold"
                  >
                    Open More
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { updateFilter("all"); updateSearch(""); }}
                  className="h-9 rounded-full text-xs font-bold"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
        {grouped.map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">{dateLabel}</p>
            <div className="space-y-1.5">
              {items.map((a: UnifiedActivity, i: number) => {
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
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{a.description || a.action_type}</p>
                        {a.source && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {formatSourceLabel(a.source)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
