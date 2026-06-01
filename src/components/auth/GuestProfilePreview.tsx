/**
 * GuestProfilePreview - guests opening Account are sent to Login with their
 * destination preserved, matching the mobile bottom-nav gate.
 */
import { Navigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";

export default function GuestProfilePreview() {
  const location = useLocation();
  const redirect = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={withRedirectParam("/login", redirect)} replace />;
}
