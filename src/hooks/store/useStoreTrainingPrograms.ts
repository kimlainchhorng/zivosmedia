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
      const { error } = await supabase.functions.invoke("store-training-program-manage", {
        body: {
          action: "save",
          store_id: storeId,
          program_id: draft.id,
          program: {
            name: draft.name,
            type: draft.type,
            description: draft.description ?? null,
            ...(draft.modules ? { modules: draft.modules } : {}),
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("store-training-program-manage", {
        body: {
          action: "delete",
          program_id: id,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const seedDefaults = useMutation({
    mutationFn: async (defaults: ProgramDraft[]) => {
      const { error } = await supabase.functions.invoke("store-training-program-manage", {
        body: {
          action: "seed_defaults",
          store_id: storeId,
          programs: defaults,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  return { list, upsert, remove, seedDefaults };
}
