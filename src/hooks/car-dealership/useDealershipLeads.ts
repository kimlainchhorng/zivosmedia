/**
 * Car dealership leads pipeline CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "test_drive_scheduled"
  | "negotiating"
  | "won"
  | "lost";

export type DealershipLeadSource =
  | "walk_in" | "phone" | "web" | "referral" | "social" | "event" | "auto_trader" | "cars_com" | "other";

export interface DealershipLead {
  id: string;
  store_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  assigned_to_user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  vehicle_label: string | null;
  source: DealershipLeadSource;
  status: DealershipLeadStatus;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  desired_make: string | null;
  desired_model: string | null;
  desired_year_min: number | null;
  desired_year_max: number | null;
  trade_in_interested: boolean;
  financing_needed: boolean;
  notes: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipLeadDraft = Omit<
  DealershipLead,
  "id" | "store_id" | "created_at" | "updated_at"
>;

export function useDealershipLeads(storeId: string | undefined) {
  const [leads, setLeads] = useState<DealershipLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_leads")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipLeads] load failed", err);
      setError("Couldn't load leads.");
      setLoading(false);
      return;
    }
    setLeads((data ?? []) as unknown as DealershipLead[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipLeadDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("car_dealership_leads")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipLeads] create failed", err);
      setError(err.message || "Couldn't create lead.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipLead;
    setLeads((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipLeadDraft>) => {
    setSaving(true); setError(null);
    setLeads((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as DealershipLead) : l)));
    const { error: err } = await supabase
      .from("car_dealership_leads")
      .update(patch as never)
      .eq("id", id);
    if (err) {
      console.error("[useDealershipLeads] update failed", err);
      setError("Couldn't update lead.");
      setSaving(false);
      void load();
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = leads;
    setLeads((p) => p.filter((l) => l.id !== id));
    const { error: err } = await supabase
      .from("car_dealership_leads")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useDealershipLeads] remove failed", err);
      setError("Couldn't delete lead.");
      setLeads(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [leads]);

  return { leads, loading, saving, error, create, update, remove, refresh: load };
}
