/**
 * AdsStudioWizard — AI-powered ad creative generator for store owners.
 * 4 steps: Goal → Offer → Targeting+Budget → AI Generate → Export bundles.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Target, DollarSign, Wand2, Loader2, Check, Copy,
  Facebook, Instagram, Music2, Youtube, Search as GoogleIcon, Download, ExternalLink, Image as ImageIcon, Video,
} from "@/lib/lucide-react";
import { WizardSkeleton } from "@/components/admin/ads/MarketingSkeletons";
import MarketingEmptyState from "@/components/admin/ads/MarketingEmptyState";

interface Props {
  storeId: string;
  storeName?: string;
  storeSlug?: string;
}

type Goal = "traffic" | "leads" | "bookings" | "awareness";
type Platform = "google" | "meta" | "tiktok" | "youtube";

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "traffic", label: "Get visits", desc: "Drive people to your store page" },
  { id: "leads", label: "Get leads", desc: "Capture phone calls & messages" },
  { id: "bookings", label: "Drive bookings", desc: "Customers book a service or buy" },
  { id: "awareness", label: "Brand awareness", desc: "Reach as many people as possible" },
];

const PLATFORM_META: Record<Platform, { label: string; icon: any; color: string }> = {
  google: { label: "Google + Maps", icon: GoogleIcon, color: "text-[#4285F4]" },
  meta: { label: "Facebook + Instagram", icon: Facebook, color: "text-[#1877F2]" },
  tiktok: { label: "TikTok", icon: Music2, color: "text-foreground" },
  youtube: { label: "YouTube Shorts", icon: Youtube, color: "text-[#FF0000]" },
};

const PRICE_CENTS = { copy: 25, image: 100, video_script: 50 };

export default function AdsStudioWizard({ storeId, storeName, storeSlug }: Props) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<Goal>("traffic");
  const [offer, setOffer] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(15);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(55);
  const [dailyBudget, setDailyBudget] = useState(20);
  const [platforms, setPlatforms] = useState<Platform[]>(["google", "meta", "tiktok", "youtube"]);
  const [imageCount, setImageCount] = useState(2);
  const [genVideo, setGenVideo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [exporting, setExporting] = useState<Platform | null>(null);
  const [exports, setExports] = useState<any>(null);

  const estCost = PRICE_CENTS.copy + imageCount * PRICE_CENTS.image + (genVideo ? PRICE_CENTS.video_script : 0);

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleGenerate = async () => {
    if (!offer.trim()) { toast.error("Tell us what to advertise"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ads-studio-generate", {
        body: {
          store_id: storeId,
          goal,
          service_summary: offer,
          store_name: storeName,
          store_city: city,
          targeting: { city, radius_km: radius, age_min: ageMin, age_max: ageMax },
          platforms,
          generate: { copy: true, images: imageCount, video_scripts: genVideo },
        },
      });
      if (error) throw error;
      const d: any = data;
      if (d?.error === "insufficient_balance") {
        toast.error(d.message || "Top up your Ads wallet to continue.");
        return;
      }
      if (d?.error) throw new Error(d.error);

      // Persist creative
      const { data: creative, error: insErr } = await supabase
        .from("ads_studio_creatives")
        .insert({
          store_id: storeId,
          goal,
          targeting: { city, radius_km: radius, age_min: ageMin, age_max: ageMax },
          budget: { daily: dailyBudget, currency: "USD" },
          headlines: d.copy?.headlines ?? {},
          descriptions: d.copy?.descriptions ?? {},
          ctas: d.copy?.ctas ?? [],
          hashtags: d.copy?.hashtags ?? [],
          image_urls: d.images ?? [],
          video_scripts: d.video_scripts ?? null,
          platforms,
          status: "ready",
        })
        .select()
        .maybeSingle();
      if (insErr) console.warn(insErr);

      // Auto-create A/B variants from the first 3 headlines + images
      if (creative?.id) {
        const allHeadlines: string[] = [
          ...(d.copy?.headlines?.meta || []),
          ...(d.copy?.headlines?.google || []),
          ...(d.copy?.headlines?.tiktok || []),
        ];
        const variants = allHeadlines.slice(0, 3).map((h: string, i: number) => ({
          creative_id: creative.id,
          store_id: storeId,
          variant_label: String.fromCharCode(65 + i), // A, B, C
          headline: h,
          description: d.copy?.descriptions?.short?.[i] || d.copy?.descriptions?.short?.[0] || null,
          image_url: d.images?.[i % Math.max(1, d.images?.length || 1)]?.url || null,
          cta: d.copy?.ctas?.[i % Math.max(1, d.copy?.ctas?.length || 1)] || null,
          is_active: true,
        }));
        if (variants.length > 0) {
          await supabase.from("ads_studio_variants" as any).insert(variants);
        }
      }

      setResult({ ...d, creative_id: creative?.id });
      setStep(4);
      toast.success(`Generated! Cost: $${(d.cost_cents / 100).toFixed(2)} · Balance: $${((d.balance_after_cents ?? 0) / 100).toFixed(2)}`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally { setLoading(false); }
  };

  const handleExport = async (p: Platform) => {
    if (!result?.creative_id) { toast.error("No creative to export"); return; }
    setExporting(p);
    try {
      const { data, error } = await supabase.functions.invoke("ads-studio-export", {
        body: { creative_id: result.creative_id },
      });
      if (error) throw error;
      setExports(data);

      if (p === "google") {
        const blob = new Blob([data.bundles.google_csv], { type: "text/csv" });
        downloadBlob(blob, `zivo-google-ads-${storeSlug || storeId}.csv`);
      } else if (p === "meta" || p === "tiktok" || p === "youtube") {
        const bundle = data.bundles[p];
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
        downloadBlob(blob, `zivo-${p}-ads-${storeSlug || storeId}.json`);
      }
      toast.success(`${PLATFORM_META[p].label} bundle downloaded`);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally { setExporting(null); }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stepper with labels */}
      <div className="flex items-center gap-1 sm:gap-2">
        {[
          { n: 1, label: "Goal" },
          { n: 2, label: "Offer" },
          { n: 3, label: "Targeting" },
          { n: 4, label: "Results" },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold transition ${
                step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{step > s.n ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : s.n}</div>
              <span className={`text-[9px] sm:text-[10px] font-medium hidden xs:block ${step >= s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <div className={`h-0.5 flex-1 -mt-3 sm:-mt-4 ${step > s.n ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Goal */}
      {step === 1 && (
        <Card><CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm sm:text-base">Pick your goal</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button type="button" key={g.id} onClick={() => setGoal(g.id)}
                className={`text-left p-3 rounded-xl border-2 transition active:scale-[0.98] touch-manipulation min-h-[64px] ${
                  goal === g.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}>
                <p className="font-semibold text-sm">{g.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
          <Button className="w-full h-11 sm:h-10" onClick={() => setStep(2)}>Continue</Button>
        </CardContent></Card>
      )}

      {/* Step 2: Offer */}
      {step === 2 && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-semibold">What are you advertising?</h3></div>
          <Textarea
            placeholder="Example: 20% off oil changes this month, plus free tire rotation. Family-owned auto shop in Phnom Penh, open 7 days."
            value={offer} onChange={(e) => setOffer(e.target.value)} rows={4}
            maxLength={500}
          />
          <p className="text-[11px] text-muted-foreground">{offer.length}/500 — Be specific. AI uses this to write headlines & generate images.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="flex-1 h-11 sm:h-10" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1 h-11 sm:h-10" onClick={() => setStep(3)} disabled={!offer.trim()}>Continue</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Step 3: Targeting + Budget + Platforms */}
      {step === 3 && (
        <Card><CardContent className="p-3 sm:p-4 space-y-4">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm sm:text-base">Targeting & budget</h3></div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">City</Label>
              <Input placeholder="Phnom Penh" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Radius (km)</Label>
              <Input type="number" min={1} max={500} value={radius} onChange={(e) => setRadius(+e.target.value || 15)} />
            </div>
            <div>
              <Label className="text-xs">Age min</Label>
              <Input type="number" min={13} max={99} value={ageMin} onChange={(e) => setAgeMin(+e.target.value || 18)} />
            </div>
            <div>
              <Label className="text-xs">Age max</Label>
              <Input type="number" min={13} max={99} value={ageMax} onChange={(e) => setAgeMax(+e.target.value || 55)} />
            </div>
            <div>
              <Label className="text-xs">Daily budget (USD)</Label>
              <Input type="number" min={5} value={dailyBudget} onChange={(e) => setDailyBudget(+e.target.value || 20)} />
            </div>
            <div>
              <Label className="text-xs">Image variants</Label>
              <Select value={String(imageCount)} onValueChange={(v) => setImageCount(+v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No images</SelectItem>
                  <SelectItem value="1">1 (square only)</SelectItem>
                  <SelectItem value="2">2 (square + vertical)</SelectItem>
                  <SelectItem value="4">4 (all aspects)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Platforms</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                const M = PLATFORM_META[p]; const Icon = M.icon; const on = platforms.includes(p);
                return (
                  <button type="button" key={p} onClick={() => togglePlatform(p)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-sm active:scale-[0.98] touch-manipulation min-h-[44px] ${
                      on ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                    <Icon className={`h-4 w-4 ${M.color}`} />
                    <span className="font-medium">{M.label}</span>
                    {on && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer">
            <input type="checkbox" checked={genVideo} onChange={(e) => setGenVideo(e.target.checked)} className="h-4 w-4" />
            <span>Also generate TikTok + YouTube Shorts video scripts</span>
          </label>

          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estimated AI cost</span>
            <span className="text-base font-bold text-primary">${(estCost / 100).toFixed(2)}</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="flex-1 h-11 sm:h-10" onClick={() => setStep(2)} disabled={loading}>Back</Button>
            <Button className="flex-1 h-11 sm:h-10" onClick={handleGenerate} disabled={loading || !platforms.length}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Wand2 className="h-4 w-4 mr-2" /> Generate AI ads</>}
            </Button>
          </div>
        </CardContent></Card>
      )}

      {/* Step 4: Pre-generation placeholder */}
      {step === 4 && !result && !loading && (
        <MarketingEmptyState
          icon={Sparkles}
          title="Ready to generate"
          body="Pick a goal, audience, and budget — then tap Generate to see AI-crafted ad variants."
        />
      )}

      {/* Step 4: Loading transition */}
      {step === 4 && !result && loading && <WizardSkeleton />}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div className="space-y-3">
          {/* Headlines */}
          <Card><CardContent className="p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Headlines</h4>
            {Object.entries(result.copy?.headlines ?? {}).map(([plat, lines]) => (
              <div key={plat}>
                <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-2 mb-1">{plat}</p>
                <div className="space-y-1">
                  {(lines as string[]).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1.5">
                      <span className="flex-1">{h}</span>
                      <button type="button" onClick={() => copy(h)} className="text-muted-foreground hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent></Card>

          {/* Descriptions */}
          {result.copy?.descriptions && (
            <Card><CardContent className="p-4 space-y-2">
              <h4 className="font-semibold text-sm">Descriptions</h4>
              {[...(result.copy.descriptions.short || []), ...(result.copy.descriptions.long || [])].map((d: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-muted/40 rounded px-2 py-1.5">
                  <span className="flex-1">{d}</span>
                  <button type="button" onClick={() => copy(d)} className="text-muted-foreground hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {result.copy.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {result.copy.hashtags.map((h: string, i: number) => <Badge key={i} variant="secondary">{h}</Badge>)}
                </div>
              )}
            </CardContent></Card>
          )}

          {/* Images */}
          {result.images?.length > 0 && (
            <Card><CardContent className="p-3 sm:p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Generated images</h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.images.map((img: any, i: number) => (
                  <div key={i} className="relative group">
	                    <img
	                      src={img.url}
	                      alt="ad"
	                      className="w-full rounded-lg border"
	                      loading="lazy"
	                      decoding="async"
	                    />
                    <Badge className="absolute top-2 left-2 text-[10px]">{img.aspect}</Badge>
                    <a href={img.url} download className="absolute top-2 right-2 bg-background/90 rounded p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}

          {/* Video scripts */}
          {result.video_scripts && (
            <Card><CardContent className="p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Video scripts</h4>
              {result.video_scripts.tiktok_15s && (
                <div className="bg-muted/40 p-3 rounded-lg text-sm space-y-1">
                  <p className="font-semibold text-xs text-primary">TikTok 15s</p>
                  <p><b>Hook:</b> {result.video_scripts.tiktok_15s.hook}</p>
                  <p><b>Body:</b> {result.video_scripts.tiktok_15s.body}</p>
                  <p><b>CTA:</b> {result.video_scripts.tiktok_15s.cta}</p>
                </div>
              )}
              {result.video_scripts.youtube_shorts_30s && (
                <div className="bg-muted/40 p-3 rounded-lg text-sm space-y-1">
                  <p className="font-semibold text-xs text-primary">YouTube Shorts 30s</p>
                  <p><b>Hook:</b> {result.video_scripts.youtube_shorts_30s.hook}</p>
                  <p><b>Body:</b> {result.video_scripts.youtube_shorts_30s.body}</p>
                  <p><b>CTA:</b> {result.video_scripts.youtube_shorts_30s.cta}</p>
                </div>
              )}
            </CardContent></Card>
          )}

          {/* Export */}
          <Card><CardContent className="p-3 sm:p-4 space-y-2">
            <h4 className="font-semibold text-sm">Launch on platforms</h4>
            <p className="text-[11px] text-muted-foreground">Download the ready-to-import bundle, then open the ad manager.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                const M = PLATFORM_META[p]; const Icon = M.icon;
                const launch = exports?.launch_urls?.[p];
                return (
                  <div key={p} className="border rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${M.color}`} /><span className="text-sm font-medium">{M.label}</span></div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => handleExport(p)} disabled={exporting === p}>
                        {exporting === p ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                        Export
                      </Button>
                      {launch && (
                        <a href={launch} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-9 w-9 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" className="w-full mt-2 h-11 sm:h-10" onClick={() => { setStep(1); setResult(null); setExports(null); setOffer(""); }}>
              Create another ad
            </Button>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
