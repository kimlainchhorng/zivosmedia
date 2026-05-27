import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const REQUIRED_DOC_TYPES = [
  "drivers_license_front",
  "drivers_license_back",
  "vehicle_registration",
  "insurance",
  "profile_photo",
  "vehicle_photo",
] as const;

export type DocType = (typeof REQUIRED_DOC_TYPES)[number];

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: DocType | string;
  file_path: string | null;
  status: "not_uploaded" | "pending" | "approved" | "rejected" | string;
  rejection_reason: string | null;
  uploaded_at: string | null;
}

export function useDriverVerification(driverId: string | null) {
  const [docs, setDocs] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!driverId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("driver_documents")
      .select("id, driver_id, document_type, file_path, status, rejection_reason, uploaded_at")
      .eq("driver_id", driverId);
    setDocs((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const byType = new Map(docs.map((d) => [d.document_type as string, d]));
  const approvedCount = REQUIRED_DOC_TYPES.filter((t) => byType.get(t)?.status === "approved").length;
  const allApproved = approvedCount === REQUIRED_DOC_TYPES.length;
  const canGoOnline = allApproved;

  return { docs, byType, approvedCount, totalRequired: REQUIRED_DOC_TYPES.length, allApproved, canGoOnline, loading, refresh };
}
