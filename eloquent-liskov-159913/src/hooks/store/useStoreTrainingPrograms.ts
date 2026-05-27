/**
 * useStoreTrainingPrograms — CRUD for training programs + their modules.
 * Backed by `public.store_training_programs` and `public.store_training_modules`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgramType = "onboarding" | "training" | "certification";

export interface TrainingModule {
  id: string;
  program_id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
}

export interface TrainingProgram {
  id: string;
  store_id: string;
  name: string;
  type: ProgramType;
  description: string | null;
  created_at: string;
  modules: TrainingModule[];
}

export interface ProgramDraft {
  id?: string;
  name: string;
  type: ProgramType;
  description?: string;
  modules?: { title: string; duration_minutes: number }[];
}

const KEY = (storeId: string) => ["store-training-programs", storeId] as const;

export function useStoreTrainingPrograms(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY(storeId),
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data: programs, error } = await supabase
        .from("store_training_programs")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (programs || []).map((p) => p.id);
      const modulesByProgram: Record<string, TrainingModule[]> = {};
      if (ids.length) {
        const { data: mods } = await supabase
          .from("store_training_modules")
          .select("*")
          .in("program_id", ids)
          .order("sort_order", { ascending: true });
        for (const m of mods || []) {
          (modulesByProgram[m.program_id] ||= []).push(m as TrainingModule);
        }
      }
      return (programs || []).map((p) => ({
        ...p,
        modules: modulesByProgram[p.id] || [],
      })) as TrainingProgram[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (draft: ProgramDraft) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      let programId = draft.id;
      if (programId) {
        const { error } = await supabase
          .from("store_training_programs")
          .update({
            name: draft.name,
            type: draft.type,
            description: draft.description ?? null,
          })
          .eq("id", programId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("store_training_programs")
          .insert({
            store_id: storeId,
            name: draft.name,
            type: draft.type,
            description: draft.description ?? null,
            created_by: uid,
          })
          .select("id")
          .single();
        if (error) throw error;
        programId = data.id;
      }

      if (draft.modules && draft.modules.length && programId) {
        const rows = draft.modules.map((m, i) => ({
          program_id: programId!,
          title: m.title,
          duration_minutes: m.duration_minutes,
          sort_order: i,
        }));
        const { error } = await supabase.from("store_training_modules").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_training_programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const seedDefaults = useMutation({
    mutationFn: async (defaults: ProgramDraft[]) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      for (const d of defaults) {
        const { data: prog, error } = await supabase
          .from("store_training_programs")
          .insert({
            store_id: storeId,
            name: d.name,
            type: d.type,
            description: d.description ?? null,
            created_by: uid,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (d.modules?.length) {
          const rows = d.modules.map((m, i) => ({
            program_id: prog.id,
            title: m.title,
            duration_minutes: m.duration_minutes,
            sort_order: i,
          }));
          const { error: mErr } = await supabase.from("store_training_modules").insert(rows);
          if (mErr) throw mErr;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  return { list, upsert, remove, seedDefaults };
}
