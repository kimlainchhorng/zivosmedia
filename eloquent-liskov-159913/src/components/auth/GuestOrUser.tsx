/**
 * GuestOrUser — public route wrapper that renders <GuestPreview /> when no user
 * is signed in (instead of the default ProtectedRoute hard-redirect to /login).
 * Lets guests browse the page without being kicked out.
 */
import { useAuth } from "@/contexts/AuthContext";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

interface GuestOrUserProps {
  children: React.ReactNode;
  guestPreview: React.ReactNode;
}

export default function GuestOrUser({ children, guestPreview }: GuestOrUserProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return <>{user ? children : guestPreview}</>;
}
