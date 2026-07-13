/**
 * useReportContent — submit a content_report row for any reportable entity
 * (PPV post, paid DM, creator profile).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { submitSafetyReport } from "@/lib/social/safetyReport";

export type ReportableType = "ppv_post" | "paid_dm" | "creator";

interface ReportArgs {
  contentType: ReportableType;
  contentId: string;
  reportedUserId?: string | null;
  reason: string;
  description?: string | null;
}

export function useReportContent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const reportMut = useMutation({
    mutationFn: async (args: ReportArgs) => {
      if (!user) throw new Error("Sign in to report");
      const res = await submitSafetyReport({
        type: "content",
        reported_user_id: args.reportedUserId ?? null,
        content_type: args.contentType,
        content_id: args.contentId,
        reason: args.reason,
        description: args.description?.slice(0, 1000) || null,
      });
      return { alreadyReported: res.alreadyReported === true };
    },
    onSuccess: (res) => {
      toast.success(res.alreadyReported ? "Already reported" : "Report submitted — thank you");
      qc.invalidateQueries({ queryKey: ["content-reports"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't submit report"),
  });

  return {
    report: reportMut.mutateAsync,
    reporting: reportMut.isPending,
  };
}
