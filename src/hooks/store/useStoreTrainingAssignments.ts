/**
 * useStoreTrainingAssignments — assign employees to a training program & track progress.
 * Backed by `public.store_training_assignments`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AssignmentStatus = "assigned" | "in_progress" | "completed";

export interface TrainingAssignment {
  id: string;
  program_id: string;
  employee_id: string;
  status: AssignmentStatus;
  progress_pct: number;
  assigned_at: string;
  completed_at: string | null;
}

const KEY = (programId: string) => ["store-training-assignments", programId] as const;

export function useStoreTrainingAssignments(programId: string | null) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY(programId || ""),
    enabled: Boolean(programId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_training_assignments")
        .select("*")
        .eq("program_id", programId!)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrainingAssignment[];
    },
  });

  const assign = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      if (!programId) throw new Error("No program");
      const rows = employeeIds.map((employee_id) => ({
        employee_id,
      }));
      const { error } = await supabase.functions.invoke("store-training-assignment-manage", {
        body: {
          action: "assign",
          program_id: programId,
          employee_ids: rows.map((row) => row.employee_id),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(programId || "") }),
  });

  const unassign = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.functions.invoke("store-training-assignment-manage", {
        body: {
          action: "unassign",
          assignment_id: assignmentId,
          program_id: programId,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(programId || "") }),
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress_pct }: { id: string; progress_pct: number }) => {
      const status: AssignmentStatus =
        progress_pct >= 100 ? "completed" : progress_pct > 0 ? "in_progress" : "assigned";
      const { error } = await supabase.functions.invoke("store-training-assignment-manage", {
        body: {
          action: "update_progress",
          assignment_id: id,
          program_id: programId,
          progress_pct,
          status,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(programId || "") }),
  });

  return { list, assign, unassign, updateProgress };
}
