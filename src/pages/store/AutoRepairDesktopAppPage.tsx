import { Navigate, useParams, useSearchParams } from "react-router-dom";

export default function AutoRepairDesktopAppPage() {
  const { storeId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "ar-dashboard";

  return <Navigate to={`/admin/stores/${encodeURIComponent(storeId)}?tab=${encodeURIComponent(tab)}`} replace />;
}
