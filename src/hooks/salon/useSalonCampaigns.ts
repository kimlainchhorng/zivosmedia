/**
 * useSalonCampaigns — owner-side CRUD + send wrapper for salon_campaigns.
 *
 * The hook exposes:
 *   - campaigns: full list (drafts + sending + history) for the store
 *   - createDraft / updateDraft / cancelDraft: mutations
 *   - sendNow(id): invokes the salon-send-campaign edge function
 *   - previewCohort(kind, params): calls salon_campaign_resolve_cohort RPC
 *
 * RLS gates everything to the store owner.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonCampaignStatus = "draft" | "sending" | "sent" | "failed" | "cancelled";
export type SalonCohortKind = "all" | "dormant" | "tag" | "recent" | "birthday_month";

export interface SalonCampaign {
  id: string;
  store_id: string;
  name: string;
  status: SalonCampaignStatus;
  channel_sms: boolean;
  channel_email: boolean;
  cohort_kind: SalonCohortKind;
  cohort_params: Record<string, unknown>;
  subject: string | null;
  body_html: string | null;
  sms_body: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonCohortPreview {
  count: number;
  sample: string[]; // first 5 display_names
}

export interface SalonCampaignDraft {
  name: string;
  channel_sms: boolean;
  channel_email: boolean;
  cohort_kind: SalonCohortKind;
  cohort_params: Record<string, unknown>;
  subject: string | null;
  body_html: string | null;
  sms_body: string | null;
}

interface UseResult {
  campaigns: SalonCampaign[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDraft: (draft: SalonCampaignDraft) => Promise<SalonCampaign | null>;
  updateDraft: (id: string, patch: Partial<SalonCampaignDraft>) => Promise<boolean>;
  cancelDraft: (id: string) => Promise<boolean>;
  sendNow: (id: string) => Promise<{ ok: boolean; error?: string }>;
  previewCohort: (kind: SalonCohortKind, params: Record<string, unknown>) => Promise<SalonCohortPreview>;
}

export function useSalonCampaigns(storeId: string | undefined): UseResult {
  const [campaigns, setCampaigns] = useState<SalonCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) {
      console.error("[useSalonCampaigns] load failed", err);
      setError("Couldn't load campaigns.");
      setLoading(false);
      return;
    }
    setCampaigns((data ?? []) as unknown as SalonCampaign[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: any change to this store's campaigns refreshes the list.
  useEffect(() => {
    if (!storeId) return;
    const ch = supabase
      .channel(`salon-campaigns:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_campaigns", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [storeId, load]);

  const createDraft = useCallback(async (draft: SalonCampaignDraft): Promise<SalonCampaign | null> => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from("salon_campaigns")
      .insert({
        store_id: storeId,
        name: draft.name.trim(),
        status: "draft" as const,
        channel_sms: draft.channel_sms,
        channel_email: draft.channel_email,
        cohort_kind: draft.cohort_kind,
        cohort_params: draft.cohort_params,
        subject: draft.subject?.trim() || null,
        body_html: draft.body_html?.trim() || null,
        sms_body: draft.sms_body?.trim() || null,
        created_by_user_id: userData?.user?.id ?? null,
      } as never)
      .select("*")
      .single();
    setSaving(false);
    if (err || !data) {
      console.error("[useSalonCampaigns] create failed", err);
      setError(err?.message ?? "Couldn't create campaign.");
      return null;
    }
    const created = data as unknown as SalonCampaign;
    setCampaigns((prev) => [created, ...prev]);
    return created;
  }, [storeId]);

  const updateDraft = useCallback(async (id: string, patch: Partial<SalonCampaignDraft>): Promise<boolean> => {
    setSaving(true); setError(null);
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.channel_sms !== undefined) clean.channel_sms = patch.channel_sms;
    if (patch.channel_email !== undefined) clean.channel_email = patch.channel_email;
    if (patch.cohort_kind !== undefined) clean.cohort_kind = patch.cohort_kind;
    if (patch.cohort_params !== undefined) clean.cohort_params = patch.cohort_params;
    if (patch.subject !== undefined) clean.subject = patch.subject?.trim() || null;
    if (patch.body_html !== undefined) clean.body_html = patch.body_html?.trim() || null;
    if (patch.sms_body !== undefined) clean.sms_body = patch.sms_body?.trim() || null;
    const { error: err } = await supabase
      .from("salon_campaigns")
      .update(clean as never)
      .eq("id", id);
    setSaving(false);
    if (err) {
      console.error("[useSalonCampaigns] update failed", err);
      setError(err.message);
      return false;
    }
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, ...clean as Partial<SalonCampaign> } : c));
    return true;
  }, []);

  const cancelDraft = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true); setError(null);
    const { error: err } = await supabase
      .from("salon_campaigns")
      .update({ status: "cancelled" } as never)
      .eq("id", id);
    setSaving(false);
    if (err) {
      console.error("[useSalonCampaigns] cancel failed", err);
      setError(err.message);
      return false;
    }
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "cancelled" as const } : c));
    return true;
  }, []);

  const sendNow = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    setSaving(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("salon-send-campaign", {
        body: { campaign_id: id },
      });
      if (err) {
        setError(err.message);
        return { ok: false, error: err.message };
      }
      // The function updates the row; realtime brings it back to us.
      return { ok: true, ...(data as object ?? {}) };
    } finally {
      setSaving(false);
    }
  }, []);

  const previewCohort = useCallback(async (kind: SalonCohortKind, params: Record<string, unknown>): Promise<SalonCohortPreview> => {
    if (!storeId) return { count: 0, sample: [] };
    const { data, error: err } = await supabase.rpc("salon_campaign_resolve_cohort", {
      p_store_id: storeId,
      p_kind: kind,
      p_params: params as never,
    });
    if (err) {
      console.error("[useSalonCampaigns] preview failed", err);
      return { count: 0, sample: [] };
    }
    const rows = (data ?? []) as any[];
    return { count: rows.length, sample: rows.slice(0, 5).map((r) => r.display_name as string) };
  }, [storeId]);

  return { campaigns, loading, saving, error, refresh: load, createDraft, updateDraft, cancelDraft, sendNow, previewCohort };
}
