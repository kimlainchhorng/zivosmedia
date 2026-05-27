/**
 * AdminStoriesFunnelPage — Funnel dashboard for story deep-link performance.
 * Opens → segment views → closes (with completion %), per source and per top
 * story, plus a missing-rate breakdown by reason.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useStoryFunnel } from "@/hooks/useStoryFunnel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RANGES = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
];

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtInt = (n: number) => n.toLocaleString();

export default function AdminStoriesFunnelPage() {
  const { isAdmin, isLoading: roleLoading } = useAuth();
  const [days, setDays] = useState(7);
  const { data, isLoading, isFetching, refetch, error } = useStoryFunnel(days);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto">
      <Helmet>
        <title>Stories Deep-Link Funnel — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ig-gradient">Stories Deep-Link Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Opens → segment views → completion, per source and per story.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={r.days === days ? "default" : "outline"}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            Failed to load analytics: {(error as any)?.message || "Unknown error"}
          </CardContent>
        </Card>
      )}

      {(isLoading || !data) ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Opens", value: data.totals.opens },
              { label: "Segment views", value: data.totals.segmentViews },
              { label: "Closes", value: data.totals.closes },
              { label: "Completed", value: data.totals.completedCloses },
              { label: "Missing", value: data.totals.missing },
            ].map((t) => (
              <Card key={t.label}>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{fmtInt(t.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Funnel by source */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Funnel by source</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Rendered</TableHead>
                    <TableHead className="text-right">Render %</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Completion %</TableHead>
                    <TableHead className="text-right">Missing %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bySource.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No story events in this window yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.bySource.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="font-medium capitalize">{row.source}</TableCell>
                      <TableCell className="text-right">{fmtInt(row.opens)}</TableCell>
                      <TableCell className="text-right">{fmtInt(row.segmentViews)}</TableCell>
                      <TableCell className="text-right">{fmtPct(row.renderRate)}</TableCell>
                      <TableCell className="text-right">{fmtInt(row.completedCloses)}</TableCell>
                      <TableCell className="text-right">{fmtPct(row.completionRate)}</TableCell>
                      <TableCell className="text-right">{fmtPct(row.missingRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top stories */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Top 10 stories by open → render conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Story ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Rendered</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Completions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topStories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Not enough data — stories need at least 3 opens to appear.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.topStories.map((s) => (
                    <TableRow key={s.story_id}>
                      <TableCell className="font-mono text-xs">{s.story_id.slice(0, 8)}…</TableCell>
                      <TableCell className="capitalize">{s.source}</TableCell>
                      <TableCell className="text-right">{fmtInt(s.opens)}</TableCell>
                      <TableCell className="text-right">{fmtInt(s.segmentViews)}</TableCell>
                      <TableCell className="text-right">{fmtPct(s.conversion)}</TableCell>
                      <TableCell className="text-right">{fmtInt(s.completions)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Missing reasons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Missing-story reasons</CardTitle>
            </CardHeader>
            <CardContent>
              {data.missing.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No missing-story events 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {data.missing.map((m) => {
                    const max = Math.max(...data.missing.map((x) => x.count));
                    const pct = max ? (m.count / max) * 100 : 0;
                    return (
                      <div key={m.reason} className="flex items-center gap-3">
                        <div className="w-28 text-sm font-medium capitalize">{m.reason.replace("_", " ")}</div>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-destructive rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-sm tabular-nums">{fmtInt(m.count)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
