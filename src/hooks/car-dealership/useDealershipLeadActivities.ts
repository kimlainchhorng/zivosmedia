import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipActivityType =
  | "note"
  | "call"
  | "email"
  | "sms"
  | "meeting"
  | "test_drive"
  | "offer_made"
  | "status_change"
  | "other"
  | "system";

export interface DealershipLeadActivity {
  id: string;
  store_id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: DealershipActivityType;
  summary: string;
  body: string | null;
  outcome: string | null;
  occurred_at: string;
  created_at: string;
}

export interface DealershipLeadActivityDraft {
  activity_type: DealershipActivityType;
  summary: string;
  body?: string | null;
  outcome?: string | null;
  occurred_at?: string;
}

export function useDealershipLeadActivities(
  storeId: string | undefined,
  leadId: string | null,
) {
  const [activities, setActivities] = useState<DealershipLeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId || !leadId) { setActivities([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("car_dealership_lead_activities")
      .select("*")
      .eq("store_id", storeId)
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false });
    setActivities((data ?? []) as unknown as DealershipLeadActivity[]);
    setLoading(false);
  }, [storeId, leadId]);

  useEffect(() => { void load(); }, [load]);

  const log = useCallback(async (draft: DealershipLeadActivityDraft): Promise<boolean> => {
    if (!storeId || !leadId) return false;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("car-dealership-lead-activity-manage", {
      body: {
        action: "create",
        store_id: storeId,
        lead_id: leadId,
        activity: {
          activity_type: draft.activity_type,
          summary: draft.summary,
          body: draft.body ?? null,
          outcome: draft.outcome ?? null,
          occurred_at: draft.occurred_at ?? new Date().toISOString(),
        },
      },
    });
    if (error) {
      console.error("[useDealershipLeadActivities] log failed", error);
      setSaving(false);
      return false;
    }
    const created = (data as { activity?: DealershipLeadActivity } | null)?.activity;
    if (!created) {
      setSaving(false);
      return false;
    }
    setActivities((prev) => [created, ...prev]);
    setSaving(false);
    return true;
  }, [storeId, leadId]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const snapshot = activities;
    setActivities((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.functions.invoke("car-dealership-lead-activity-manage", {
      body: { action: "delete", activity_id: id },
    });
    if (error) {
      console.error("[useDealershipLeadActivities] delete failed", error);
      setActivities(snapshot);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [activities]);

  return { activities, loading, saving, log, remove };
}
