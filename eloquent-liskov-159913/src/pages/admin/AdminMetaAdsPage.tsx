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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Play, Pause, TrendingUp, DollarSign, Target, Users,
  Facebook, Link2, Image as ImageIcon, CheckCircle2, ExternalLink,
  Settings2, Edit2, Eye, EyeOff, Info, Zap, Clock, Calendar,
  Send, Trash2, RefreshCw, RotateCcw, AlertCircle, Unlink,
  ThumbsUp, BarChart2, Globe,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Local config helpers
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "zivo_admin_fb_page_config";
interface FbPageConfig { pageId: string; pageName: string; pageToken: string; serverSaved?: boolean; }
const loadConfig = (): FbPageConfig | null => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveLocalConfig = (cfg: FbPageConfig) => localStorage.setItem(LS_KEY, JSON.stringify(cfg));
const clearLocalConfig = () => localStorage.removeItem(LS_KEY);

// Call Facebook Graph API and return the JSON (or throw with FB's error message)
async function fbGet(path: string, token: string, fields?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ access_token: token });
  if (fields) params.set("fields", fields);
  if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}?${params}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Facebook API error");
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminMetaAdsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("campaigns");

  // ── Meta Ads state ────────────────────────────────────────────────────────
  const [adName, setAdName] = useState("ZIVO MVP Launch");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [headline, setHeadline] = useState("ZIVO — Rides, Eats, Travel");
  const [adBody, setAdBody] = useState("Book rides, order food, and explore deals on ZIVO.");
  const [adLink, setAdLink] = useState("https://hizivo.com");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── FB Page config state ──────────────────────────────────────────────────
  const [config, setConfig] = useState<FbPageConfig | null>(() => loadConfig());
  const [showSetup, setShowSetup] = useState(!loadConfig());
  const [showToken, setShowToken] = useState(false);
  const [formPageId, setFormPageId] = useState(config?.pageId || "993764157155084");
  const [formPageName, setFormPageName] = useState(config?.pageName || "ZIVO");
  const [formToken, setFormToken] = useState(config?.pageToken || "");
  const [saveToServer, setSaveToServer] = useState(config?.serverSaved ?? true);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Test connection state ─────────────────────────────────────────────────
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // ── Load pages from /me/accounts ─────────────────────────────────────────
  const [loadingPages, setLoadingPages] = useState(false);
  const [availablePages, setAvailablePages] = useState<{ id: string; name: string; access_token: string; picture?: any; fan_count?: number; category?: string }[]>([]);

  // ── Compose state ─────────────────────────────────────────────────────────
  const [postMessage, setPostMessage] = useState("");
  const [postLink, setPostLink] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [posting, setPosting] = useState(false);

  // ── Boost sheet state ─────────────────────────────────────────────────────
  const [boostPost, setBoostPost] = useState<any>(null);
  const [boostBudget, setBoostBudget] = useState("5");
  const [boostDays, setBoostDays] = useState("7");
  const [boostCountries, setBoostCountries] = useState<string[]>(["KH"]);
  const [boostObjective, setBoostObjective] = useState("POST_ENGAGEMENT");
  const [boosting, setBoosting] = useState(false);
  const [boostResult, setBoostResult] = useState<{ success: boolean; promotionId?: string; warning?: string; fbErrorCode?: number; totalSpend?: number } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["ad_campaigns", "meta"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_campaigns").select("*").eq("platform", "meta").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Live Facebook Page info: profile photo, cover, follower count, category
  const { data: pageInfo, refetch: refetchPageInfo } = useQuery({
    queryKey: ["admin-fb-page-info", config?.pageId, config?.pageToken],
    queryFn: async () => {
      if (!config?.pageId || !config?.pageToken) return null;
      return fbGet(config.pageId, config.pageToken, "name,picture,cover,fan_count,followers_count,category,link");
    },
    enabled: !!config?.pageId && !!config?.pageToken,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Live posts from Facebook Graph API
  const {
    data: publishedPosts = [],
    isLoading: publishedLoading,
    refetch: refetchPublished,
    error: fbError,
  } = useQuery({
    queryKey: ["admin-fb-published", config?.pageId, config?.pageToken],
    queryFn: async () => {
      if (!config?.pageId || !config?.pageToken) return [];
      const f = "id,message,story,created_time,permalink_url,full_picture";
      const pid = config.pageId;
      const tok = config.pageToken;
      const errors: string[] = [];

      // Strategy 1: me/posts with page token (most reliable)
      try {
        const j = await fbGet("me/posts", tok, f, { limit: "25" });
        if (Array.isArray(j.data)) return j.data as any[];
      } catch (e: any) { errors.push("me/posts: " + e.message); }

      // Strategy 2: /{pageId}/posts
      try {
        const j = await fbGet(`${pid}/posts`, tok, f, { limit: "25" });
        if (Array.isArray(j.data)) return j.data as any[];
      } catch (e: any) { errors.push("posts edge: " + e.message); }

      // Strategy 3: /{pageId}/feed
      try {
        const j = await fbGet(`${pid}/feed`, tok, f, { limit: "25" });
        if (Array.isArray(j.data)) return j.data as any[];
      } catch (e: any) { errors.push("feed edge: " + e.message); }

      // Strategy 4: field expansion — GET /{pageId}?fields=posts{...}
      try {
        const j = await fbGet(pid, tok, `posts.limit(25){${f}}`);
        if (Array.isArray(j.posts?.data)) return j.posts.data as any[];
      } catch (e: any) { errors.push("field expansion: " + e.message); }

      // Strategy 5: published_posts
      try {
        const j = await fbGet(`${pid}/published_posts`, tok, f, { limit: "25" });
        if (Array.isArray(j.data)) return j.data as any[];
      } catch (e: any) { errors.push("published_posts: " + e.message); }

      throw new Error(errors.join(" | "));
    },
    enabled: !!config?.pageId && !!config?.pageToken,
    staleTime: 60_000,
    retry: false,
  });

  const { data: scheduledPosts = [], isLoading: scheduledLoading, refetch: refetchScheduled } = useQuery({
    queryKey: ["admin-fb-scheduled"],
    queryFn: async () => {
      const { data } = await supabase.from("feedback_submissions").select("*").eq("category", "fb_scheduled_post").eq("status", "pending").order("created_at", { ascending: false });
      return (data ?? []).map((row: any) => {
        try { return { ...row, _parsed: JSON.parse(row.message) }; } catch { return { ...row, _parsed: {} }; }
      });
    },
  });

  // ── Test connection ───────────────────────────────────────────────────────
  const testConnection = async () => {
    const pid = formPageId.trim();
    const tok = formToken.trim();
    if (!pid || !tok) { toast.error("Enter Page ID and Token first"); return; }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      // First try: direct page lookup — works with a Page Access Token
      try {
        const info = await fbGet(pid, tok, "name,picture,cover,fan_count,followers_count,category");
        setTestResult(info);
        if (info.name) setFormPageName(info.name);
        toast.success(`Connected to "${info.name}"!`);
        return;
      } catch { /* fall through — might be a User Access Token */ }

      // Second try: /me/accounts — works with a User Access Token that has pages_show_list
      // This automatically extracts the real Page Access Token for us
      const accounts = await fbGet("me/accounts", tok, "id,name,access_token,picture,fan_count,followers_count,category,cover");
      const pages: any[] = accounts.data ?? [];
      // Match by exact ID, by name, or take the only page
      const page = pages.find((p: any) => p.id === pid)
        || pages.find((p: any) => p.name?.toLowerCase() === (formPageName || "zivo").toLowerCase())
        || (pages.length === 1 ? pages[0] : null);
      if (page) {
        // Swap the form fields with the real page ID and Page Access Token
        setFormToken(page.access_token);
        setFormPageId(page.id);
        if (page.name) setFormPageName(page.name);
        setTestResult({ ...page });
        toast.success(`Connected to "${page.name}"! Page token set automatically — click Save & Connect.`);
      } else if (pages.length > 0) {
        const names = pages.map((p: any) => `${p.name} (${p.id})`).join(", ");
        throw new Error(`No matching page found. Your pages: ${names}`);
      } else {
        throw new Error("No pages found. Make sure the token has 'pages_show_list' permission and you manage at least one Page.");
      }
    } catch (e: any) {
      setTestError(e.message);
      toast.error("Connection failed: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  // ── Load pages from /me/accounts ─────────────────────────────────────────
  const selectPage = (page: { id: string; name: string; access_token: string; picture?: any; fan_count?: number; category?: string }) => {
    setFormPageId(page.id);
    setFormPageName(page.name);
    setFormToken(page.access_token);
    setAvailablePages([]);
    setTestResult(null);
    setTestError(null);
    toast.success(`"${page.name}" selected — click Save & Connect`);
  };

  const loadMyPages = async () => {
    const tok = formToken.trim();
    if (!tok) { toast.error("Paste your access token first"); return; }
    setLoadingPages(true);
    try {
      const res = await fbGet("me/accounts", tok, "id,name,access_token,picture,fan_count,category");
      const pages = res.data ?? [];
      if (pages.length === 0) {
        toast.error("No pages found. Make sure this token has 'pages_show_list' permission.");
      } else if (pages.length === 1) {
        // Only one page — auto-select it immediately
        selectPage(pages[0]);
      } else {
        setAvailablePages(pages);
        toast.success(`Found ${pages.length} pages — click yours to select it`);
      }
    } catch (e: any) {
      toast.error("Could not load pages: " + e.message);
    } finally {
      setLoadingPages(false);
    }
  };

  // ── Save page config ──────────────────────────────────────────────────────
  const savePageConfig = async () => {
    const pid = formPageId.trim();
    const tok = formToken.trim();
    if (!pid || !tok) { toast.error("Page ID and Access Token are required"); return; }
    setSavingConfig(true);
    try {
      // Validate token — handles both Page Access Token and User Access Token
      let verifiedName = formPageName.trim() || "ZIVO";
      let verifiedToken = tok;
      try {
        // Try direct page lookup first (Page Access Token)
        try {
          const info = await fbGet(pid, tok, "name");
          verifiedName = info.name || verifiedName;
          setTestResult(info);
          setTestError(null);
        } catch {
          // Fall back to /me/accounts (User Access Token) → extract Page Token automatically
          const accounts = await fbGet("me/accounts", tok, "id,name,access_token");
          const pages: any[] = accounts.data ?? [];
          // Match by exact ID, or by page name, or pick the only page if there's just one
          const page = pages.find((p: any) => p.id === pid)
            || pages.find((p: any) => p.name?.toLowerCase() === (formPageName || "zivo").toLowerCase())
            || (pages.length === 1 ? pages[0] : null);
          if (page) {
            verifiedToken = page.access_token;
            verifiedName = page.name || verifiedName;
            setFormPageId(page.id);
            setFormToken(page.access_token);
          } else if (pages.length > 0) {
            const names = pages.map((p: any) => `${p.name} (${p.id})`).join(", ");
            throw new Error(`Page "${pid}" not found. Your pages: ${names}`);
          } else {
            throw new Error("No pages found for this token. Add 'pages_show_list' permission and regenerate.");
          }
        }
      } catch (e: any) {
        toast.error("Invalid token: " + e.message);
        setSavingConfig(false);
        return;
      }

      const cfg: FbPageConfig = { pageId: pid, pageName: verifiedName, pageToken: verifiedToken, serverSaved: saveToServer };
      saveLocalConfig(cfg);
      setConfig(cfg);

      if (saveToServer) {
        const serverMsg = JSON.stringify({ page_id: cfg.pageId, page_name: cfg.pageName, token: btoa(verifiedToken) });
        await supabase.from("feedback_submissions" as any).delete().eq("category", "admin_fb_config");
        await supabase.from("feedback_submissions" as any).insert({ category: "admin_fb_config", message: serverMsg, status: "resolved" });
        toast.success(`"${verifiedName}" connected & saved for auto-posting!`);
      } else {
        toast.success(`"${verifiedName}" connected!`);
      }
      setShowSetup(false);
      setTestResult(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save config");
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = async () => {
    clearLocalConfig();
    setConfig(null);
    setShowSetup(true);
    setFormToken("");
    setTestResult(null);
    setTestError(null);
    await supabase.from("feedback_submissions" as any).delete().eq("category", "admin_fb_config");
    toast.info("Facebook Page disconnected");
  };

  // ── Trigger auto-post ─────────────────────────────────────────────────────
  const runAutoPost = useCallback(async (rowId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auto-post-facebook", {
        body: rowId ? { post_row_id: rowId } : {},
      });
      if (error) throw error;
      const d = data as any;
      if (d?.posted > 0) {
        toast.success(`Auto-posted ${d.posted} scheduled post${d.posted > 1 ? "s" : ""} to Facebook!`);
        refetchPublished();
        refetchScheduled();
      }
      return d;
    } catch { return null; }
  }, []);

  // ── Ad campaign helpers ───────────────────────────────────────────────────
  const totals = (campaigns as any[]).reduce(
    (acc, c) => ({ spend: acc.spend + (c.total_spend_cents ?? 0), conversions: acc.conversions + (c.conversions ?? 0), impressions: acc.impressions + (c.impressions ?? 0), reach: acc.reach + (c.reach ?? 0) }),
    { spend: 0, conversions: 0, impressions: 0, reach: 0 }
  );
  const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const createCampaign = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-create-campaign", {
        body: { name: adName, daily_budget_cents: Math.round(parseFloat(dailyBudget) * 100), headline, body: adBody, link: adLink, image_url: adImageUrl || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Campaign created (paused).");
      qc.invalidateQueries({ queryKey: ["ad_campaigns", "meta"] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setCreating(false); }
  };

  const toggleStatus = async (c: any) => {
    setTogglingId(c.id);
    const next = c.status === "active" ? "paused" : "active";
    try {
      await supabase.from("ad_campaigns").update({ status: next }).eq("id", c.id);
      qc.invalidateQueries({ queryKey: ["ad_campaigns", "meta"] });
      toast.success(`Campaign ${next}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setTogglingId(null); }
  };

  // ── Post / Schedule ───────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!config) { toast.error("Set up your Facebook Page first"); return; }
    if (!postMessage.trim()) { toast.error("Enter a message"); return; }

    if (scheduleMode) {
      if (!scheduledAt) { toast.error("Pick a date and time to schedule"); return; }
      if (new Date(scheduledAt) <= new Date()) { toast.error("Scheduled time must be in the future"); return; }
      const payload = { message_text: postMessage, link: postLink || null, image_url: postImageUrl || null, scheduled_at: new Date(scheduledAt).toISOString(), page_id: config.pageId, page_name: config.pageName };
      const { error } = await supabase.from("feedback_submissions" as any).insert({ category: "fb_scheduled_post", message: JSON.stringify(payload), status: "pending" });
      if (error) { toast.error("Failed to schedule post"); return; }
      toast.success(`Post scheduled for ${new Date(scheduledAt).toLocaleString()}`);
      setPostMessage(""); setPostLink(""); setPostImageUrl(""); setScheduledAt(""); setScheduleMode(false);
      refetchScheduled();
      return;
    }

    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-to-facebook-page", {
        body: { page_id: config.pageId, page_name: config.pageName, page_access_token: config.pageToken, message: postMessage, link: postLink || undefined, image_url: postImageUrl || undefined },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Posted to Facebook Page!");
      setPostMessage(""); setPostLink(""); setPostImageUrl("");
      setTimeout(() => refetchPublished(), 2000);
    } catch (e: any) { toast.error(e.message || "Failed to post"); }
    finally { setPosting(false); }
  };

  const postNow = async (row: any) => {
    const res = await runAutoPost(row.id);
    if (res?.posted > 0) toast.success("Posted to Facebook now!");
    else if (res) toast.error(res.results?.[0]?.error || "Failed to post");
  };

  const cancelScheduled = async (id: string) => {
    await supabase.from("feedback_submissions" as any).update({ status: "dismissed" }).eq("id", id);
    toast.success("Scheduled post cancelled");
    refetchScheduled();
  };

  // ── Boost — calls Facebook Graph API directly (no edge function needed) ───
  const boostThisPost = async () => {
    if (!config || !boostPost) return;
    const budget = parseFloat(boostBudget);
    const days = parseInt(boostDays);
    if (!budget || !days) { toast.error("Enter budget and duration"); return; }
    if (boostCountries.length === 0) { toast.error("Select at least one target country"); return; }
    setBoosting(true);
    setBoostResult(null);
    try {
      // Facebook accepts Unix timestamps (seconds), not ISO strings
      const nowSec = Math.floor(Date.now() / 1000);
      const endSec = nowSec + days * 24 * 60 * 60;
      const totalBudgetCents = Math.round(budget * 100 * days);

      const params = new URLSearchParams({
        access_token: config.pageToken,
        budget: String(totalBudgetCents),
        currency: "USD",
        end_time: String(endSec),
        start_time: String(nowSec),
        objective: boostObjective,
        countries: JSON.stringify(boostCountries),
      });

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${boostPost.postId}/promotions`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() }
      );
      const fbData = await res.json() as any;

      if (!res.ok || fbData.error) {
        // Record pending in Supabase for manual follow-up
        await supabase.from("ad_campaigns" as any).insert({
          platform: "meta", name: `Boost pending: ${boostPost.postId.slice(-8)}`,
          daily_budget_cents: Math.round(budget * 100), status: "pending",
          external_id: boostPost.postId,
          metadata: { post_id: boostPost.postId, duration_days: days, fb_error: fbData.error },
        });
        setBoostResult({ success: false, warning: fbData.error?.message || "Facebook rejected the boost", fbErrorCode: fbData.error?.code });
        toast.warning("Boost pending — check Ads Manager");
      } else {
        // Boost successful — record in Supabase
        await supabase.from("ad_campaigns" as any).insert({
          platform: "meta", name: `Boosted: ${boostPost.postId.slice(-8)}`,
          daily_budget_cents: Math.round(budget * 100), status: "active",
          external_id: fbData.id,
          metadata: { post_id: boostPost.postId, promotion_id: fbData.id, duration_days: days, countries: boostCountries },
        });
        setBoostResult({ success: true, promotionId: fbData.id, totalSpend: budget * days });
        toast.success(`Post boosted! ${days} days · $${budget}/day`);
        qc.invalidateQueries({ queryKey: ["ad_campaigns", "meta"] });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to boost");
      setBoostResult({ success: false, warning: e.message });
    } finally {
      setBoosting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const profilePic = pageInfo?.picture?.data?.url || testResult?.picture?.data?.url || null;
  const coverPhoto = pageInfo?.cover?.source || testResult?.cover?.source || null;
  const fanCount = pageInfo?.fan_count ?? pageInfo?.followers_count ?? null;

  return (
    <AdminLayout title="Meta Ads">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Meta Ads</h2>
          <p className="text-sm text-muted-foreground">Ad campaigns, Facebook Page posts, auto-scheduling &amp; boost — all in one place.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="campaigns">Ad Campaigns</TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5">
              <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
              Facebook Page
              {scheduledPosts.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">{scheduledPosts.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════ AD CAMPAIGNS ══════════════════════ */}
          <TabsContent value="campaigns" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Spend", value: fmtUsd(totals.spend), icon: DollarSign },
                { label: "Impressions", value: totals.impressions.toLocaleString(), icon: TrendingUp },
                { label: "Reach", value: totals.reach.toLocaleString(), icon: Users },
                { label: "Conversions", value: String(totals.conversions), icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}><CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-1.5 mb-1"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span></div>
                  <div className="text-xl font-bold">{value}</div>
                </CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">New campaign</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Name</Label><Input value={adName} onChange={(e) => setAdName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Daily budget (USD)</Label><Input type="number" min="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
                <div className="space-y-1"><Label>Body</Label><Textarea value={adBody} onChange={(e) => setAdBody(e.target.value)} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Landing URL</Label><Input value={adLink} onChange={(e) => setAdLink(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Image URL (optional)</Label><Input value={adImageUrl} onChange={(e) => setAdImageUrl(e.target.value)} placeholder="https://…" /></div>
                </div>
                <Button onClick={createCampaign} disabled={creating} className="gap-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create campaign
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent campaigns ({(campaigns as any[]).length})</CardTitle></CardHeader>
              <CardContent>
                {campaignsLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                {!campaignsLoading && (campaigns as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No Meta campaigns yet.</p>}
                {!campaignsLoading && (campaigns as any[]).length > 0 && (
                  <ul className="divide-y">
                    {(campaigns as any[]).map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmtUsd(c.daily_budget_cents ?? 0)}/day{c.total_spend_cents ? ` · spent ${fmtUsd(c.total_spend_cents)}` : ""}{c.impressions ? ` · ${c.impressions.toLocaleString()} imp` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                          <Button size="sm" variant="outline" disabled={togglingId === c.id} onClick={() => toggleStatus(c)} className="gap-1">
                            {togglingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.status === "active" ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Enable</>}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════ FACEBOOK PAGE ═════════════════════ */}
          <TabsContent value="posts" className="mt-4 space-y-5">

            {/* ── Setup Form ── */}
            {showSetup && (
              <Card className="border-[#1877F2]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-[#1877F2]" /> Connect your Facebook Page
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Instructions */}
                  <div className="rounded-xl bg-[#1877F2]/6 border border-[#1877F2]/20 p-4 space-y-2">
                    <div className="flex gap-2 items-start">
                      <Info className="h-4 w-4 text-[#1877F2] shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-[#1877F2]">How to get your Page Access Token</p>
                    </div>
                    <ol className="text-sm text-muted-foreground space-y-1.5 pl-6 list-decimal">
                      <li>Open <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="font-medium text-[#1877F2] underline underline-offset-2">developers.facebook.com/tools/explorer</a></li>
                      <li>Select <span className="font-medium text-foreground">Zivo</span> from the Meta App dropdown, then make sure <span className="font-medium text-foreground">pages_show_list</span> is in your permissions</li>
                      <li>Click <span className="font-medium text-foreground">Generate Access Token</span> → approve → copy the token</li>
                      <li>Paste it below, then click <strong>Load Pages</strong> — your ZIVO page will appear and we'll auto-extract the right token</li>
                      <li>Click your page → click <strong>Save &amp; Connect</strong></li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Page ID <span className="text-red-500">*</span></Label>
                      <Input value={formPageId} onChange={(e) => { setFormPageId(e.target.value); setTestResult(null); setTestError(null); }} placeholder="e.g. 61587217960431" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Page Name</Label>
                      <Input value={formPageName} onChange={(e) => setFormPageName(e.target.value)} placeholder="ZIVO" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Access Token <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-muted-foreground -mt-1">Paste any token from Graph API Explorer (User Token or Page Token — we'll handle it)</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showToken ? "text" : "password"}
                          value={formToken}
                          onChange={(e) => { setFormToken(e.target.value); setTestResult(null); setTestError(null); setAvailablePages([]); }}
                          placeholder="Paste token from developers.facebook.com/tools/explorer…"
                          className="pr-10 font-mono text-xs"
                        />
                        <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button type="button" variant="outline" onClick={loadMyPages} disabled={loadingPages || !formToken.trim()} className="gap-1.5 shrink-0">
                        {loadingPages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                        Load Pages
                      </Button>
                      <Button type="button" variant="outline" onClick={testConnection} disabled={testing || !formToken.trim()} className="gap-1.5 shrink-0">
                        {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Test
                      </Button>
                    </div>
                  </div>

                  {/* Page picker — shown after Load Pages */}
                  {availablePages.length > 0 && (
                    <div className="rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-[#1877F2]">Your Pages — click one to select it:</p>
                      <div className="space-y-1.5">
                        {availablePages.map((page) => (
                          <button type="button"
                            key={page.id}
                            onClick={() => selectPage(page)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#1877F2]/20 bg-white/50 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/40 transition-all text-left"
                          >
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center shrink-0">
                              {page.picture?.data?.url ? (
                                <img src={page.picture.data.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Facebook className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{page.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {page.id}{page.category ? ` · ${page.category}` : ""}{page.fan_count != null ? ` · ${page.fan_count.toLocaleString()} followers` : ""}</p>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-[#1877F2] shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Test error */}
                  {testError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex gap-2 items-start">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600">Connection failed</p>
                        <p className="text-xs text-red-500 mt-0.5">{testError}</p>
                        <p className="text-xs text-muted-foreground mt-1">Make sure you copied a Page Access Token (not a User Token) and selected the correct permissions.</p>
                      </div>
                    </div>
                  )}

                  {/* Test success preview */}
                  {testResult && !testError && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                      {testResult.cover?.source && (
                        <img src={testResult.cover.source} alt="cover" className="w-full h-24 object-cover" />
                      )}
                      <div className="p-3 flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full border-2 border-white overflow-hidden shrink-0 ${testResult.cover?.source ? "-mt-6" : ""} bg-[#1877F2] flex items-center justify-center`}>
                          {testResult.picture?.data?.url ? (
                            <img src={testResult.picture.data.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Facebook className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            {testResult.name}
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {testResult.category && <span>{testResult.category} · </span>}
                            {testResult.fan_count != null && <span>{testResult.fan_count.toLocaleString()} followers</span>}
                          </p>
                        </div>
                        <Badge className="ml-auto bg-emerald-500/15 text-emerald-600">Token Valid ✓</Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Enable Auto-Post</p>
                      <p className="text-xs text-muted-foreground">Saves token to server so scheduled posts publish automatically</p>
                    </div>
                    <Switch checked={saveToServer} onCheckedChange={setSaveToServer} />
                  </div>

                  <Button
                    onClick={savePageConfig}
                    disabled={savingConfig || !formToken.trim()}
                    className="w-full gap-2 bg-[#1877F2] hover:bg-[#1565c0] text-white"
                  >
                    {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save & Connect
                  </Button>

                  {config && (
                    <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)} className="w-full text-muted-foreground">
                      Cancel — keep existing connection
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Connected Page Banner ── */}
            {!showSetup && config && (
              <Card className="overflow-hidden border-[#1877F2]/20">
                {/* Cover photo */}
                {coverPhoto ? (
                  <div className="h-32 relative overflow-hidden">
                    <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-r from-[#1877F2] to-[#0a5dc8]" />
                )}

                <CardContent className="pb-4">
                  <div className="flex items-end justify-between -mt-8 mb-3">
                    {/* Profile photo */}
                    <div className="w-16 h-16 rounded-full border-4 border-background overflow-hidden bg-[#1877F2] flex items-center justify-center shrink-0">
                      {profilePic ? (
                        <img src={profilePic} alt="Page" className="w-full h-full object-cover" />
                      ) : (
                        <Facebook className="h-7 w-7 text-white" />
                      )}
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => refetchPageInfo()} className="gap-1 h-8">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowSetup(true); setFormPageId(config.pageId); setFormPageName(config.pageName); setFormToken(config.pageToken); setTestResult(null); setTestError(null); }} className="gap-1 h-8">
                        <Edit2 className="h-3.5 w-3.5" /> Change Token
                      </Button>
                      <Button size="sm" variant="outline" onClick={disconnect} className="gap-1 h-8 text-red-500 hover:text-red-600 hover:border-red-300">
                        <Unlink className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                    </div>
                  </div>

                  {/* Page info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{pageInfo?.name || config.pageName}</h3>
                      <Badge className="bg-emerald-500/15 text-emerald-600 gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
                      {config.serverSaved && <Badge className="bg-blue-500/15 text-blue-600 gap-1 text-xs"><RotateCcw className="h-3 w-3" /> Auto-Post On</Badge>}
                    </div>
                    {pageInfo?.category && <p className="text-sm text-muted-foreground">{pageInfo.category}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
                      {fanCount != null && (
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {fanCount.toLocaleString()} followers</span>
                      )}
                      {pageInfo?.link && (
                        <a href={pageInfo.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <Globe className="h-3.5 w-3.5" /> View Page
                        </a>
                      )}
                      <span className="flex items-center gap-1"><BarChart2 className="h-3.5 w-3.5" /> {publishedPosts.length} posts loaded</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {config && !showSetup && (
              <>
                {/* ── Compose ── */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Compose Post</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Schedule</span>
                        <Switch checked={scheduleMode} onCheckedChange={setScheduleMode} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Composer header shows page identity */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center shrink-0">
                        {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <Facebook className="h-4 w-4 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-none">{pageInfo?.name || config.pageName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{scheduleMode ? "Scheduled post" : "Posting now · Public"}</p>
                      </div>
                    </div>

                    <Textarea
                      value={postMessage}
                      onChange={(e) => setPostMessage(e.target.value)}
                      rows={5}
                      maxLength={63206}
                      placeholder={`What's new at ZIVO? Share a promotion, announcement, or update…`}
                    />
                    <p className="text-xs text-muted-foreground -mt-2 text-right">{postMessage.length}/63,206</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Link (optional)</Label>
                        <Input value={postLink} onChange={(e) => setPostLink(e.target.value)} placeholder="https://hizivo.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Photo URL (optional)</Label>
                        <Input value={postImageUrl} onChange={(e) => setPostImageUrl(e.target.value)} placeholder="https://…/photo.jpg" />
                      </div>
                    </div>

                    {postImageUrl && (
                      <div className="rounded-xl overflow-hidden border">
                        <img src={postImageUrl} alt="Preview" className="w-full max-h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}

                    {scheduleMode && (
                      <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                        <Label className="flex items-center gap-1.5 text-amber-700"><Calendar className="h-3.5 w-3.5" />Schedule date &amp; time</Label>
                        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={minDateTime} />
                        <p className="text-xs text-amber-600">Post will auto-publish at this time if Auto-Post is enabled.</p>
                      </div>
                    )}

                    <Button
                      onClick={handlePost}
                      disabled={posting || !postMessage.trim()}
                      className={`w-full gap-2 text-white ${scheduleMode ? "bg-amber-500 hover:bg-amber-600" : "bg-[#1877F2] hover:bg-[#1565c0]"}`}
                    >
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduleMode ? <Clock className="h-4 w-4" /> : <Facebook className="h-4 w-4" />}
                      {scheduleMode ? `Schedule for ${scheduledAt ? new Date(scheduledAt).toLocaleString() : "…"}` : `Post Now to ${pageInfo?.name || config.pageName}`}
                    </Button>
                  </CardContent>
                </Card>

                {/* ── Scheduled Posts Queue ── */}
                {scheduledPosts.length > 0 && (
                  <Card className="border-amber-500/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          Scheduled Posts ({scheduledPosts.length})
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => runAutoPost()} className="gap-1 text-xs">
                          <RefreshCw className="h-3.5 w-3.5" /> Run Now
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {scheduledLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                      ) : (
                        <ul className="divide-y">
                          {scheduledPosts.map((row: any) => {
                            const p = row._parsed;
                            const due = new Date(p.scheduled_at) <= new Date();
                            return (
                              <li key={row.id} className="py-3 flex items-start gap-3">
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${due ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-2">{p.message_text}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-xs ${due ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                      <Clock className="h-3 w-3 inline mr-0.5" />
                                      {due ? "Due now — " : ""}
                                      {new Date(p.scheduled_at).toLocaleString()}
                                    </span>
                                    {p.link && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.link}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-[#1877F2] hover:bg-[#1565c0] text-white" onClick={() => postNow(row)}>
                                    <Send className="h-3 w-3" /> Post Now
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-500" onClick={() => cancelScheduled(row.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ── Published Posts Feed ── */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-[#1877F2]" />
                        {pageInfo?.name || config.pageName} Posts
                        {publishedPosts.length > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">({publishedPosts.length})</span>
                        )}
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => refetchPublished()} className="gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Live from Facebook — including posts made directly on your page.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {publishedLoading && (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#1877F2]" />
                        <p className="text-xs text-muted-foreground">Loading posts from Facebook…</p>
                      </div>
                    )}
                    {!publishedLoading && fbError && (
                      <div className="px-4 py-6 space-y-4">
                        {/* Error summary */}
                        <div className="flex gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-red-600">Could not load posts</p>
                            <p className="text-xs text-red-500 mt-0.5 font-mono break-all">{(fbError as Error).message}</p>
                          </div>
                        </div>

                        {/* Quick fix: if it's a permission error, offer to reconnect */}
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-amber-600" />
                            Most likely fix — add <code className="text-xs bg-muted px-1 rounded">pages_read_engagement</code> permission
                          </p>
                          <ol className="text-sm text-muted-foreground space-y-1.5 pl-5 list-decimal">
                            <li>Open <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="font-medium text-[#1877F2] underline underline-offset-2">Graph API Explorer</a></li>
                            <li>Select <span className="font-medium text-foreground">Zivo</span> app → add these permissions:
                              <div className="flex flex-wrap gap-1 mt-1">
                                {["pages_show_list","pages_read_engagement","pages_manage_posts","pages_read_user_content"].map(p => (
                                  <code key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded border font-mono">{p}</code>
                                ))}
                              </div>
                            </li>
                            <li>Click <strong>Generate Access Token</strong> → approve all → copy token</li>
                            <li>Click <strong>Change Token</strong> below → paste → <strong>Load Pages</strong> → <strong>Save &amp; Connect</strong></li>
                          </ol>
                        </div>

                        <div className="flex gap-2">
                          <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full gap-2 text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/5">
                              <ExternalLink className="h-3.5 w-3.5" /> Open Graph API Explorer
                            </Button>
                          </a>
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => { setShowSetup(true); setFormPageId(config?.pageId || ""); setFormPageName(config?.pageName || ""); setFormToken(""); setTestResult(null); setTestError(null); }}
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Change Token
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => refetchPublished()} className="gap-1 text-muted-foreground">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {!publishedLoading && !fbError && publishedPosts.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground px-4 space-y-2">
                        <Facebook className="h-10 w-10 mx-auto opacity-20 text-[#1877F2]" />
                        <p className="text-sm font-medium">No posts found</p>
                        <p className="text-xs max-w-xs mx-auto">
                          Your page may have no posts, or your token is missing <code className="text-xs bg-muted px-1 rounded">pages_read_engagement</code> + <code className="text-xs bg-muted px-1 rounded">pages_manage_posts</code> permissions.
                        </p>
                        <Button size="sm" variant="outline" onClick={() => refetchPublished()} className="gap-1 mt-1">
                          <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </Button>
                      </div>
                    )}
                    {!publishedLoading && !fbError && publishedPosts.length > 0 && (
                      <div className="p-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {publishedPosts.map((post: any) => {
                          const postText = post.message || post.story || "";
                          const photo = post.full_picture || null;
                          const link = post.permalink_url || null;
                          const postDate = post.created_time ? new Date(post.created_time) : null;
                          const postId = post.id;
                          const likes = post.likes?.summary?.total_count ?? null;
                          const comments = post.comments?.summary?.total_count ?? null;
                          const shares = post.shares?.count ?? null;

                          return (
                            <div key={post.id} className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                              {/* Cover photo */}
                              {photo ? (
                                <div className="h-40 overflow-hidden bg-muted shrink-0">
                                  <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                                </div>
                              ) : (
                                <div className="h-20 bg-gradient-to-br from-[#1877F2]/20 to-[#1877F2]/5 flex items-center justify-center shrink-0">
                                  <Facebook className="h-8 w-8 text-[#1877F2]/40" />
                                </div>
                              )}

                              {/* Body */}
                              <div className="flex flex-col flex-1 p-3 gap-2">
                                {/* Page + date */}
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center shrink-0">
                                    {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <Facebook className="h-3 w-3 text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate leading-none">{pageInfo?.name || config.pageName}</p>
                                    <p className="text-[10px] text-muted-foreground">{postDate ? postDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                                  </div>
                                  {link && (
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>

                                {/* Caption */}
                                {postText && <p className="text-xs text-foreground line-clamp-3 flex-1">{postText}</p>}

                                {/* Engagement */}
                                {(likes != null || comments != null || shares != null) && (
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    {likes != null && <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{likes}</span>}
                                    {comments != null && <span>{comments} comments</span>}
                                    {shares != null && <span>{shares} shares</span>}
                                  </div>
                                )}

                                {/* Boost button */}
                                <Button
                                  size="sm"
                                  className="w-full gap-1 h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white mt-auto"
                                  onClick={() => { setBoostPost({ postId, message: postText, permalink: link }); setBoostBudget("5"); setBoostDays("7"); setBoostCountries(["KH"]); setBoostObjective("POST_ENGAGEMENT"); setBoostResult(null); }}
                                >
                                  <Zap className="h-3 w-3" /> Boost
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ══ Boost Sheet ════════════════════════════════════════════════════════ */}
      <Sheet open={!!boostPost} onOpenChange={(o) => !o && setBoostPost(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Boost This Post</SheetTitle>
          </SheetHeader>
          {boostPost && (
            <div className="space-y-5 mt-5">

              {/* ── Result state ── */}
              {boostResult && (
                <div className={`rounded-xl border p-4 space-y-2 ${boostResult.success ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
                  {boostResult.success ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <p className="font-semibold text-emerald-700">Boost is Live!</p>
                      </div>
                      <p className="text-sm text-emerald-600">Running for {boostDays} days · ${parseFloat(boostBudget).toFixed(2)}/day · ${boostResult.totalSpend?.toFixed(2)} total</p>
                      {boostResult.promotionId && (
                        <p className="text-xs text-muted-foreground font-mono">Promotion ID: {boostResult.promotionId}</p>
                      )}
                      <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => { setBoostPost(null); setBoostResult(null); }}>Done</Button>
                    </>
                  ) : boostResult.fbErrorCode === 3 ? (
                    /* ── Error #3: App doesn't have Marketing API capability ── */
                    <>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <p className="font-semibold text-amber-700">Marketing API Not Enabled</p>
                      </div>
                      <p className="text-sm text-amber-700">
                        Your <strong>Zivo</strong> Facebook App doesn't have Marketing API access yet. You have two options:
                      </p>

                      {/* Option A — Boost directly on Facebook */}
                      <div className="rounded-lg border border-[#1877F2]/30 bg-[#1877F2]/5 p-3 space-y-2">
                        <p className="text-sm font-semibold text-[#1877F2]">Option A — Boost right now on Facebook (instant)</p>
                        <p className="text-xs text-muted-foreground">Open your post on Facebook and click the native <strong>Boost Post</strong> button — no API needed.</p>
                        {boostPost?.permalink ? (
                          <a href={boostPost.permalink} target="_blank" rel="noopener noreferrer" className="block">
                            <Button className="w-full gap-2 bg-[#1877F2] hover:bg-[#1565c0] text-white">
                              <Facebook className="h-4 w-4" /> Open Post &amp; Boost on Facebook
                            </Button>
                          </a>
                        ) : (
                          <a href={`https://www.facebook.com/${config?.pageId}`} target="_blank" rel="noopener noreferrer" className="block">
                            <Button className="w-full gap-2 bg-[#1877F2] hover:bg-[#1565c0] text-white">
                              <Facebook className="h-4 w-4" /> Open ZIVO Page on Facebook
                            </Button>
                          </a>
                        )}
                      </div>

                      {/* Option B — Enable Marketing API */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <p className="text-sm font-semibold">Option B — Enable Marketing API (for future boosts from this panel)</p>
                        <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                          <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#1877F2] underline">developers.facebook.com/apps</a> → select <strong>Zivo</strong></li>
                          <li>Click <strong>Add Product</strong> → find <strong>Marketing API</strong> → click Set Up</li>
                          <li>Under <strong>App Review</strong> → request <strong>ads_management</strong> Standard Access</li>
                          <li>Once approved, boosting from this panel will work automatically</li>
                        </ol>
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full gap-1 mt-1"><ExternalLink className="h-3.5 w-3.5" /> Open Facebook Developer Console</Button>
                        </a>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setBoostResult(null)} className="w-full text-muted-foreground">Dismiss</Button>
                    </>
                  ) : (
                    /* ── Other error ── */
                    <>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <p className="font-semibold text-amber-700">Boost Could Not Be Sent</p>
                      </div>
                      <p className="text-sm text-amber-600">{boostResult.warning}</p>
                      {boostResult.fbErrorCode && (
                        <p className="text-xs text-muted-foreground">Facebook error code: {boostResult.fbErrorCode}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Saved to Ad Campaigns for manual follow-up. Make sure your Facebook page has a payment method set up in Meta Ads Manager.</p>
                      <div className="flex gap-2">
                        <a href="https://www.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-1 text-[#1877F2]"><ExternalLink className="h-3.5 w-3.5" /> Ads Manager</Button>
                        </a>
                        <Button size="sm" variant="ghost" onClick={() => setBoostResult(null)} className="flex-1">Try Again</Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Post preview ── */}
              {!boostResult && (
                <>
                  <Card className="bg-muted/40">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center shrink-0">
                          {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <Facebook className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="text-xs font-semibold">{pageInfo?.name || config?.pageName}</span>
                        <Badge className="ml-auto text-[10px] bg-[#1877F2]/10 text-[#1877F2]">Facebook Page</Badge>
                      </div>
                      <p className="text-sm line-clamp-3">{boostPost.message || "(No caption)"}</p>
                    </CardContent>
                  </Card>

                  {/* ── Budget ── */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Daily Budget (USD)</Label>
                    <div className="flex flex-wrap gap-2">
                      {["3", "5", "10", "20", "50"].map((v) => (
                        <button type="button" key={v} onClick={() => setBoostBudget(v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all font-medium ${boostBudget === v ? "bg-[#1877F2] text-white border-[#1877F2]" : "border-border hover:bg-muted"}`}>${v}</button>
                      ))}
                      <Input type="number" min="1" value={boostBudget} onChange={(e) => setBoostBudget(e.target.value)} className="w-24 h-9" placeholder="Custom" />
                    </div>
                  </div>

                  {/* ── Duration ── */}
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <div className="flex flex-wrap gap-2">
                      {[["1", "1 day"], ["3", "3 days"], ["7", "7 days"], ["14", "14 days"], ["30", "30 days"]].map(([v, label]) => (
                        <button type="button" key={v} onClick={() => setBoostDays(v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all font-medium ${boostDays === v ? "bg-[#1877F2] text-white border-[#1877F2]" : "border-border hover:bg-muted"}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* ── Audience / Countries ── */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Target Audience</Label>
                    <div className="flex flex-wrap gap-2">
                      {[["KH", "🇰🇭 Cambodia"], ["TH", "🇹🇭 Thailand"], ["VN", "🇻🇳 Vietnam"], ["SG", "🇸🇬 Singapore"], ["MY", "🇲🇾 Malaysia"]].map(([code, label]) => {
                        const selected = boostCountries.includes(code);
                        return (
                          <button type="button" key={code} onClick={() => setBoostCountries(prev => selected ? prev.filter(c => c !== code) : [...prev, code])}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all font-medium ${selected ? "bg-[#1877F2] text-white border-[#1877F2]" : "border-border hover:bg-muted"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {boostCountries.length === 0 && <p className="text-xs text-red-500">Select at least one country</p>}
                  </div>

                  {/* ── Objective ── */}
                  <div className="space-y-2">
                    <Label>Objective</Label>
                    <div className="flex gap-2">
                      {[["POST_ENGAGEMENT", "Engagement"], ["REACH", "Reach"]].map(([val, label]) => (
                        <button type="button" key={val} onClick={() => setBoostObjective(val)}
                          className={`flex-1 py-2 rounded-lg text-sm border transition-all font-medium ${boostObjective === val ? "bg-[#1877F2] text-white border-[#1877F2]" : "border-border hover:bg-muted"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Summary ── */}
                  <Card className="border-amber-500/30">
                    <CardContent className="pt-3 pb-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Daily budget</span><span className="font-semibold">${parseFloat(boostBudget || "0").toFixed(2)}/day</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{boostDays} days</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Target</span><span className="font-semibold">{boostCountries.join(", ") || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Objective</span><span className="font-semibold capitalize">{boostObjective.replace("_", " ").toLowerCase()}</span></div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total spend</span>
                        <span className="text-amber-600">${(parseFloat(boostBudget || "0") * parseInt(boostDays || "0")).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={boostThisPost}
                    disabled={boosting || boostCountries.length === 0}
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-12 text-base font-semibold"
                  >
                    {boosting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Connecting to Meta…</>
                    ) : (
                      <><Zap className="h-5 w-5" /> Boost Now · ${(parseFloat(boostBudget || "0") * parseInt(boostDays || "0")).toFixed(2)} total</>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Charges your Facebook Ads billing method. Make sure a payment method is set up in <a href="https://www.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer" className="text-[#1877F2] underline">Meta Ads Manager</a>.
                  </p>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
