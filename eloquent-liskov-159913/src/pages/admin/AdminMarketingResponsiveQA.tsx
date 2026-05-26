/**
 * AdminMarketingResponsiveQA — interactive checklist + live preview that lets
 * admins verify the Marketing & Ads section across mobile / iPad / desktop
 * widths, then export a CSV or visual ZIP report (PNG screenshots per breakpoint).
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// toggle-group not available — use buttons
import { toast } from "sonner";
import {
  Smartphone, Tablet, Monitor, Download, ImageDown, Loader2,
  CheckCircle2, XCircle, MinusCircle, ClipboardCheck,
} from "lucide-react";
import { LedgerListSkeleton } from "@/components/admin/ads/MarketingSkeletons";
import MarketingEmptyState from "@/components/admin/ads/MarketingEmptyState";
import { mkHeading, mkBody, mkMeta, mkSection } from "@/components/admin/ads/marketing-tokens";
import { cn } from "@/lib/utils";

type Verdict = "pass" | "fail" | "skip" | null;

interface ChecklistItem {
  id: string;
  group: string;
  label: string;
}

const CHECKLIST: ChecklistItem[] = [
  { id: "tabs-scroll", group: "Layout", label: "Tab bar scrolls without overflow" },
  { id: "wallet-fit", group: "Wallet", label: "Wallet card shows balance + actions without horizontal scroll" },
  { id: "topup-modal", group: "Wallet", label: "Top-up opens as bottom sheet on mobile, dialog on desktop" },
  { id: "wizard-stepper", group: "Wizard", label: "Wizard stepper labels visible" },
  { id: "goal-cards", group: "Wizard", label: "Goal cards stack 1-col mobile, 2-col tablet+" },
  { id: "targeting-form", group: "Wizard", label: "Targeting form readable at 375px" },
  { id: "image-grid", group: "Wizard", label: "Generated images grid 2/2/3 cols" },
  { id: "recs-thumb", group: "Recs", label: "Recommendations buttons reachable with thumb" },
  { id: "platform-tiles", group: "Ads", label: "Platform tiles 2/3/5 col grid" },
  { id: "campaign-rows", group: "Ads", label: "Campaign rows: actions wrap below title on mobile" },
  { id: "connect-dialog", group: "Ads", label: "Connect dialog: full-width buttons mobile" },
  { id: "perf-kpis", group: "Performance", label: "Performance KPIs stack 2-col mobile" },
  { id: "breakdown-cards", group: "Performance", label: "Breakdown table → cards on mobile" },
  { id: "empty-states", group: "Polish", label: "Empty states render at all breakpoints" },
  { id: "skeletons", group: "Polish", label: "Skeletons match real layouts" },
];

const VIEWPORTS: { id: "mobile" | "ipad" | "desktop"; label: string; width: number; height: number; icon: any }[] = [
  { id: "mobile", label: "Mobile", width: 375, height: 812, icon: Smartphone },
  { id: "ipad", label: "iPad", width: 820, height: 1180, icon: Tablet },
  { id: "desktop", label: "Desktop", width: 1440, height: 900, icon: Monitor },
];

export default function AdminMarketingResponsiveQA() {
  const qc = useQueryClient();
  const [storeId, setStoreId] = useState<string>("");
  const [viewport, setViewport] = useState<"mobile" | "ipad" | "desktop">("mobile");
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  /* ─── Stores list ─── */
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["qa-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name")
        .limit(50);
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
  }, [stores, storeId]);

  /* ─── Recent runs ─── */
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["marketing-qa-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_qa_runs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  /* ─── Save run ─── */
  const saveRun = useMutation({
    mutationFn: async (extra: Record<string, any> = {}) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("marketing_qa_runs" as any).insert({
        admin_id: u.user?.id,
        store_id: storeId || null,
        viewport,
        results: { verdicts, ...extra } as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-qa-runs"] });
      toast.success("QA run saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save run"),
  });

  /* ─── Counts ─── */
  const counts = useMemo(() => {
    let pass = 0, fail = 0, skip = 0, todo = 0;
    for (const it of CHECKLIST) {
      const v = verdicts[it.id];
      if (v === "pass") pass++;
      else if (v === "fail") fail++;
      else if (v === "skip") skip++;
      else todo++;
    }
    return { pass, fail, skip, todo };
  }, [verdicts]);

  /* ─── Exports ─── */
  const exportCsv = () => {
    const header = "id,group,label,verdict\n";
    const lines = CHECKLIST
      .map((it) => `"${it.id}","${it.group}","${it.label.replace(/"/g, '""')}","${verdicts[it.id] || "todo"}"`)
      .join("\n");
    const blob = new Blob([header + lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing-qa-${storeId || "no-store"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportVisualReport = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    setExportProgress(5);
    try {
      const [{ toPng }, { downloadZip }] = await Promise.all([
        import("html-to-image"),
        import("client-zip"),
      ]);
      const screenshots: { name: string; input: Blob }[] = [];
      const originalVp = viewport;
      let step = 0;
      for (const vp of VIEWPORTS) {
        setViewport(vp.id);
        // Wait for layout to settle in next frame + 250ms
        await new Promise<void>((r) =>
          requestAnimationFrame(() => setTimeout(() => r(), 300))
        );
        const dataUrl = await toPng(previewRef.current!, {
          cacheBust: true,
          pixelRatio: 1,
          backgroundColor: "#ffffff",
        });
        const blob = await (await fetch(dataUrl)).blob();
        screenshots.push({ name: `screenshots/${vp.id}-${vp.width}.png`, input: blob });
        step++;
        setExportProgress(10 + (step / VIEWPORTS.length) * 70);
      }
      setViewport(originalVp);

      // Build CSV
      const csvHeader = "id,group,label,verdict\n";
      const csvBody = CHECKLIST
        .map((it) => `"${it.id}","${it.group}","${it.label.replace(/"/g, '""')}","${verdicts[it.id] || "todo"}"`)
        .join("\n");
      const summary = {
        store_id: storeId,
        captured_at: new Date().toISOString(),
        viewports: VIEWPORTS.map((v) => ({ id: v.id, width: v.width, height: v.height })),
        counts,
      };

      setExportProgress(85);
      const zipBlob = await downloadZip([
        ...screenshots,
        { name: "checklist.csv", input: csvHeader + csvBody },
        { name: "summary.json", input: JSON.stringify(summary, null, 2) },
      ]).blob();

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketing-qa-${storeId || "no-store"}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportProgress(100);

      await saveRun.mutateAsync({ exported_visual: true, captured_viewports: VIEWPORTS.map((v) => v.id) });
      toast.success("Visual QA report downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to capture report");
    } finally {
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const setVerdict = (id: string, v: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [id]: prev[id] === v ? null : v }));
  };

  const previewUrl = storeId
    ? `/admin/stores/${storeId}`
    : "";

  const activeVp = VIEWPORTS.find((v) => v.id === viewport)!;
  const groups = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>();
    for (const it of CHECKLIST) {
      if (!m.has(it.group)) m.set(it.group, []);
      m.get(it.group)!.push(it);
    }
    return Array.from(m.entries());
  }, []);

  return (
    <div className={cn("p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto", mkSection)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={mkHeading}>Marketing Responsive QA</h1>
          <p className={cn(mkBody, "text-muted-foreground")}>
            Verify the Marketing & Ads area at every breakpoint and export a
            visual report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button size="sm" onClick={exportVisualReport} disabled={exporting || !storeId}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageDown className="h-4 w-4 mr-1.5" />}
            Visual report
          </Button>
        </div>
      </div>

      {exporting && (
        <div className="space-y-1">
          <Progress value={exportProgress} />
          <p className={mkMeta}>Capturing screenshots… {Math.round(exportProgress)}%</p>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <label className={cn(mkMeta, "block mb-1")}>Store</label>
            {storesLoading ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : (
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pick a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className={cn(mkMeta, "block mb-1")}>Viewport</label>
            <div className="inline-flex items-center gap-1 rounded-md border border-border p-1">
              {VIEWPORTS.map((v) => {
                const Icon = v.icon;
                const active = viewport === v.id;
                return (
                  <Button
                    key={v.id}
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    onClick={() => setViewport(v.id)}
                    aria-pressed={active}
                    aria-label={`${v.label} ${v.width}px`}
                    className="h-8 px-2.5 gap-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                    <span className="text-muted-foreground">{v.width}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Live preview · {activeVp.width}×{activeVp.height}
            <Badge variant="secondary" className="text-[10px]">{activeVp.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!storeId ? (
            <MarketingEmptyState
              icon={Monitor}
              title="Pick a store to preview"
              body="Select any store above to load its Marketing & Ads section inside the device frame."
            />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border bg-muted/20 p-3">
              <div
                ref={previewRef}
                className="mx-auto bg-background rounded-xl overflow-hidden border border-border shadow-md transition-all"
                style={{ width: activeVp.width, height: Math.min(activeVp.height, 720) }}
              >
                <iframe
                  title={`Marketing preview at ${activeVp.label}`}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Checklist
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{counts.pass} pass</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">{counts.fail} fail</Badge>
            <Badge variant="outline">{counts.skip} skip</Badge>
            <Badge variant="outline" className="bg-muted">{counts.todo} todo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className={cn(mkMeta, "mb-1.5 uppercase tracking-wider")}>{group}</p>
              <div className="space-y-1.5">
                {items.map((it) => {
                  const v = verdicts[it.id];
                  return (
                    <div key={it.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border/40 bg-background">
                      <span className="text-sm flex-1 min-w-0">{it.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant={v === "pass" ? "default" : "ghost"}
                          className="h-8 w-8"
                          onClick={() => setVerdict(it.id, "pass")}
                          aria-label={`Mark ${it.label} pass`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={v === "fail" ? "destructive" : "ghost"}
                          className="h-8 w-8"
                          onClick={() => setVerdict(it.id, "fail")}
                          aria-label={`Mark ${it.label} fail`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={v === "skip" ? "secondary" : "ghost"}
                          className="h-8 w-8"
                          onClick={() => setVerdict(it.id, "skip")}
                          aria-label={`Mark ${it.label} skip`}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => saveRun.mutate({})} disabled={saveRun.isPending}>
              {saveRun.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save run
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent runs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <LedgerListSkeleton />
          ) : runs.length === 0 ? (
            <MarketingEmptyState
              icon={ClipboardCheck}
              title="No runs yet"
              body="Save your first checklist or visual report to start a history."
            />
          ) : (
            <div className="space-y-1.5">
              {runs.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/40 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px]">{r.viewport || "—"}</Badge>
                    <span className="truncate">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.results?.exported_visual && (
                    <Badge variant="secondary" className="text-[10px]">visual</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
