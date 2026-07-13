import { Navigate, useParams, useSearchParams } from "react-router-dom";

export default function AutoRepairDesktopAppPage() {
  const { storeId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "ar-dashboard";
  const targetParams = new URLSearchParams({ tab, category: "auto-repair" });

  return <Navigate to={`/admin/stores/${encodeURIComponent(storeId)}?${targetParams.toString()}`} replace />;
}
