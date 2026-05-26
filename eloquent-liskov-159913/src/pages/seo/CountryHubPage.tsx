/**
 * COUNTRY HUB PAGE
 * Deprecated — auto-redirects to home.
 */
import { Navigate } from "react-router-dom";

export default function CountryHubPage() {
  return <Navigate to="/" replace />;
}
