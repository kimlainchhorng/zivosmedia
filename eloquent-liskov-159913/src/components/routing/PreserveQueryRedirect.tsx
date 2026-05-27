/**
 * PreserveQueryRedirect Component
 * Redirects to a new path while preserving all query parameters (utm, creator, subid, etc.)
 */
import { Navigate, useLocation } from "react-router-dom";

interface PreserveQueryRedirectProps {
  to: string;
}

const PreserveQueryRedirect = ({ to }: PreserveQueryRedirectProps) => {
  const location = useLocation();
  const targetUrl = `${to}${location.search}${location.hash}`;
  return <Navigate to={targetUrl} replace />;
};

export default PreserveQueryRedirect;
