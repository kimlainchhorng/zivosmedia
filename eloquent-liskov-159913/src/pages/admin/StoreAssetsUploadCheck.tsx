import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";
import { uploadStoreAsset, type UploadSurface } from "./utils/uploadStoreAsset";

type CheckStatus = "idle" | "running" | "passed" | "failed";

interface CheckRow {
  surface: UploadSurface;
  label: string;
  status: CheckStatus;
  publicUrl?: string;
  error?: string;
}

const SURFACES: { surface: UploadSurface; label: string }[] = [
  { surface: "gallery", label: "Gallery" },
  { surface: "logo", label: "Profile / Logo" },
  { surface: "cover", label: "Cover" },
  { surface: "room", label: "Room / Product" },
];

// 1×1 transparent PNG
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function makeTinyPngFile(name: string): File {
  const bytes = Uint8Array.from(atob(TINY_PNG_B64), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: "image/png" });
}

export default function StoreAssetsUploadCheck() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CheckRow[]>(() =>
    SURFACES.map((s) => ({ ...s, status: "idle" as CheckStatus })),
  );
  const [runningAll, setRunningAll] = useState(false);

  const { data: store, isLoading } = useQuery({
    queryKey: ["upload-check-store", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, name, slug")
        .eq("id", storeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const summary = useMemo(() => {
    const total = rows.length;
    const passed = rows.filter((r) => r.status === "passed").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const done = passed + failed;
    return { total, passed, failed, done };
  }, [rows]);

  const setRow = (surface: UploadSurface, patch: Partial<CheckRow>) => {
    setRows((prev) => prev.map((r) => (r.surface === surface ? { ...r, ...patch } : r)));
  };

  const runOne = async (surface: UploadSurface) => {
    if (!storeId) return;
    setRow(surface, { status: "running", error: undefined, publicUrl: undefined });
    const file = makeTinyPngFile(`upload-check-${surface}-${Date.now()}.png`);
    try {
      const { path, publicUrl } = await uploadStoreAsset({
        storeId,
        file,
        surface,
        filename: `upload-check-${surface}-${Date.now()}`,
      });
      // Clean up immediately so we don't litter the bucket
      try {
        await supabase.storage.from("store-assets").remove([path]);
      } catch {
        // non-fatal
      }
      setRow(surface, { status: "passed", publicUrl });
    } catch (e: any) {
      setRow(surface, { status: "failed", error: e?.message || String(e) });
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    setRows((prev) => prev.map((r) => ({ ...r, status: "idle", error: undefined, publicUrl: undefined })));
    for (const { surface } of SURFACES) {
      await runOne(surface);
    }
    setRunningAll(false);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Upload Check">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Upload Check: ${store?.name ?? "Store"}`}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button aria-label="Back to store" variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(`/admin/stores/${storeId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">Store assets upload check</h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {store?.name ? `${store.name} · ` : ""}Verifies gallery, logo, cover, and product image uploads.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Surfaces</CardTitle>
            <Button onClick={runAll} disabled={runningAll} size="sm" className="gap-2">
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.surface}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{row.label}</span>
                    {row.status === "passed" && (
                      <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Passed
                      </Badge>
                    )}
                    {row.status === "failed" && (
                      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
                        <XCircle className="h-3 w-3" /> Failed
                      </Badge>
                    )}
                    {row.status === "running" && (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Running
                      </Badge>
                    )}
                  </div>
                  {row.publicUrl && (
                    <a
                      href={row.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline break-all"
                    >
                      {row.publicUrl}
                    </a>
                  )}
                  {row.error && (
                    <p className="text-xs text-destructive break-words whitespace-pre-wrap">{row.error}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runOne(row.surface)}
                  disabled={row.status === "running" || runningAll}
                >
                  Run check
                </Button>
              </div>
            ))}

            {summary.done > 0 && (
              <div
                className={
                  "mt-3 rounded-md p-3 text-sm font-medium " +
                  (summary.failed === 0
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-destructive/10 text-destructive")
                }
              >
                {summary.passed}/{summary.total} passed
                {summary.failed > 0 ? " — see failures above" : ""}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to={`/admin/stores/${storeId}`} className="text-sm text-muted-foreground hover:text-foreground underline">
            ← Back to store editor
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
