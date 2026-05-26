/**
 * StoreAdsManager — Paid-ads dashboard for stores. Restructured with:
 *  - AdsStatStrip (4-tile aggregate w/ 7-day deltas)
 *  - Dense AdsPlatformTile grid + unified AdsConnectDialog
 *  - AdsOnboardingChecklist
 *  - Filterable, searchable, sortable campaigns list w/ AdsCampaignRow
 *  - 4-step CreateCampaignWizard (Goal → Audience → Creative → Budget)
 *  - Sticky FAB + realtime via useStoreAdsOverview
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import {
  Facebook, Instagram, Search as Google, Music2 as TikTok, Twitter as X,
  Plus, Megaphone, AlertCircle, Plug, Search as SearchIcon,
} from "@/lib/lucide-react";
import {
  AdsStatStripSkeleton,
  OnboardingChecklistSkeleton,
  CampaignRowSkeleton,
  PlatformTilesSkeleton,
  OAuthConnectSkeleton,
} from "@/components/admin/ads/MarketingSkeletons";
import MarketingEmptyState from "@/components/admin/ads/MarketingEmptyState";
import AdsStatStrip from "@/components/admin/ads/AdsStatStrip";
import AdsPlatformTile from "@/components/admin/ads/AdsPlatformTile";
import AdsOnboardingChecklist from "@/components/admin/ads/AdsOnboardingChecklist";
import AdsCampaignRow from "@/components/admin/ads/AdsCampaignRow";
import AdsConnectDialog from "@/components/admin/ads/AdsConnectDialog";
import CreateCampaignWizard, { type CampaignFormState } from "@/components/admin/ads/CreateCampaignWizard";
import AdsWalletCard from "@/components/admin/ads/AdsWalletCard";
import AdsInsightsPanel from "@/components/admin/ads/AdsInsightsPanel";
import AdsCampaignDetailDrawer from "@/components/admin/ads/AdsCampaignDetailDrawer";
import {
  useStoreAdsOverview,
  type AdCampaign,
  type AdPlatform,
} from "@/hooks/useStoreAdsOverview";
import { cn } from "@/lib/utils";

interface Props {
  storeId: string;
}

const PLATFORMS = [
  { id: "meta" as AdPlatform, label: "Facebook", icon: Facebook, color: "text-[#1877F2]", oauth: true, brand: "bg-[#1877F2] hover:bg-[#1459bf]", help: "https://www.facebook.com/business/help/1492627900875762" },
  { id: "instagram" as AdPlatform, label: "Instagram", icon: Instagram, color: "text-[#E4405F]", oauth: true, brand: "bg-[#E4405F] hover:bg-[#c1304a]", help: "https://www.facebook.com/business/help/898752960195806" },
  { id: "google" as AdPlatform, label: "Google Ads", icon: Google, color: "text-[#4285F4]", oauth: true, brand: "bg-[#4285F4] hover:bg-[#3367d6]", help: "https://support.google.com/google-ads/answer/1704344" },
  { id: "tiktok" as AdPlatform, label: "TikTok Ads", icon: TikTok, color: "text-foreground", oauth: false, brand: "", help: "https://ads.tiktok.com/help/article/find-your-ad-account-id" },
  { id: "x" as AdPlatform, label: "X (Twitter)", icon: X, color: "text-foreground", oauth: false, brand: "", help: "https://business.x.com/en/help/account-setup/finding-your-ads-account-id.html" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ended: "bg-muted text-muted-foreground",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type FilterStatus = "all" | "draft" | "pending_review" | "active" | "paused" | "ended";
type SortKey = "newest" | "spend" | "performance";

const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_review", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "ended", label: "Ended" },
];

const EMPTY_FORM: CampaignFormState = {
  name: "",
  objective: "traffic",
  platforms: [],
  daily_budget: 10,
  total_budget: 100,
  currency: "USD",
  start_date: "",
  end_date: "",
  headline: "",
  body: "",
  cta: "Learn More",
  destination_url: "",
};

export default function StoreAdsManager({ storeId }: Props) {
  const navigate = useNavigate();
  const { accounts, campaigns, stats, checklist, wallet, ledger, isLoading, invalidate } =
    useStoreAdsOverview(storeId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<AdCampaign | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<AdPlatform | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const accountByPlatform = (p: AdPlatform) => accounts.find((a) => a.platform === p);

  const goToWallet = () => {
    document.getElementById("ads-wallet")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ===== Mutations =====

  const connectMutation = useMutation({
    mutationFn: async ({ platform, externalId, displayName }: { platform: AdPlatform; externalId: string; displayName: string }) => {
      const existing = accountByPlatform(platform);
      const payload: any = {
        store_id: storeId,
        platform,
        status: "pending",
        external_account_id: externalId,
        display_name: displayName,
        connected_at: new Date().toISOString(),
        connected_by: (await supabase.auth.getUser()).data.user?.id,
      };
      if (existing) {
        const { error } = await supabase.from("store_ad_accounts" as any).update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_ad_accounts" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Account saved.");
      setConnectPlatform(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const oauthMutation = useMutation({
    mutationFn: async (platform: AdPlatform) => {
      const returnUrl = `${window.location.origin}/connect/callback`;
      let fnName: string;
      if (platform === "meta" || platform === "instagram") fnName = "meta-oauth-start";
      else if (platform === "google") fnName = "google-ads-oauth-start";
      else throw new Error(`${platform} OAuth not yet enabled. Use manual entry below.`);

      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { store_id: storeId, platform, return_url: returnUrl },
      });
      if (error) throw error;
      if (!data?.authorize_url) throw new Error("No authorize URL returned");

      // Open OAuth in popup and poll for the resulting account row
      const popup = window.open(
        data.authorize_url,
        "ads-oauth",
        "width=600,height=700,menubar=no,toolbar=no"
      );
      if (!popup) {
        // Popup blocked — fallback to redirect
        window.location.href = data.authorize_url;
        return;
      }

      const start = Date.now();
      const platformsToMatch = platform === "instagram" ? ["meta", "instagram"] : [platform];
      return new Promise<void>((resolve, reject) => {
        const timer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(timer);
            invalidate();
            resolve();
            return;
          }
          if (Date.now() - start > 120_000) {
            clearInterval(timer);
            try { popup.close(); } catch { /* noop */ }
            reject(new Error("OAuth timeout — try again"));
            return;
          }
          const { data: rows } = await supabase
            .from("store_ad_accounts" as any)
            .select("id, platform, status, display_name")
            .eq("store_id", storeId)
            .in("platform", platformsToMatch)
            .eq("status", "connected")
            .order("connected_at", { ascending: false })
            .limit(1);
          if (rows && rows.length) {
            clearInterval(timer);
            try { popup.close(); } catch { /* noop */ }
            const acc: any = rows[0];
            toast.success(`Connected as ${acc.display_name || acc.platform}`);
            invalidate();
            setConnectPlatform(null);
            resolve();
          }
        }, 2000);
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const archiveCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_ad_campaigns" as any)
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Campaign archived"); },
    onError: (e: any) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_ad_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Disconnected"); setConnectPlatform(null); },
  });

  const saveCampaign = useMutation({
    mutationFn: async ({ form, asDraft }: { form: CampaignFormState; asDraft: boolean }) => {
      const payload: any = {
        store_id: storeId,
        name: form.name,
        objective: form.objective,
        platforms: form.platforms,
        daily_budget_cents: Math.round(form.daily_budget * 100),
        total_budget_cents: Math.round(form.total_budget * 100),
        currency: form.currency,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        headline: form.headline || null,
        body: form.body || null,
        cta: form.cta || null,
        destination_url: form.destination_url || null,
        status: asDraft ? "draft" : "pending_review",
      };
      if (editing) {
        const { error } = await supabase.from("store_ad_campaigns" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.created_by = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("store_ad_campaigns" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(editing ? "Campaign updated" : vars.asDraft ? "Saved as draft" : "Submitted for review");
      setCreateOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_ad_campaigns" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Campaign deleted"); },
  });

  const launchCampaign = useMutation({
    mutationFn: async (c: AdCampaign) => {
      const missing = c.platforms.filter((p) => !accountByPlatform(p) || accountByPlatform(p)?.status === "disconnected");
      if (missing.length) throw new Error(`Connect these platforms first: ${missing.join(", ")}`);
      const { error } = await supabase.from("store_ad_campaigns" as any)
        .update({ status: "pending_review" })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Campaign queued for review."); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_ad_campaigns" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (c: AdCampaign) => {
      const payload: any = {
        store_id: storeId,
        name: `${c.name} (copy)`,
        objective: c.objective,
        platforms: c.platforms,
        daily_budget_cents: c.daily_budget_cents,
        total_budget_cents: c.total_budget_cents,
        currency: c.currency,
        headline: c.headline,
        body: c.body,
        cta: c.cta,
        destination_url: c.destination_url,
        status: "draft",
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };
      const { error } = await supabase.from("store_ad_campaigns" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Campaign duplicated"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ===== Realtime status-change toast =====
  const lastStatusRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const map = lastStatusRef.current;
    for (const c of campaigns) {
      const prev = map[c.id];
      if (prev && prev !== c.status) {
        if (c.status === "active") toast.success(`"${c.name}" is now live`);
        else if (c.status === "rejected") toast.error(`"${c.name}" was rejected`);
        else if (c.status === "paused" && prev === "active") toast.info(`"${c.name}" paused`);
        else if (c.status === "ended") toast.info(`"${c.name}" ended`);
      }
      map[c.id] = c.status;
    }
  }, [campaigns]);

  // ===== Handlers =====

  const openCreate = () => { setEditing(null); setCreateOpen(true); };
  const openEdit = (c: AdCampaign) => { setEditing(c); setCreateOpen(true); };

  const initialForm: CampaignFormState = useMemo(() => {
    if (!editing) return EMPTY_FORM;
    return {
      name: editing.name,
      objective: editing.objective,
      platforms: editing.platforms || [],
      daily_budget: editing.daily_budget_cents / 100,
      total_budget: editing.total_budget_cents / 100,
      currency: editing.currency,
      start_date: editing.start_date ? editing.start_date.slice(0, 16) : "",
      end_date: editing.end_date ? editing.end_date.slice(0, 16) : "",
      headline: editing.headline || "",
      body: editing.body || "",
      cta: editing.cta || "Learn More",
      destination_url: editing.destination_url || "",
    };
  }, [editing]);

  // ===== Derived: filtered/sorted campaigns =====

  const filteredCampaigns = useMemo(() => {
    let list = campaigns;
    if (filter !== "all") list = list.filter((c) => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "spend") return b.spend_cents - a.spend_cents;
      if (sort === "performance") return b.clicks - a.clicks;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [campaigns, filter, search, sort]);

  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, [campaigns]);

  const connectDef = connectPlatform ? PLATFORMS.find((p) => p.id === connectPlatform)! : null;
  const connectAcc = connectPlatform ? accountByPlatform(connectPlatform) : undefined;

  const scrollToPlatforms = () => {
    document.getElementById("ads-platforms")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollToCampaigns = () => {
    document.getElementById("ads-campaigns")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-20 sm:pb-4">
      {/* Stat strip */}
      {isLoading ? <AdsStatStripSkeleton /> : <AdsStatStrip stats={stats} />}

      {/* Smart suggestions */}
      {!isLoading && (
        <AdsInsightsPanel
          campaigns={campaigns}
          accounts={accounts}
          stats={stats}
          wallet={wallet}
          onCreateCampaign={openCreate}
          onAddFunds={goToWallet}
          onConnectPlatform={scrollToPlatforms}
          onOpenCampaign={(c) => setDetailCampaign(c)}
        />
      )}

      {/* Slim integration chip */}
      {!bannerDismissed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] sm:text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="flex-1 text-amber-900 dark:text-amber-300/90 leading-tight">
            <span className="font-semibold">API approvals pending</span> — drafts allowed; live launches activate once each platform is approved.
          </p>
          <button type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-amber-700 dark:text-amber-300/70 hover:text-amber-900 text-[10px] uppercase tracking-wider shrink-0"
            aria-label="Dismiss banner"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Wallet & billing */}
      {!isLoading && (
        <div id="ads-wallet">
          <AdsWalletCard
            wallet={wallet}
            ledger={ledger}
            stats={stats}
            onAddFunds={() => navigate("/shop-dashboard/wallet")}
            onViewAll={() => navigate("/shop-dashboard/wallet")}
            onToggleAutoReload={() => navigate("/shop-dashboard/wallet")}
          />
        </div>
      )}

      {/* Onboarding checklist */}
      {isLoading ? (
        <OnboardingChecklistSkeleton />
      ) : (
        <AdsOnboardingChecklist
          state={checklist}
          onConnectPlatform={scrollToPlatforms}
          onAddBilling={goToWallet}
          onCreateCampaign={openCreate}
          onSubmitForReview={scrollToCampaigns}
        />
      )}

      {/* Platform connections */}
      <Card id="ads-platforms">
        <CardHeader className="pb-2.5 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Ad Platforms
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {isLoading ? (
            <PlatformTilesSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PLATFORMS.map((p) => (
                <AdsPlatformTile
                  key={p.id}
                  platform={p.id}
                  label={p.label}
                  icon={p.icon}
                  color={p.color}
                  account={accountByPlatform(p.id)}
                  onClick={() => setConnectPlatform(p.id)}
                />
              ))}
            </div>
          )}
          {!isLoading && accounts.length === 0 && (
            <div className="mt-3">
              <MarketingEmptyState
                icon={Plug}
                title="No platforms connected"
                body="Connect Meta, Google, TikTok or X to start running ads."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaigns list */}
      <Card id="ads-campaigns">
        <CardHeader className="px-3 pt-3 pb-2.5 flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Campaigns</CardTitle>
          <Button size="sm" className="h-8 hidden sm:inline-flex" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2.5">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              {STATUS_FILTERS.map((f) => {
                const count = statusCounts[f.id] ?? 0;
                const active = filter === f.id;
                return (
                  <button type="button"
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition shrink-0",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {f.label}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-4 px-1 text-[9px]",
                        active && "bg-primary-foreground/20 text-primary-foreground"
                      )}
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 px-2 text-xs rounded-md border border-input bg-background"
                aria-label="Sort campaigns"
              >
                <option value="newest">Newest</option>
                <option value="spend">Spend</option>
                <option value="performance">Performance</option>
              </select>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              <CampaignRowSkeleton />
              <CampaignRowSkeleton />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            campaigns.length === 0 ? (
              <MarketingEmptyState
                icon={Megaphone}
                title="No campaigns yet"
                body="Launch your first paid campaign to reach new customers across Facebook, Instagram, Google, TikTok, and X."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
                  </Button>
                }
              />
            ) : (
              <MarketingEmptyState
                variant="campaigns"
                action={
                  <Button size="sm" variant="outline" onClick={() => { setFilter("all"); setSearch(""); }}>
                    Clear filters
                  </Button>
                }
              />
            )
          ) : (
            <div className="space-y-2">
              {filteredCampaigns.map((c) => (
                <AdsCampaignRow
                  key={c.id}
                  campaign={c}
                  platforms={PLATFORMS}
                  statusColors={STATUS_COLORS}
                  onEdit={openEdit}
                  onDelete={(c) => deleteCampaign.mutate(c.id)}
                  onPause={(c) => toggleStatus.mutate({ id: c.id, status: "paused" })}
                  onResume={(c) => toggleStatus.mutate({ id: c.id, status: "active" })}
                  onLaunch={(c) => launchCampaign.mutate(c)}
                  onDuplicate={(c) => duplicateCampaign.mutate(c)}
                  onArchive={(c) => archiveCampaign.mutate(c.id)}
                  onClick={(c) => setDetailCampaign(c)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={openCreate}
        aria-label="New campaign"
        className="sm:hidden fixed right-4 z-40 flex items-center gap-1.5 h-12 px-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition"
        style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 80px)" }}
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-semibold">New</span>
      </button>

      {/* Connect dialog */}
      {connectDef && (
        oauthMutation.isPending ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-md p-4">
              <OAuthConnectSkeleton />
            </div>
          </div>
        ) : (
          <AdsConnectDialog
            open={!!connectPlatform}
            onClose={() => setConnectPlatform(null)}
            platform={connectDef.id}
            label={connectDef.label}
            icon={connectDef.icon}
            color={connectDef.color}
            account={connectAcc}
            supportsOAuth={connectDef.oauth}
            oauthBrandClass={connectDef.brand}
            helpUrl={connectDef.help}
            onOAuth={() => oauthMutation.mutate(connectDef.id)}
            onSaveManual={(externalId, displayName) =>
              connectMutation.mutate({ platform: connectDef.id, externalId, displayName })
            }
            onDisconnect={(id) => disconnectMutation.mutate(id)}
            oauthPending={oauthMutation.isPending}
            savePending={connectMutation.isPending}
          />
        )
      )}

      {/* Create / Edit campaign wizard */}
      <CreateCampaignWizard
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        initial={initialForm}
        isEditing={!!editing}
        platforms={PLATFORMS}
        accounts={accounts}
        onSave={(form, asDraft) => saveCampaign.mutate({ form, asDraft })}
        saving={saveCampaign.isPending}
        walletBalanceCents={wallet.balance_cents}
        onConnectPlatform={(p) => { setCreateOpen(false); setConnectPlatform(p); }}
        onAddFunds={goToWallet}
      />

      {/* Campaign detail drawer */}
      <AdsCampaignDetailDrawer
        open={!!detailCampaign}
        onClose={() => setDetailCampaign(null)}
        campaign={detailCampaign}
        platforms={PLATFORMS}
        statusColors={STATUS_COLORS}
        onEdit={openEdit}
        onDuplicate={(c) => duplicateCampaign.mutate(c)}
        onDelete={(c) => deleteCampaign.mutate(c.id)}
        onPause={(c) => toggleStatus.mutate({ id: c.id, status: "paused" })}
        onResume={(c) => toggleStatus.mutate({ id: c.id, status: "active" })}
      />
    </div>
  );
}
