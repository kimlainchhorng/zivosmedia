/**
 * Compatibility alias for the historical /devices entry point.
 *
 * The canonical registry lives under Account and is backed by the
 * server-owned linked_devices flow.
 */
import { Navigate } from "react-router-dom";

export default function DevicesPage() {
  return <Navigate to="/account/linked-devices" replace />;
}
