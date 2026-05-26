import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Shield, Star, Power, CheckCircle2, XCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Report = {
  report_id: string;
  bot_id: string;
  bot_username: string;
  bot_display_name: string;
  bot_is_active: boolean;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type Summary = {
  total_bots: number;
  active_bots: number;
  featured_bots: number;
  open_reports: number;
  total_reports: number;
  total_ratings: number;
};

export default function BotAdminPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat/bots");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<string>("open");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: ok } = await supabase.rpc("is_bot_admin");
    if (!ok) { setAuthorized(false); setLoading(false); return; }
    setAuthorized(true);
    const [{ data: rep, error: re }, { data: s }] = await Promise.all([
      supabase.rpc("admin_bot_reports", { p_status: filter }),
      supabase.rpc("admin_bots_summary"),
    ]);
    if (re) toast.error(re.message);
    setReports((rep ?? []) as Report[]);
    const ss = Array.isArray(s) ? s[0] : s;
    setSummary(ss as Summary | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const review = async (r: Report, status: string, deactivate = false) => {
    const { error } = await supabase.rpc("admin_review_report", {
      p_report_id: r.report_id, p_status: status, p_deactivate_bot: deactivate,
    });
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const toggleActive = async (r: Report) => {
    const { error } = await supabase.rpc("admin_set_bot_active", { p_bot_id: r.bot_id, p_active: !r.bot_is_active });
    if (error) return toast.error(error.message);
    toast.success(r.bot_is_active ? "Bot deactivated" : "Bot reactivated");
    load();
  };

  const toggleFeatured = async (r: Report) => {
    const { data: cur } = await supabase.from("bots").select("featured").eq("id", r.bot_id).maybeSingle();
    const { error } = await supabase.rpc("admin_feature_bot", { p_bot_id: r.bot_id, p_featured: !(cur?.featured) });
    if (error) return toast.error(error.message);
    toast.success(cur?.featured ? "Unfeatured" : "Featured");
    load();
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div>
          <Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <div className="text-sm font-medium">Admin access required</div>
          <div className="text-xs text-muted-foreground mb-3">You need admin or moderator role.</div>
          <Button size="sm" onClick={() => navigate("/chat/bots")}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex items-center gap-1">
            <Shield className="w-4 h-4" /> Bot Admin
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {summary && (
          <section className="grid grid-cols-3 gap-2">
            <Stat label="Bots" value={summary.active_bots} sub={`/ ${summary.total_bots} total`} />
            <Stat label="Featured" value={summary.featured_bots} />
            <Stat label="Open reports" value={summary.open_reports} sub={`/ ${summary.total_reports} total`} alert={summary.open_reports > 0} />
          </section>
        )}

        <div className="flex gap-2 overflow-x-auto">
          {(["open","reviewed","actioned","dismissed",""] as const).map((f) => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
                filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted/40"
              }`}
            >
              {f || "All"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
              No reports.
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.report_id} className="rounded-2xl bg-card border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.bot_display_name} <span className="text-muted-foreground">@{r.bot_username}</span></div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-red-600 font-medium">{r.reason}</span> · {new Date(r.created_at).toLocaleString()}
                      {!r.bot_is_active && <span className="ml-1 text-amber-600">· deactivated</span>}
                    </div>
                    {r.details && <div className="text-xs mt-1 text-muted-foreground">{r.details}</div>}
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    r.status === "open" ? "bg-red-100 text-red-700" :
                    r.status === "actioned" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{r.status}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => review(r, "dismissed")} className="gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => review(r, "reviewed")} className="gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => review(r, "actioned", true)} className="gap-1">
                    <Power className="w-3.5 h-3.5" /> Take down
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r)} className="gap-1">
                    <Power className="w-3.5 h-3.5" /> {r.bot_is_active ? "Disable bot" : "Re-enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleFeatured(r)} className="gap-1">
                    <Star className="w-3.5 h-3.5" /> Toggle featured
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: number; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${alert ? "bg-red-50 border border-red-200" : "bg-muted/50"}`}>
      <div className={`text-xl font-semibold ${alert ? "text-red-700" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
