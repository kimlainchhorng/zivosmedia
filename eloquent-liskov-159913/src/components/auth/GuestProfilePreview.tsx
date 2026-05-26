/**
 * GuestProfilePreview - guests opening Account are sent to Login with their
 * destination preserved, matching the mobile bottom-nav gate.
 */
import { Navigate, useLocation } from "react-router-dom";

export default function GuestProfilePreview() {
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?redirect=${redirect}`} replace />;
}
