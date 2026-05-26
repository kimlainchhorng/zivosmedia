/**
 * DriverPayoutsPage — Stripe Connect Express onboarding + balance.
 * Lets drivers complete their Stripe onboarding and view payouts state.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ConnectStatus {
  connected: boolean;
  account_id?: string;
  onboarded?: boolean;
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: any;
}

export default function DriverPayoutsPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("driver-connect-status", { body: {} });
      if (error) throw error;
      setStatus(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payouts status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startOnboarding = async () => {
    setOnboarding(true);
    try {
      const { data, error } = await supabase.functions.invoke("driver-connect-onboard", {
        body: { country: "US", return_url: `${window.location.origin}/driver/payouts?onboarded=1` },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No onboarding URL returned");
      window.location.assign(data.url);
    } catch (e: any) {
      toast.error(e?.message || "Could not start onboarding");
      setOnboarding(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-4 safe-area-top">
      <header>
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="text-sm text-muted-foreground">Earnings are paid out to your bank via Stripe Connect.</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking status…
            </div>
          ) : !status?.connected ? (
            <>
              <p className="text-sm">You haven't connected a payout account yet.</p>
              <Button onClick={startOnboarding} disabled={onboarding}>
                {onboarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Complete onboarding
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={status.details_submitted ? "default" : "secondary"}>
                  {status.details_submitted ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                  Details {status.details_submitted ? "submitted" : "pending"}
                </Badge>
                <Badge variant={status.payouts_enabled ? "default" : "secondary"}>
                  {status.payouts_enabled ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                  Payouts {status.payouts_enabled ? "enabled" : "disabled"}
                </Badge>
                <Badge variant={status.charges_enabled ? "default" : "secondary"}>
                  {status.charges_enabled ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                  Charges {status.charges_enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              {!status.payouts_enabled && (
                <Button onClick={startOnboarding} disabled={onboarding} variant="outline">
                  {onboarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue onboarding
                </Button>
              )}
              <Button onClick={refresh} variant="ghost" size="sm">Refresh status</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
