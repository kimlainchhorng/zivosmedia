/**
 * Safe-Area QA Checklist
 *
 * Manual verification page for safe-area handling on iPhone.
 * Route: /dev/qa/safe-area
 *
 * Saves timestamped run snapshots to localStorage (cap 20, FIFO) and lets
 * you download each run as JSON or CSV for archival / sharing.
 *
 * See: docs/dev/capacitor-safe-area.md
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  Download,
  FileJson,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const OVERLAY_KEY = "zivo:debug:safe-area";
const RESULTS_KEY = "zivo:debug:safe-area-qa-results";
const RUNS_KEY = "zivo:debug:safe-area-qa-runs";
const RUNS_CAP = 20;

type Row = {
  id: string;
  page: string;
  route: string;
  check: string;
};

type RunRecord = {
  id: string;
  timestamp: string; // ISO
  platform: { name: string; native: boolean };
  insets: { top: number; bottom: number };
  viewport: { width: number; height: number; dpr: number };
  results: Record<string, boolean>;
  passed: number;
  total: number;
  passRate: number;
};

const DEVICES = [
  { id: "se", label: "iPhone SE (375×667)" },
  { id: "13", label: "iPhone 13 (390×844)" },
  { id: "15pm", label: "iPhone 15 Pro Max (430×932)" },
] as const;

const ROWS: Row[] = [
  { id: "profile-top", page: "Profile", route: "/profile", check: "No white gap above header; flush with status bar" },
  { id: "account-top", page: "Account", route: "/account", check: "No white gap above header; flush with status bar" },
  { id: "chat-top", page: "Chat", route: "/chat", check: "Header sits flush with status bar" },
  { id: "home-top", page: "Home", route: "/", check: "Status bar overlay does not cover content" },
  { id: "nav-bottom", page: "Bottom Nav", route: "/", check: "Bottom nav clears the home indicator" },
  { id: "menu-sheet", page: "Mobile Menu", route: "/account", check: "Side menu footer clears home indicator" },
  { id: "more-bottom", page: "More", route: "/more", check: "List bottom padding clears home indicator" },
  { id: "settings-bottom", page: "Settings", route: "/settings", check: "Save bar clears home indicator" },
  { id: "wallet-bottom", page: "Wallet", route: "/wallet", check: "Action bar clears home indicator" },
];

function readInset(side: "top" | "bottom"): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.height = `env(safe-area-inset-${side}, 0px)`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(px);
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isoStampForFilename(iso: string) {
  return iso.replace(/[:.]/g, "-").replace("Z", "");
}

function runToCsv(run: RunRecord, rows: Row[], devices: ReadonlyArray<{ id: string; label: string }>): string {
  const header = ["run_id", "timestamp", "platform", "native", "page", "route", "check", "device", "passed"].join(",");
  const lines: string[] = [header];
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  for (const r of rows) {
    for (const d of devices) {
      const passed = !!run.results[`${r.id}:${d.id}`];
      lines.push(
        [
          esc(run.id),
          esc(run.timestamp),
          esc(run.platform.name),
          esc(run.platform.native),
          esc(r.page),
          esc(r.route),
          esc(r.check),
          esc(d.label),
          passed ? "true" : "false",
        ].join(","),
      );
    }
  }
  return lines.join("\n");
}

const SafeAreaQAPage = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [overlayOn, setOverlayOn] = useState(false);
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });
  const [runs, setRuns] = useState<RunRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESULTS_KEY);
      if (raw) setResults(JSON.parse(raw));
      setOverlayOn(localStorage.getItem(OVERLAY_KEY) === "1");
      const r = localStorage.getItem(RUNS_KEY);
      if (r) setRuns(JSON.parse(r));
    } catch {
      /* ignore */
    }
    setInsets({ top: readInset("top"), bottom: readInset("bottom") });
  }, []);

  const platform = useMemo(() => {
    const native = Capacitor.isNativePlatform?.() ?? false;
    const p = Capacitor.getPlatform?.() ?? "web";
    return { native, name: p };
  }, []);

  const expected = useMemo(() => {
    if (platform.native && platform.name === "ios")
      return "Capacitor iOS: top should be 0 (overlaysWebView: false). Bottom > 0 on notched devices.";
    if (platform.native && platform.name === "android")
      return "Capacitor Android: top and bottom typically 0; native bars handled by shell.";
    if (platform.name === "web")
      return "Web/PWA: top > 0 only when running as installed PWA on notched iPhone.";
    return "Unknown platform.";
  }, [platform]);

  const total = ROWS.length * DEVICES.length;
  const checked = Object.values(results).filter(Boolean).length;

  const toggleResult = (key: string) => {
    setResults((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleOverlay = () => {
    const next = !overlayOn;
    try {
      localStorage.setItem(OVERLAY_KEY, next ? "1" : "0");
      window.dispatchEvent(new StorageEvent("storage", { key: OVERLAY_KEY, newValue: next ? "1" : "0" }));
    } catch {
      /* ignore */
    }
    setOverlayOn(next);
  };

  const persistRuns = (next: RunRecord[]) => {
    setRuns(next);
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const saveRun = () => {
    const now = new Date().toISOString();
    const passed = Object.values(results).filter(Boolean).length;
    const run: RunRecord = {
      id: `run_${Date.now()}`,
      timestamp: now,
      platform,
      insets: { top: readInset("top"), bottom: readInset("bottom") },
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      results: { ...results },
      passed,
      total,
      passRate: total === 0 ? 0 : passed / total,
    };
    const next = [run, ...runs].slice(0, RUNS_CAP);
    persistRuns(next);
    toast.success(`Run saved (${passed}/${total} passing)`);
  };

  const deleteRun = (id: string) => {
    persistRuns(runs.filter((r) => r.id !== id));
  };

  const downloadJson = (run: RunRecord) => {
    const filename = `safe-area-qa-${isoStampForFilename(run.timestamp)}.json`;
    downloadBlob(filename, "application/json", JSON.stringify(run, null, 2));
  };

  const downloadCsv = (run: RunRecord) => {
    const filename = `safe-area-qa-${isoStampForFilename(run.timestamp)}.csv`;
    downloadBlob(filename, "text/csv", runToCsv(run, ROWS, DEVICES as unknown as Array<{ id: string; label: string }>));
  };

  const downloadAllJson = () => {
    if (runs.length === 0) return;
    const filename = `safe-area-qa-history-${isoStampForFilename(new Date().toISOString())}.json`;
    downloadBlob(filename, "application/json", JSON.stringify({ exportedAt: new Date().toISOString(), runs }, null, 2));
  };

  const exportMarkdown = async () => {
    const lines: string[] = [];
    lines.push(`# Safe-Area QA — ${new Date().toISOString().slice(0, 10)}`);
    lines.push("");
    lines.push(`Platform: \`${platform.name}\` (native=${platform.native})`);
    lines.push(`Live insets: top=${insets.top}px, bottom=${insets.bottom}px`);
    lines.push(`Result: ${checked}/${total} passing`);
    lines.push("");
    lines.push("| Page | Check | " + DEVICES.map((d) => d.label).join(" | ") + " |");
    lines.push("|------|-------|" + DEVICES.map(() => "---").join("|") + "|");
    for (const r of ROWS) {
      const cells = DEVICES.map((d) => (results[`${r.id}:${d.id}`] ? "✅" : "⬜"));
      lines.push(`| ${r.page} | ${r.check} | ${cells.join(" | ")} |`);
    }
    const md = lines.join("\n");
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Markdown copied to clipboard");
    } catch {
      toast.error("Could not copy — open console");
      console.log(md);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Safe-Area QA</h1>
            <p className="text-xs text-muted-foreground">
              {checked}/{total} checks passing · {platform.name}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <Copy className="h-4 w-4 mr-1" /> MD
          </Button>
          <Button size="sm" onClick={saveRun}>
            <Save className="h-4 w-4 mr-1" /> Save run
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-safe space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">top: {insets.top}px</Badge>
              <Badge variant="secondary">bottom: {insets.bottom}px</Badge>
              <Badge variant="outline">
                {platform.name}
                {platform.native ? " (native)" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{expected}</p>
            <Button variant={overlayOn ? "default" : "outline"} size="sm" onClick={toggleOverlay} className="mt-2">
              {overlayOn ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {overlayOn ? "Hide overlay" : "Show overlay"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROWS.map((row) => (
              <div key={row.id} className="space-y-2 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{row.page}</div>
                    <div className="text-xs text-muted-foreground">{row.check}</div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={row.route}>
                      Open <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  {DEVICES.map((d) => {
                    const key = `${row.id}:${d.id}`;
                    return (
                      <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={!!results[key]} onCheckedChange={() => toggleResult(key)} />
                        {d.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Run history ({runs.length}/{RUNS_CAP})</CardTitle>
            {runs.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadAllJson}>
                <Download className="h-4 w-4 mr-1" /> All
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs saved yet. Click "Save run" to snapshot the current checklist.</p>
            ) : (
              runs.map((run) => {
                const date = new Date(run.timestamp);
                const pct = Math.round(run.passRate * 100);
                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {date.toLocaleString()} · {run.passed}/{run.total} ({pct}%)
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {run.platform.name}
                        {run.platform.native ? " · native" : ""} · top={run.insets.top}px · bottom={run.insets.bottom}px ·{" "}
                        {run.viewport.width}×{run.viewport.height}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => downloadJson(run)} aria-label="Download JSON">
                        <FileJson className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadCsv(run)} aria-label="Download CSV">
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRun(run.id)}
                        aria-label="Delete run"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Reference:{" "}
          <Link className="underline" to="/docs/dev/capacitor-safe-area.md">
            docs/dev/capacitor-safe-area.md
          </Link>
        </p>
      </main>
    </div>
  );
};

export default SafeAreaQAPage;
