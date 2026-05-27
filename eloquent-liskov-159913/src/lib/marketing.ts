import { supabase } from "@/integrations/supabase/client";

export interface MarketingCampaign {
  id: string;
  name: string;
  status: string | null;
  campaign_type: string;
  title?: string | null;
  message?: string | null;
  notification_title?: string | null;
  notification_body?: string | null;
  push_enabled?: boolean | null;
  email_enabled?: boolean | null;
  sms_enabled?: boolean | null;
  target_audience?: string | null;
  target_city?: string | null;
  target_criteria?: any;
  start_date?: string | null;
  end_date?: string | null;
  executed_at?: string | null;
  sent_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  credits_amount?: number | null;
  promo_code_id?: string | null;
  is_recurring?: boolean | null;
}

export interface CampaignTargetCriteria {
  role?: string;
  city?: string;
  [key: string]: any;
}

export async function getCampaigns(): Promise<MarketingCampaign[]> {
  const { data } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as MarketingCampaign[];
}

export async function getCampaign(id: string): Promise<MarketingCampaign | null> {
  const { data } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as MarketingCampaign | null;
}

export async function createCampaign(payload: any): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as MarketingCampaign;
}

export async function updateCampaign(id: string, payload: any): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MarketingCampaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getCampaignStats(id: string) {
  const { data } = await supabase
    .from("campaign_deliveries")
    .select("opened_at, clicked_at, converted_at, status, channel")
    .eq("campaign_id", id);
  const rows = data ?? [];
  const total = rows.length;
  const opened = rows.filter((r) => r.opened_at).length;
  const clicked = rows.filter((r) => r.clicked_at).length;
  const converted = rows.filter((r) => r.converted_at).length;
  return {
    total,
    opened,
    clicked,
    converted,
    openRate: total > 0 ? opened / total : 0,
    clickRate: total > 0 ? clicked / total : 0,
    conversionRate: total > 0 ? converted / total : 0,
  };
}

export async function getAggregateMarketingStats() {
  const [{ data: campaigns }, { data: deliveries }] = await Promise.all([
    supabase.from("marketing_campaigns").select("id, status, campaign_type"),
    supabase.from("campaign_deliveries").select("opened_at, clicked_at, converted_at"),
  ]);
  const dels = deliveries ?? [];
  return {
    totalCampaigns: campaigns?.length ?? 0,
    activeCampaigns: campaigns?.filter((c) => c.status === "active").length ?? 0,
    totalDeliveries: dels.length,
    openRate: dels.length > 0 ? dels.filter((d) => d.opened_at).length / dels.length : 0,
    clickRate: dels.length > 0 ? dels.filter((d) => d.clicked_at).length / dels.length : 0,
    conversionRate: dels.length > 0 ? dels.filter((d) => d.converted_at).length / dels.length : 0,
  };
}

export async function getTargetedUsers(criteria: CampaignTargetCriteria, limit = 100) {
  let query = supabase
    .from("profiles")
    .select("id, email, full_name")
    .limit(limit);
  if (criteria.city) query = (query as any).eq("city", criteria.city);
  if (criteria.role) query = (query as any).eq("role", criteria.role);
  const { data } = await query;
  return data ?? [];
}

export async function getTargetPreviewCount(criteria: CampaignTargetCriteria): Promise<number> {
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (criteria.city) query = (query as any).eq("city", criteria.city);
  if (criteria.role) query = (query as any).eq("role", criteria.role);
  const { count } = await query;
  return count ?? 0;
}

export async function getCampaignDeliveries(id: string, limit = 50) {
  const { data } = await supabase
    .from("campaign_deliveries")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUserPromoWallet(userId: string) {
  const { data } = await supabase
    .from("marketing_promo_codes")
    .select("*")
    .eq("status", "active");
  return data ?? [];
}

export async function markPromoUsed(promoId: string): Promise<void> {
  await supabase
    .from("marketing_promo_codes")
    .update({ status: "redeemed" })
    .eq("id", promoId);
}

export async function executeCampaign(id: string): Promise<{ success: boolean; users_targeted: number; error?: string }> {
  try {
    // `execute-marketing-campaign` was never deployed — the canonical fn is
    // `send-marketing-campaign`. Every "Send now" press silently 404'd.
    const { data, error } = await supabase.functions.invoke("send-marketing-campaign", {
      body: { campaign_id: id },
    });
    if (error) throw error;
    await supabase
      .from("marketing_campaigns")
      .update({ executed_at: new Date().toISOString(), status: "sent" })
      .eq("id", id);
    return data ?? { success: true, users_targeted: 0 };
  } catch (e: any) {
    return { success: false, users_targeted: 0, error: e.message };
  }
}
