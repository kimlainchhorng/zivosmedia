/**
 * useStoreAdsOverview — single source of truth for the StoreAdsManager Ads tab.
 * Fetches ad accounts + campaigns in parallel, derives aggregate stats with 7-day deltas,
 * computes onboarding-checklist state, and subscribes to realtime campaign updates.
 */
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdPlatform = "meta" | "instagram" | "google" | "tiktok" | "x";

export interface AdAccount {
  id: string;
  platform: AdPlatform;
  status: string;
  external_account_id: string | null;
  display_name: string | null;
  connected_at: string | null;
}

export interface AdCampaign {
  id: string;
  name: string;
  objective: string;
  platforms: AdPlatform[];
  status: string;
  daily_budget_cents: number;
  total_budget_cents: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  destination_url: string | null;
  creative_url: string | null;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at?: string | null;
}

export interface AdsStatDelta {
  current: number;
  previous: number;
  deltaPct: number; // 0 when previous is 0
}

export interface AdsAggregateStats {
  spend: AdsStatDelta;
  impressions: AdsStatDelta;
  clicks: AdsStatDelta;
  conversions: AdsStatDelta;
}

export interface ChecklistState {
  hasPlatform: boolean;
  hasBilling: boolean; // best-effort heuristic (any wallet row)
  hasDraft: boolean;
  hasSubmitted: boolean;
  completedCount: number;
  total: number;
  done: boolean;
}

export interface WalletInfo {
  balance_cents: number;
  auto_recharge_enabled: boolean;
  threshold_cents: number;
  recharge_amount_cents: number;
  has_payment_method: boolean;
}

export interface WalletLedgerEntry {
  id: string;
  amount_cents: number;
  balance_after_cents: number;
  entry_type: string;
  description: string | null;
  created_at: string;
}

const QK = (storeId: string) => ["store-ads-overview", storeId] as const;

function emptyDelta(): AdsStatDelta {
  return { current: 0, previous: 0, deltaPct: 0 };
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function buildStats(campaigns: AdCampaign[]): AdsAggregateStats {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const cutCurrent = now - sevenDays;
  const cutPrev = now - 2 * sevenDays;

  const acc = {
    spend: emptyDelta(),
    impressions: emptyDelta(),
    clicks: emptyDelta(),
    conversions: emptyDelta(),
  };

  for (const c of campaigns) {
    const ts = new Date(c.updated_at || c.created_at).getTime();
    const target =
      ts >= cutCurrent ? "current" : ts >= cutPrev ? "previous" : null;
    // Always include in lifetime totals via "current"
    if (!target) continue;
    acc.spend[target] += c.spend_cents;
    acc.impressions[target] += c.impressions;
    acc.clicks[target] += c.clicks;
    acc.conversions[target] += c.conversions;
  }

  // If nothing in current/previous bucket, fall back to lifetime in current
  const lifetime = campaigns.reduce(
    (a, c) => ({
      spend: a.spend + c.spend_cents,
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      conversions: a.conversions + c.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  (Object.keys(acc) as (keyof typeof acc)[]).forEach((k) => {
    if (acc[k].current === 0 && acc[k].previous === 0) {
      acc[k].current = lifetime[k as keyof typeof lifetime];
    }
    acc[k].deltaPct = pctDelta(acc[k].current, acc[k].previous);
  });

  return acc;
}

function buildChecklist(
  accounts: AdAccount[],
  campaigns: AdCampaign[],
  hasBilling: boolean
): ChecklistState {
  const hasPlatform = accounts.some((a) => a.status !== "disconnected");
  const hasDraft = campaigns.length > 0;
  const hasSubmitted = campaigns.some(
    (c) => c.status === "pending_review" || c.status === "active"
  );
  const flags = [hasPlatform, hasBilling, hasDraft, hasSubmitted];
  const completedCount = flags.filter(Boolean).length;
  return {
    hasPlatform,
    hasBilling,
    hasDraft,
    hasSubmitted,
    completedCount,
    total: 4,
    done: completedCount === 4,
  };
}

export function useStoreAdsOverview(storeId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK(storeId),
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const [accountsRes, campaignsRes, walletRes, ledgerRes] = await Promise.all([
        supabase
          .from("store_ad_accounts" as any)
          .select("*")
          .eq("store_id", storeId),
        supabase
          .from("store_ad_campaigns" as any)
          .select("*")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("ads_studio_wallet" as any)
          .select("balance_cents, auto_recharge_enabled, threshold_cents, recharge_amount_cents, stripe_payment_method_id")
          .eq("store_id", storeId)
          .maybeSingle(),
        supabase
          .from("ads_wallet_ledger" as any)
          .select("id, amount_cents, balance_after_cents, entry_type, description, created_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (campaignsRes.error) throw campaignsRes.error;
      // wallet/ledger errors are non-fatal

      const accounts = ((accountsRes.data || []) as unknown) as AdAccount[];
      const campaigns = ((campaignsRes.data || []) as unknown) as AdCampaign[];
      const w: any = walletRes.data ?? null;
      const wallet: WalletInfo = {
        balance_cents: w?.balance_cents ?? 0,
        auto_recharge_enabled: w?.auto_recharge_enabled ?? false,
        threshold_cents: w?.threshold_cents ?? 1000,
        recharge_amount_cents: w?.recharge_amount_cents ?? 5000,
        has_payment_method: !!w?.stripe_payment_method_id,
      };
      const ledger = ((ledgerRes.data || []) as unknown) as WalletLedgerEntry[];
      const hasBilling = wallet.balance_cents > 0;

      return { accounts, campaigns, wallet, ledger, hasBilling };
    },
  });

  // Realtime subscription on campaigns
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`store-ads-${storeId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "store_ad_campaigns",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QK(storeId) });
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "store_ad_accounts",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QK(storeId) });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, qc]);

  const accounts = query.data?.accounts ?? [];
  const campaigns = query.data?.campaigns ?? [];
  const hasBilling = query.data?.hasBilling ?? false;
  const wallet: WalletInfo = query.data?.wallet ?? {
    balance_cents: 0,
    auto_recharge_enabled: false,
    threshold_cents: 1000,
    recharge_amount_cents: 5000,
    has_payment_method: false,
  };
  const ledger: WalletLedgerEntry[] = query.data?.ledger ?? [];

  const stats = useMemo(() => buildStats(campaigns), [campaigns]);
  const checklist = useMemo(
    () => buildChecklist(accounts, campaigns, hasBilling),
    [accounts, campaigns, hasBilling]
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: QK(storeId) });

  return {
    accounts,
    campaigns,
    stats,
    checklist,
    wallet,
    ledger,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    invalidate,
  };
}
