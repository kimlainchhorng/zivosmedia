/**
 * SandboxTestHelper Component
 * INTERNAL ADMIN ONLY - Never shown to regular users
 * Shows helpful test route suggestions when in Duffel sandbox mode
 * 
 * IMPORTANT: This component should only be rendered:
 * 1. In sandbox/test environment (never production)
 * 2. For admin users only
 * 3. On admin/debug routes only
 */

import { ArrowRight, TestTube } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DUFFEL_SANDBOX_ROUTES, shouldShowSandboxUI } from "@/config/duffelConfig";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";

interface SandboxTestHelperProps {
  className?: string;
  /** Required: Admin status check - component won't render without admin=true */
  isAdmin?: boolean;
}

export default function SandboxTestHelper({ className, isAdmin = false }: SandboxTestHelperProps) {
  const navigate = useNavigate();
  
  // CRITICAL: Never render for non-admins or in production
  if (!shouldShowSandboxUI(isAdmin)) {
    return null;
  }

  const handleQuickSearch = (from: string, to: string) => {
    const departDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const returnDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');
    
    const params = new URLSearchParams({
      origin: from,
      dest: to,
      depart: departDate,
      return: returnDate,
      passengers: '1',
      cabin: 'economy',
    });
    
    navigate(`/flights/results?${params.toString()}`);
  };

  return (
    <Alert className={className} variant="default">
      <TestTube className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Test Environment
        <Badge variant="secondary" className="text-[10px]">ADMIN</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-4 mt-2">
        <p className="text-sm text-muted-foreground">
          Test inventory is limited. Try these routes for reliable results:
        </p>
        <div className="flex flex-wrap gap-2">
          {DUFFEL_SANDBOX_ROUTES.slice(0, 4).map((route) => (
            <Button
              key={`${route.from}-${route.to}`}
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch(route.from, route.to)}
              className="gap-1.5 text-xs"
            >
              {route.from} <ArrowRight className="w-3 h-3" /> {route.to}
            </Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Test data may differ from production.
        </p>
      </AlertDescription>
    </Alert>
  );
}
