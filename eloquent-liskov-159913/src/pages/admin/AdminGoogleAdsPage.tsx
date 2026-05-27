import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Play, Pause, Globe, TrendingUp, DollarSign, Target,
  CheckCircle2, ExternalLink, Settings2, AlertCircle, Search,
  MousePointer, BarChart2, RefreshCw, Plus, Zap, Info, Eye,
  ArrowUpRight, Edit2,
} from "lucide-react";
import { toast } from "sonner";

// ── Google Ads Customer ID helpers ─────────────────────────────────────────
const LS_KEY = "zivo_google_ads_config";
interface GadsConfig { customerId: string; accountName: string; conversionId?: string; conversionLabel?: string; }
const loadConfig = (): GadsConfig | null => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveConfig = (c: GadsConfig) => localStorage.setItem(LS_KEY, JSON.stringify(c));
const clearConfig = () => localStorage.removeItem(LS_KEY);

// Format Customer ID as 123-456-7890
function fmtCustomerId(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const GOOGLE_BLUE = "#1a73e8";

export default function AdminGoogleAdsPage() {
  const qc = useQueryClient();

  // ── Connection state ──────────────────────────────────────────────────────
  const [config, setConfig] = useState<GadsConfig | null>(() => loadConfig());
  const [showSetup, setShowSetup] = useState(!loadConfig());
  const [formCustomerId, setFormCustomerId] = useState(config?.customerId || "");
  const [formAccountName, setFormAccountName] = useState(config?.accountName || "ZIVO");
  const [formConvId, setFormConvId] = useState(config?.conversionId || "");
  const [formConvLabel, setFormConvLabel] = useState(config?.conversionLabel || "");
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Campaign form state ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignName, setCampaignName] = useState("ZIVO — Search Campaign");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [keywords, setKeywords] = useState("ride app cambodia, food delivery phnom penh, tuk tuk booking, zivo app");
  const [campaignType, setCampaignType] = useState("SEARCH");
  const [finalUrl, setFinalUrl] = useState("https://hizivo.com");
  const [headline, setHeadline] = useState("ZIVO — Rides & Food in Cambodia");
  const [description, setDescription] = useState("Book rides, order food & explore deals on ZIVO. Download now!");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Conversion test state ─────────────────────────────────────────────────
  const [convTestValue, setConvTestValue] = useState("1.00");
  const [convTestOrderId, setConvTestOrderId] = useState(`test_${Date.now()}`);
  const [testing, setTesting] = useState(false);
  const [convResult, setConvResult] = useState<{ ok: boolean; method: string; message: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["ad_campaigns", "google"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_campaigns").select("*").eq("platform", "google").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totals = (campaigns as any[]).reduce(
    (acc, c) => ({
      spend: acc.spend + (c.total_spend_cents ?? 0),
      conversions: acc.conversions + (c.conversions ?? 0),
      impressions: acc.impressions + (c.impressions ?? 0),
      clicks: acc.clicks + (c.clicks ?? 0),
    }),
    { spend: 0, conversions: 0, impressions: 0, clicks: 0 }
  );
  const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00";
  const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // ── Save connection config ────────────────────────────────────────────────
  const saveConnection = useCallback(async () => {
    const cid = formCustomerId.replace(/\D/g, "");
    if (cid.length < 10) { toast.error("Enter a valid 10-digit Customer ID"); return; }
    setSavingConfig(true);
    const cfg: GadsConfig = {
      customerId: fmtCustomerId(cid),
      accountName: formAccountName.trim() || "ZIVO",
      conversionId: formConvId.trim() || undefined,
      conversionLabel: formConvLabel.trim() || undefined,
    };
    saveConfig(cfg);
    setConfig(cfg);
    setShowSetup(false);
    toast.success(`Connected to Google Ads account "${cfg.customerId}"`);
    setSavingConfig(false);
  }, [formCustomerId, formAccountName, formConvId, formConvLabel]);

  // ── Create campaign (save to Supabase + open Google Ads) ─────────────────
  const createCampaign = async () => {
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from("ad_campaigns").insert({
        platform: "google",
        name: campaignName.trim(),
        daily_budget_cents: Math.round(parseFloat(dailyBudget) * 100),
        status: "pending",
        metadata: {
          type: campaignType,
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          final_url: finalUrl,
          headline,
          description,
          customer_id: config?.customerId,
        },
      } as any);
      if (error) throw error;
      toast.success("Campaign saved — finish setup in Google Ads below");
      qc.invalidateQueries({ queryKey: ["ad_campaigns", "google"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save campaign");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (c: any) => {
    setTogglingId(c.id);
    const next = c.status === "active" ? "paused" : "active";
    try {
      await supabase.from("ad_campaigns").update({ status: next }).eq("id", c.id);
      qc.invalidateQueries({ queryKey: ["ad_campaigns", "google"] });
      toast.success(`Campaign ${next}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setTogglingId(null); }
  };

  // ── Fire test conversion via gtag ─────────────────────────────────────────
  const fireTestConversion = async () => {
    if (!config?.conversionId) { toast.error("Enter a Conversion ID in settings first"); return; }
    setTesting(true);
    setConvResult(null);
    const orderId = convTestOrderId || `test_${Date.now()}`;
    const value = parseFloat(convTestValue) || 1.0;
    try {
      // Try gtag (client-side) first
      const w = window as any;
      if (typeof w.gtag === "function") {
        const sendTo = config.conversionLabel
          ? `${config.conversionId}/${config.conversionLabel}`
          : config.conversionId;
        w.gtag("event", "conversion", {
          send_to: sendTo,
          value,
          currency: "USD",
          transaction_id: orderId,
        });
        setConvResult({ ok: true, method: "gtag", message: `Conversion fired via gtag → ${sendTo}` });
        toast.success("Conversion sent via gtag! Check Google Ads → Diagnostics.");
      } else {
        // gtag not loaded — record in Supabase as fallback
        await supabase.from("feedback_submissions" as any).insert({
          category: "google_ads_conversion_test",
          message: JSON.stringify({ conversion_id: config.conversionId, order_id: orderId, value_usd: value, ts: new Date().toISOString() }),
          status: "pending",
        });
        setConvResult({ ok: false, method: "supabase", message: "gtag not found on page — conversion logged to Supabase. Add the Google tag to your site to enable live tracking." });
        toast.warning("gtag not detected — conversion saved to Supabase log");
      }
    } catch (e: any) {
      setConvResult({ ok: false, method: "error", message: e.message });
      toast.error("Conversion test failed: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  // ── Google Ads deep link ──────────────────────────────────────────────────
  const gadsUrl = config?.customerId
    ? `https://ads.google.com/aw/campaigns?ocid=${config.customerId.replace(/-/g, "")}`
    : "https://ads.google.com";

  return (
    <AdminLayout title="Google Ads">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Ads
            </h2>
            <p className="text-sm text-muted-foreground">Campaigns, keywords, and conversion tracking for ZIVO.</p>
          </div>
          {config && (
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />{config.customerId}</Badge>
              <a href={gadsUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" style={{ color: GOOGLE_BLUE, borderColor: `${GOOGLE_BLUE}40` }}>
                  <ExternalLink className="h-3.5 w-3.5" /> Open Google Ads
                </Button>
              </a>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => { setShowSetup(true); setFormCustomerId(config.customerId); setFormAccountName(config.accountName); setFormConvId(config.conversionId || ""); setFormConvLabel(config.conversionLabel || ""); }}>
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          )}
        </div>

        {/* ── Setup / Connection ── */}
        {showSetup && (
          <Card className="border-[#1a73e8]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" style={{ color: GOOGLE_BLUE }} /> Connect your Google Ads account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl p-4 space-y-2 border" style={{ borderColor: `${GOOGLE_BLUE}30`, background: `${GOOGLE_BLUE}06` }}>
                <div className="flex gap-2 items-start">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: GOOGLE_BLUE }} />
                  <p className="text-sm font-semibold" style={{ color: GOOGLE_BLUE }}>How to find your Customer ID</p>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1.5 pl-6 list-decimal">
                  <li>Go to <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-medium" style={{ color: GOOGLE_BLUE }}>ads.google.com</a></li>
                  <li>Your Customer ID is in the top-right corner — format <code className="text-xs bg-muted px-1 rounded">123-456-7890</code></li>
                  <li>For conversions, go to <strong>Goals → Conversions → your action → ID</strong></li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Customer ID <span className="text-red-500">*</span></Label>
                  <Input
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(fmtCustomerId(e.target.value))}
                    placeholder="123-456-7890"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Name</Label>
                  <Input value={formAccountName} onChange={(e) => setFormAccountName(e.target.value)} placeholder="ZIVO" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Conversion ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={formConvId} onChange={(e) => setFormConvId(e.target.value)} placeholder="AW-XXXXXXXXXX" className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Conversion Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={formConvLabel} onChange={(e) => setFormConvLabel(e.target.value)} placeholder="AbCdEfGhIj" className="font-mono text-xs" />
                </div>
              </div>

              <Button
                onClick={saveConnection}
                disabled={savingConfig || formCustomerId.replace(/\D/g, "").length < 10}
                className="w-full gap-2 text-white"
                style={{ background: GOOGLE_BLUE }}
              >
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save & Connect
              </Button>
              {config && (
                <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)} className="w-full text-muted-foreground">
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Spend", value: fmtUsd(totals.spend), icon: DollarSign, color: "#EA4335" },
            { label: "Impressions", value: totals.impressions.toLocaleString(), icon: Eye, color: "#4285F4" },
            { label: "Clicks / CTR", value: `${totals.clicks.toLocaleString()} (${ctr}%)`, icon: MousePointer, color: "#34A853" },
            { label: "Conversions", value: String(totals.conversions), icon: Target, color: "#FBBC04" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
                <div className="text-xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="campaigns" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" /> Campaigns</TabsTrigger>
            <TabsTrigger value="conversions" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Conversions</TabsTrigger>
          </TabsList>

          {/* ══ CAMPAIGNS ══ */}
          <TabsContent value="campaigns" className="mt-4 space-y-5">

            {/* Create form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> New Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign type */}
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[["SEARCH", "Search"], ["DISPLAY", "Display"], ["PERFORMANCE_MAX", "Performance Max"], ["VIDEO", "Video"]].map(([val, label]) => (
                      <button type="button" key={val} onClick={() => setCampaignType(val)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all font-medium ${campaignType === val ? "text-white border-transparent" : "border-border hover:bg-muted"}`}
                        style={campaignType === val ? { background: GOOGLE_BLUE } : {}}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Campaign Name</Label>
                    <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Daily Budget (USD)</Label>
                    <Input type="number" min="1" step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Headline</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={30} />
                  <p className="text-xs text-muted-foreground text-right">{headline.length}/30</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={90} />
                  <p className="text-xs text-muted-foreground text-right">{description.length}/90</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Keywords (comma separated)</Label>
                  <Textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={2} placeholder="ride app, food delivery phnom penh, tuk tuk booking…" />
                </div>

                <div className="space-y-1.5">
                  <Label>Final URL</Label>
                  <Input value={finalUrl} onChange={(e) => setFinalUrl(e.target.value)} placeholder="https://hizivo.com" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={createCampaign} disabled={creating} className="gap-2 text-white flex-1" style={{ background: GOOGLE_BLUE }}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Save Campaign
                  </Button>
                  <a href={gadsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="gap-2 w-full" style={{ color: GOOGLE_BLUE, borderColor: `${GOOGLE_BLUE}40` }}>
                      <ArrowUpRight className="h-4 w-4" /> Launch in Google Ads
                    </Button>
                  </a>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2 items-start">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Campaigns are saved here for tracking. To make them live, click <strong>Launch in Google Ads</strong> and create the campaign with the same settings there. Google Ads API requires a Developer Token approved by Google — once approved, creation will happen automatically.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Campaign list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Campaigns ({(campaigns as any[]).length})</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["ad_campaigns", "google"] })} className="gap-1 h-8 text-xs text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                {!isLoading && (campaigns as any[]).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No campaigns yet</p>
                    <p className="text-xs mt-1">Create your first campaign above</p>
                  </div>
                )}
                {!isLoading && (campaigns as any[]).length > 0 && (
                  <div className="divide-y">
                    {(campaigns as any[]).map((c) => {
                      const meta = c.metadata as any;
                      const kws: string[] = meta?.keywords ?? [];
                      return (
                        <div key={c.id} className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-semibold text-sm truncate">{c.name}</p>
                                <Badge variant={c.status === "active" ? "default" : c.status === "pending" ? "outline" : "secondary"} className="capitalize text-xs">{c.status}</Badge>
                                {meta?.type && <Badge variant="outline" className="text-xs">{meta.type}</Badge>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmtUsd(c.daily_budget_cents ?? 0)}/day</span>
                                {c.impressions > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{c.impressions.toLocaleString()} imp</span>}
                                {c.clicks > 0 && <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{c.clicks.toLocaleString()} clicks</span>}
                                {c.conversions > 0 && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{c.conversions} conv</span>}
                                {c.total_spend_cents > 0 && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmtUsd(c.total_spend_cents)} spent</span>}
                              </div>
                              {kws.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {kws.slice(0, 5).map(kw => (
                                    <span key={kw} className="text-[10px] bg-muted border rounded px-1.5 py-0.5">{kw}</span>
                                  ))}
                                  {kws.length > 5 && <span className="text-[10px] text-muted-foreground">+{kws.length - 5} more</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button size="sm" variant="outline" disabled={togglingId === c.id} onClick={() => toggleStatus(c)} className="gap-1 h-7 text-xs">
                                {togglingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : c.status === "active" ? <><Pause className="h-3 w-3" />Pause</> : <><Play className="h-3 w-3" />Enable</>}
                              </Button>
                              <a href={gadsUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs w-full" style={{ color: GOOGLE_BLUE }}>
                                  <ExternalLink className="h-3 w-3" /> View
                                </Button>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ CONVERSIONS ══ */}
          <TabsContent value="conversions" className="mt-4 space-y-5">

            {/* Setup guide */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" style={{ color: GOOGLE_BLUE }} /> Conversion Tracking Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${GOOGLE_BLUE}30`, background: `${GOOGLE_BLUE}06` }}>
                  <p className="text-sm font-semibold" style={{ color: GOOGLE_BLUE }}>How to set up Google Ads Conversion Tracking</p>
                  <ol className="text-sm text-muted-foreground space-y-2 pl-5 list-decimal">
                    <li>Go to <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: GOOGLE_BLUE }}>Google Ads</a> → <strong>Goals</strong> → <strong>Conversions</strong> → <strong>New conversion action</strong></li>
                    <li>Select <strong>Website</strong> → enter <code className="text-xs bg-muted px-1 rounded">hizivo.com</code> → choose an action (e.g. <em>Purchase</em>)</li>
                    <li>Copy the <strong>Conversion ID</strong> (format: <code className="text-xs bg-muted px-1 rounded">AW-XXXXXXXXXX</code>) and <strong>Conversion Label</strong></li>
                    <li>Paste them in <strong>Edit</strong> (top right) → save — then click <strong>Fire Test Conversion</strong> below</li>
                    <li>Check Google Ads → <strong>Goals → Diagnostics</strong> to confirm it arrived</li>
                  </ol>
                </div>

                {/* Current conversion config */}
                {config?.conversionId ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Conversion ID configured</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {config.conversionId}{config.conversionLabel ? `/${config.conversionLabel}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => setShowSetup(true)}>Edit</Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-700">No Conversion ID yet</p>
                      <p className="text-xs text-muted-foreground">Add your Conversion ID in the account settings to enable tracking.</p>
                    </div>
                    <Button size="sm" onClick={() => setShowSetup(true)}>Add</Button>
                  </div>
                )}

                <Separator />

                {/* Test conversion */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Fire Test Conversion</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Value (USD)</Label>
                      <Input type="number" step="0.01" min="0" value={convTestValue} onChange={(e) => setConvTestValue(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Order / Transaction ID</Label>
                      <Input value={convTestOrderId} onChange={(e) => setConvTestOrderId(e.target.value)} className="font-mono text-xs" />
                    </div>
                  </div>
                  <Button
                    onClick={fireTestConversion}
                    disabled={testing || !config?.conversionId}
                    className="gap-2 text-white w-full"
                    style={{ background: GOOGLE_BLUE }}
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Fire Test Conversion — ${parseFloat(convTestValue || "0").toFixed(2)}
                  </Button>

                  {convResult && (
                    <div className={`rounded-xl border p-3 space-y-1 ${convResult.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                      <div className="flex items-center gap-2">
                        {convResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                        <p className={`text-sm font-semibold ${convResult.ok ? "text-emerald-700" : "text-amber-700"}`}>
                          {convResult.ok ? "Conversion Fired!" : "Conversion Not Sent via gtag"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{convResult.message}</p>
                      {convResult.ok && (
                        <a href="https://ads.google.com/aw/conversions" target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="mt-1 gap-1 text-xs" style={{ color: GOOGLE_BLUE }}>
                            <ExternalLink className="h-3 w-3" /> Check in Google Ads → Conversions
                          </Button>
                        </a>
                      )}
                      {!convResult.ok && convResult.method === "supabase" && (
                        <div className="mt-2 p-2 rounded bg-muted text-xs space-y-1">
                          <p className="font-semibold">To enable live conversion tracking:</p>
                          <p>1. Add the Google tag (<code>gtag.js</code>) to your site's <code>&lt;head&gt;</code></p>
                          <p>2. Initialize with your Conversion ID: <code className="bg-background px-1 rounded">{config?.conversionId}</code></p>
                          <a href="https://support.google.com/google-ads/answer/6095821" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: GOOGLE_BLUE }}>
                            Google Tag setup guide →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quick links */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Quick Links</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Campaigns", "https://ads.google.com/aw/campaigns"],
                      ["Conversions", "https://ads.google.com/aw/conversions"],
                      ["Keywords", "https://ads.google.com/aw/keywords"],
                      ["Reports", "https://ads.google.com/aw/reporting"],
                      ["Billing", "https://ads.google.com/aw/billing"],
                      ["Diagnostics", "https://ads.google.com/aw/diagnostics"],
                    ].map(([label, href]) => (
                      <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start text-xs h-8" style={{ color: GOOGLE_BLUE }}>
                          <ExternalLink className="h-3 w-3" /> {label}
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
