/**
 * AdminLodgingWiringCheckPage
 * End-to-end wiring check for the lodging booking workflow.
 * Calls `lodging_wiring_report()` (admin-only RPC) and renders pass/fail per check
 * with copyable SQL fixes, "Open in SQL editor" deep links, history sparkline,
 * Actions audit tab, CSV export, and a deep-link to the webhook event log.
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Copy, ExternalLink,
  Database, Radio, Link as LinkIcon, Layers, Columns, Wrench, Activity, Download, Code2, Webhook, History, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { downloadWiringReportCsv, type WiringReport, type WiringCheck } from "@/lib/admin/wiringReportCsv";

const SUPABASE_PROJECT = "slirphzzwcogdbkeicff";

type ActionType = "copy_fix_sql" | "copy_failing_query" | "open_sql_editor" | "mark_resolved";

const groupIcon: Record<string, typeof Database> = {
  RLS: Database,
  Security: Database,
  Realtime: Radio,
  "Foreign keys": LinkIcon,
  Schema: Columns,
  Performance: Layers,
  Indexes: Layers,
  Triggers: Wrench,
  Webhook: Webhook,
};

interface RunRow {
  id: string;
  ran_at: string;
  pass_count: number;
  fail_count: number;
  schema_version?: number | null;
}

interface ActionRow {
  id: string;
  created_at: string;
  admin_id: string;
  run_id: string | null;
  check_id: string;
  check_name: string | null;
  action_type: ActionType;
  editor_url: string | null;
}

const isWebhookCheck = (c: WiringCheck): boolean => {
  const g = (c.group || "").toLowerCase();
  const id = (c.id || "").toLowerCase();
  const name = (c.name || "").toLowerCase();
  return g.includes("webhook") || id.includes("webhook") || name.includes("webhook") ||
    id.includes("stripe") || name.includes("stripe") || id.includes("payment_intent");
};

export default function AdminLodgingWiringCheckPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRunIdRef = useRef<string | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["lodging-wiring-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lodging_wiring_report" as any);
      if (error) throw error;
      return data as unknown as WiringReport;
    },
  });

  const [history, setHistory] = useState<RunRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [adminEmails, setAdminEmails] = useState<Record<string, string>>({});
  const [historyTab, setHistoryTab] = useState<"runs" | "actions">("runs");

  // Action-panel filters (URL-synced)
  const [filterAdmin, setFilterAdmin] = useState(searchParams.get("admin") || "");
  const [filterRun, setFilterRun] = useState(searchParams.get("run") || "");
  const [filterCheck, setFilterCheck] = useState(searchParams.get("check") || "");
  const [filterType, setFilterType] = useState<string>(searchParams.get("type") || "");

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    filterAdmin ? next.set("admin", filterAdmin) : next.delete("admin");
    filterRun ? next.set("run", filterRun) : next.delete("run");
    filterCheck ? next.set("check", filterCheck) : next.delete("check");
    filterType ? next.set("type", filterType) : next.delete("type");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAdmin, filterRun, filterCheck, filterType]);

  const loadHistory = async () => {
    const { data } = await (supabase as any)
      .from("lodging_wiring_report_runs")
      .select("id, ran_at, pass_count, fail_count, schema_version")
      .order("ran_at", { ascending: false })
      .limit(10);
    setHistory((data as RunRow[]) || []);
  };

  const loadActions = async () => {
    const { data } = await (supabase as any)
      .from("lodging_wiring_remediation_actions")
      .select("id, created_at, admin_id, run_id, check_id, check_name, action_type, editor_url")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data as ActionRow[]) || [];
    setActions(list);
    // Resolve admin emails (one shot)
    const ids = Array.from(new Set(list.map((a) => a.admin_id))).filter(Boolean);
    if (ids.length > 0) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("user_id, email")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { if (p.user_id) map[p.user_id] = p.email || ""; });
      setAdminEmails(map);
    }
  };

  useEffect(() => { loadHistory(); loadActions(); }, [data]);

  // Persist a run row each time we refetch (admin-only RLS)
  useEffect(() => {
    if (!data) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: row } = await (supabase as any).from("lodging_wiring_report_runs").insert({
        summary: data,
        pass_count: data.pass_count ?? 0,
        fail_count: data.fail_count ?? 0,
        ran_by: u?.user?.id ?? null,
        schema_version: 2,
      } as any).select("id").maybeSingle();
      currentRunIdRef.current = (row as any)?.id || null;
    })().catch(() => {});
  }, [data]);

  const grouped = useMemo(() => {
    const out = new Map<string, WiringCheck[]>();
    (data?.checks || []).forEach((c) => {
      if (!out.has(c.group)) out.set(c.group, []);
      out.get(c.group)!.push(c);
    });
    return Array.from(out.entries());
  }, [data]);

  const totals = useMemo(() => {
    const checks = data?.checks || [];
    return {
      total: checks.length,
      pass: checks.filter((c) => c.pass).length,
      fail: checks.filter((c) => !c.pass).length,
    };
  }, [data]);

  const allPass = totals.fail === 0 && totals.total > 0;

  const logRemediation = async (action_type: ActionType, c: WiringCheck, extra?: { editor_url?: string }) => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user?.id) return;
      await (supabase as any).from("lodging_wiring_remediation_actions").insert({
        admin_id: u.user.id,
        run_id: currentRunIdRef.current,
        check_id: c.id || c.name,
        check_name: c.name,
        action_type,
        editor_url: extra?.editor_url || null,
      });
      loadActions();
    } catch (e) {
      console.warn("[wiring] log remediation failed", e);
    }
  };

  const copyText = (txt: string, label = "Copied") => {
    navigator.clipboard.writeText(txt);
    toast.success(label);
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadWiringReportCsv(data);
    toast.success("CSV exported");
  };

  const actionToneClass: Record<ActionType, string> = {
    copy_fix_sql: "bg-primary/10 text-primary border-primary/30",
    copy_failing_query: "bg-muted text-muted-foreground border-border",
    open_sql_editor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    mark_resolved: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30",
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-ig-gradient flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Lodging wiring check
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Verifies RLS, realtime, foreign keys, indexes, and required schema for the booking workflow.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/lodging/webhook-events"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <Webhook className="h-3 w-3" /> Webhook log →
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!data || isLoading}
            className="rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-[12px] text-muted-foreground">Running checks…</p>
          ) : error ? (
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-destructive">
                  Couldn't load wiring report
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(error as Error).message} — admin role required.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {allPass ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {allPass ? "All wired correctly" : `${totals.fail} check${totals.fail === 1 ? "" : "s"} failing`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {totals.pass}/{totals.total} pass
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  {totals.pass} pass
                </Badge>
                {totals.fail > 0 && (
                  <Badge variant="outline" className="rounded-full text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                    {totals.fail} fail
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/database/publications`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition"
        >
          <Radio className="h-3 w-3" /> Realtime publications <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/database/tables`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition"
        >
          <Database className="h-3 w-3" /> Tables <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/functions`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition"
        >
          <Wrench className="h-3 w-3" /> Edge functions <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition"
        >
          <Database className="h-3 w-3" /> SQL editor <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Grouped checks */}
      <div className="space-y-3">
        {grouped.map(([group, items]) => {
          const Icon = groupIcon[group] || Database;
          const groupFail = items.filter((i) => !i.pass).length;
          return (
            <Card key={group} className="rounded-2xl border-border/60">
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {group}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] ${
                    groupFail === 0
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                >
                  {groupFail === 0 ? "OK" : `${groupFail} failing`}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {items.map((c) => (
                  <div
                    key={c.id || c.name}
                    className={`rounded-xl border p-2.5 ${
                      c.pass
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {c.pass ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground break-words">
                            {c.name}
                          </p>
                          {c.message && (
                            <p className="text-[10px] text-muted-foreground break-words mt-0.5">{c.message}</p>
                          )}
                        </div>
                      </div>
                      {!c.pass && c.fix && (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { copyText(c.fix!, "Fix copied"); logRemediation("copy_fix_sql", c); }}
                            className="h-6 px-2 rounded-lg text-[10px]"
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                          {c.editor_url && (
                            <a
                              href={c.editor_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => logRemediation("open_sql_editor", c, { editor_url: c.editor_url! })}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-lg text-[10px] bg-primary text-primary-foreground hover:opacity-90"
                            >
                              <ExternalLink className="h-3 w-3" /> Open in editor
                            </a>
                          )}
                          {isWebhookCheck(c) && (
                            <Link
                              to="/admin/lodging/webhook-events"
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-lg text-[10px] bg-muted text-muted-foreground hover:bg-accent border border-border"
                            >
                              <Webhook className="h-3 w-3" /> Webhook events
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    {!c.pass && isWebhookCheck(c) && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Recent related events:</span>
                        {(c.related_event_ids && c.related_event_ids.length > 0) ? (
                          c.related_event_ids.slice(0, 3).map((eid, idx) => (
                            <Link
                              key={eid}
                              to={`/admin/lodging/webhook-events?event_id=${encodeURIComponent(eid)}`}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-background hover:bg-accent font-mono"
                            >
                              <Webhook className="h-2.5 w-2.5" />
                              {c.related_event_types?.[idx] || "event"} · {eid.slice(0, 10)}…
                            </Link>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No related events found.</span>
                        )}
                      </div>
                    )}
                    {!c.pass && c.fix && (
                      <pre className="mt-2 text-[10px] bg-muted/50 rounded-lg p-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all">
                        {c.fix}
                      </pre>
                    )}
                    {!c.pass && c.failing_query && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                          <Code2 className="h-3 w-3" /> Show failing query
                        </summary>
                        <div className="mt-1.5 flex items-start gap-1">
                          <pre className="flex-1 text-[10px] bg-background border border-border rounded-lg p-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all">
                            {c.failing_query}
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { copyText(c.failing_query!, "Query copied"); logRemediation("copy_failing_query", c); }}
                            className="h-6 px-2 rounded-lg text-[10px] shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History panel */}
      {(history.length > 0 || actions.length > 0) && (
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              History
            </CardTitle>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button type="button"
                onClick={() => setHistoryTab("runs")}
                className={`text-[11px] px-2.5 py-1 inline-flex items-center gap-1 ${historyTab === "runs" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
              >
                <History className="h-3 w-3" /> Runs
              </button>
              <button type="button"
                onClick={() => setHistoryTab("actions")}
                className={`text-[11px] px-2.5 py-1 inline-flex items-center gap-1 ${historyTab === "actions" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
              >
                <ListChecks className="h-3 w-3" /> Actions ({actions.length})
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {historyTab === "runs" ? (
              <>
                {/* Sparkline (color-coded by schema version) */}
                <div className="flex items-end gap-1 h-10 mb-2">
                  {[...history].reverse().map((h, i, arr) => {
                    const total = h.pass_count + h.fail_count || 1;
                    const passPct = (h.pass_count / total) * 100;
                    const prev = arr[i - 1];
                    const versionChanged = prev && (prev.schema_version ?? 1) !== (h.schema_version ?? 1);
                    const isCurrent = (h.schema_version ?? 1) === 2;
                    return (
                      <div
                        key={h.id}
                        title={`v${h.schema_version ?? 1} · ${new Date(h.ran_at).toLocaleString()} — ${h.pass_count} pass / ${h.fail_count} fail`}
                        className={`flex-1 rounded-t-sm relative overflow-hidden ${isCurrent ? "bg-muted" : "bg-muted/50"} ${versionChanged ? "border-l border-foreground/40" : ""}`}
                        style={{ height: "100%" }}
                      >
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${h.fail_count === 0 ? (isCurrent ? "bg-emerald-500" : "bg-muted-foreground") : "bg-destructive"}`}
                          style={{ height: `${passPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* Schema-grouped runs */}
                {(() => {
                  const groups = new Map<number, RunRow[]>();
                  history.forEach((h) => {
                    const v = h.schema_version ?? 1;
                    if (!groups.has(v)) groups.set(v, []);
                    groups.get(v)!.push(h);
                  });
                  const sorted = Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
                  return sorted.map(([v, rows]) => (
                    <div key={v} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide mb-1 mt-2">
                        <span>Schema v{v} · {rows.length} run{rows.length === 1 ? "" : "s"}</span>
                        <span className="opacity-70" title="Diffs are computed within a schema version">ⓘ same-version diff</span>
                      </div>
                      <div className="space-y-1">
                        {rows.map((h, i) => {
                          const prev = rows[i + 1]; // same-version previous
                          const delta = prev ? h.fail_count - prev.fail_count : 0;
                          const isBoundary = !prev && history.findIndex((x) => x.id === h.id) < history.length - 1;
                          return (
                            <div
                              key={h.id}
                              data-suppressed={isBoundary ? "true" : "false"}
                              className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 last:border-b-0 py-1"
                            >
                              <span className="flex items-center gap-1.5">
                                {new Date(h.ran_at).toLocaleString()}
                                <code className="text-[9px] px-1 rounded bg-muted">v{h.schema_version ?? 1}·{h.id.slice(0, 8)}</code>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-emerald-600">{h.pass_count}p</span>
                                <span className={h.fail_count > 0 ? "text-destructive" : ""}>{h.fail_count}f</span>
                                {prev ? (
                                  delta !== 0 ? (
                                    <span className={delta > 0 ? "text-destructive" : "text-emerald-600"}>
                                      {delta > 0 ? `+${delta}` : delta}
                                    </span>
                                  ) : <span className="text-muted-foreground">·</span>
                                ) : (
                                  <span className="text-muted-foreground" title="Schema mismatch — diff suppressed">—</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                        {rows.length > 0 && (() => {
                          const last = rows[rows.length - 1];
                          const idxInAll = history.findIndex((x) => x.id === last.id);
                          if (idxInAll < history.length - 1) {
                            return (
                              <p className="text-[10px] text-muted-foreground italic pl-1">Schema mismatch with older runs — diff suppressed.</p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  ));
                })()}
              </>
            ) : (
              <>
                {/* Filter bar */}
                {(() => {
                  const filtered = actions.filter((a) => {
                    if (filterType && a.action_type !== filterType) return false;
                    if (filterRun && !(a.run_id || "").startsWith(filterRun)) return false;
                    if (filterCheck && !a.check_id.toLowerCase().includes(filterCheck.toLowerCase())) return false;
                    if (filterAdmin) {
                      const email = (adminEmails[a.admin_id] || "").toLowerCase();
                      if (!email.includes(filterAdmin.toLowerCase())) return false;
                    }
                    return true;
                  });
                  const hasFilter = !!(filterAdmin || filterRun || filterCheck || filterType);
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2">
                        <input
                          value={filterAdmin}
                          onChange={(e) => setFilterAdmin(e.target.value)}
                          placeholder="admin email"
                          className="h-7 rounded-lg border border-border bg-background text-[11px] px-2"
                        />
                        <input
                          value={filterRun}
                          onChange={(e) => setFilterRun(e.target.value.trim())}
                          placeholder="run id (8+ chars)"
                          className="h-7 rounded-lg border border-border bg-background text-[11px] px-2 font-mono"
                        />
                        <input
                          value={filterCheck}
                          onChange={(e) => setFilterCheck(e.target.value)}
                          placeholder="check id"
                          className="h-7 rounded-lg border border-border bg-background text-[11px] px-2 font-mono"
                        />
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="h-7 rounded-lg border border-border bg-background text-[11px] px-2"
                        >
                          <option value="">All actions</option>
                          <option value="copy_fix_sql">Copy fix</option>
                          <option value="copy_failing_query">Copy diagnostic</option>
                          <option value="open_sql_editor">Open in editor</option>
                          <option value="mark_resolved">Mark resolved</option>
                        </select>
                      </div>
                      {hasFilter && (
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">{filtered.length}/{actions.length} matching</span>
                          <button type="button"
                            onClick={() => { setFilterAdmin(""); setFilterRun(""); setFilterCheck(""); setFilterType(""); }}
                            className="text-[10px] text-primary hover:underline"
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                      <div className="space-y-1">
                        {filtered.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground py-2">
                            {actions.length === 0 ? "No remediation actions recorded yet." : "No actions match these filters."}
                          </p>
                        ) : filtered.map((a) => {
                          const email = adminEmails[a.admin_id];
                          return (
                            <div key={a.id} className="flex items-center justify-between text-[11px] border-b border-border/40 last:border-b-0 py-1.5 gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`rounded-full text-[10px] ${actionToneClass[a.action_type]}`}>
                                    {a.action_type.replace(/_/g, " ")}
                                  </Badge>
                                  <span className="text-foreground font-medium truncate">{a.check_name || a.check_id}</span>
                                  {a.run_id && (
                                    <button type="button"
                                      onClick={() => setFilterRun(a.run_id!.slice(0, 8))}
                                      className="text-[9px] px-1 rounded bg-muted font-mono hover:bg-accent"
                                      title="Filter by this run"
                                    >
                                      run·{a.run_id.slice(0, 8)}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                                  {email || `${a.admin_id.slice(0, 8)}…`} · {new Date(a.created_at).toLocaleString()}
                                </p>
                              </div>
                              {a.editor_url && (
                                <a
                                  href={a.editor_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" /> Open
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {data?.ran_at && (
        <p className="text-[10px] text-muted-foreground text-center">
          Generated {new Date(data.ran_at).toLocaleString()} ·
          Use in CI: <code className="px-1 rounded bg-muted">deno run --allow-net --allow-env --allow-write scripts/wiring-check.ts</code>
        </p>
      )}
    </div>
  );
}
