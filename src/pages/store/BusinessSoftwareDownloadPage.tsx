import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

export default function BusinessSoftwareDownloadPage() {
  const { storeId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const category = (searchParams.get("category") || "business").toLowerCase();
  const isAutoRepair = category === "auto-repair";
  const softwareName = isAutoRepair ? "ZIVO Auto Repair Software" : "ZIVO Business App";
  const installerName = isAutoRepair
    ? "ZIVO Auto Repair Software-1.1.0-arm64.dmg"
    : "ZIVO Business App Launcher.html";
  const downloadHref = useMemo(() => (
    isAutoRepair
      ? `/downloads/auto-repair/${encodeURIComponent(installerName)}`
      : `/admin/stores/${encodeURIComponent(storeId)}?tab=software`
  ), [installerName, isAutoRepair, storeId]);
  const dashboardParams = new URLSearchParams({ tab: isAutoRepair ? "ar-dashboard" : "software" });
  if (isAutoRepair) dashboardParams.set("category", "auto-repair");
  const dashboardHref = `/admin/stores/${encodeURIComponent(storeId)}?${dashboardParams.toString()}`;

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">{softwareName}</h1>
              <span className="rounded-full bg-muted px-4 py-1 text-sm font-semibold">
                Business download
              </span>
            </div>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Download the desktop app for this business, then open it to work with the shop tools.
            </p>
          </div>
          <Link
            to={dashboardHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-base font-semibold hover:bg-muted"
          >
            <ExternalLink className="h-5 w-5" />
            Open Dashboard
          </Link>
        </header>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{isAutoRepair ? "Auto repair desktop app" : "Business app"}</h2>
                  {isAutoRepair && (
                    <span className="rounded-full border border-emerald-200 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Auto repair only
                    </span>
                  )}
                </div>
                <p className="max-w-2xl text-muted-foreground">
                  {isAutoRepair
                    ? "This installs the Auto Repair workspace only: dashboard, work orders, VIN, invoices, parts, technicians, reports, and software updates."
                    : "This opens the business software center for this store."}
                </p>
              </div>
            </div>
            <a
              href={downloadHref}
              download={installerName}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-5 text-base font-semibold text-white hover:bg-black/90"
            >
              <Download className="h-5 w-5" />
              Download macOS App
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Business account required", "Works online and offline", "Updates from Software & Apps"].map((item) => (
              <div key={item} className="rounded-xl border bg-muted/30 px-4 py-3 text-sm font-semibold">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
