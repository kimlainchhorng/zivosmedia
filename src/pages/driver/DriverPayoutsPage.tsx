/**
 * DriverPayoutsPage — Stripe Connect Express onboarding + balance.
 * Lets drivers complete their Stripe onboarding and view payouts state.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Banknote, Plus, Star, Trash2 } from "lucide-react";
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

interface AbaPayoutMethod {
  id: string;
  label: string | null;
  account_holder_name: string | null;
  aba_account_id: string | null;
  is_default: boolean | null;
  is_verified: boolean | null;
  verification_status: string | null;
}

interface AbaFormState {
  label: string;
  account_holder_name: string;
  aba_account_id: string;
  is_default: boolean;
}

export default function DriverPayoutsPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [abaMethods, setAbaMethods] = useState<AbaPayoutMethod[]>([]);
  const [showAbaForm, setShowAbaForm] = useState(false);
  const [abaForm, setAbaForm] = useState<AbaFormState>({
    label: "",
    account_holder_name: "",
    aba_account_id: "",
    is_default: true,
  });
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [savingAba, setSavingAba] = useState(false);
  const [defaultingAbaId, setDefaultingAbaId] = useState<string | null>(null);
  const [deletingAbaId, setDeletingAbaId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      try {
        const { data, error } = await supabase.functions.invoke("driver-connect-status", { body: {} });
        if (error) throw error;
        setStatus(data);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load Stripe payout status");
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (authData.user) {
        const { data: methods } = await (supabase.from("customer_payout_methods") as any)
          .select("id, label, account_holder_name, aba_account_id, is_default, is_verified, verification_status")
          .eq("user_id", authData.user.id)
          .eq("method_type", "aba")
          .is("store_id", null)
          .order("is_default", { ascending: false });
        setAbaMethods(methods || []);
        setShowAbaForm((methods || []).length === 0);
      }
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

  const saveAbaMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingAba(true);
    try {
      const holderName = abaForm.account_holder_name.trim();
      const accountId = abaForm.aba_account_id.replace(/[\s-]/g, "").trim();
      const label = abaForm.label.trim();

      if (!holderName) throw new Error("Account holder name is required");
      if (!/^\+?[0-9]{6,15}$/.test(accountId)) {
        throw new Error("Enter a valid ABA account number or Bakong phone number");
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in required");

      const shouldDefault = abaMethods.length === 0 || abaForm.is_default;
      if (shouldDefault) {
        const { error: clearDefaultError } = await (supabase.from("customer_payout_methods") as any)
          .update({ is_default: false })
          .eq("user_id", authData.user.id)
          .eq("method_type", "aba")
          .is("store_id", null);
        if (clearDefaultError) throw clearDefaultError;
      }

      const { error } = await (supabase.from("customer_payout_methods") as any).insert({
        user_id: authData.user.id,
        method_type: "aba",
        rail: "aba",
        country_code: "KH",
        label: label || "ABA Account",
        bank_name: "ABA Bank",
        account_holder_name: holderName,
        aba_account_id: accountId,
        is_default: shouldDefault,
        verification_status: "pending",
      });
      if (error) throw error;

      toast.success("ABA payout account saved");
      setAbaForm({ label: "", account_holder_name: "", aba_account_id: "", is_default: false });
      setShowAbaForm(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not save ABA payout account");
    } finally {
      setSavingAba(false);
    }
  };

  const makeDefaultAbaMethod = async (id: string) => {
    setDefaultingAbaId(id);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in required");

      const { error: clearDefaultError } = await (supabase.from("customer_payout_methods") as any)
        .update({ is_default: false })
        .eq("user_id", authData.user.id)
        .eq("method_type", "aba")
        .is("store_id", null);
      if (clearDefaultError) throw clearDefaultError;

      const { error } = await (supabase.from("customer_payout_methods") as any)
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", authData.user.id);
      if (error) throw error;

      toast.success("Default ABA payout account updated");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not update default payout account");
    } finally {
      setDefaultingAbaId(null);
    }
  };

  const deleteAbaMethod = async (id: string) => {
    setDeletingAbaId(id);
    try {
      const removedMethod = abaMethods.find((method) => method.id === id);
      const replacementDefault = removedMethod?.is_default
        ? abaMethods.find((method) => method.id !== id)
        : null;

      const { error } = await (supabase.from("customer_payout_methods") as any).delete().eq("id", id);
      if (error) throw error;

      if (replacementDefault) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Sign in required");

        const { error: replacementError } = await (supabase.from("customer_payout_methods") as any)
          .update({ is_default: true })
          .eq("id", replacementDefault.id)
          .eq("user_id", authData.user.id);
        if (replacementError) throw replacementError;
      }

      toast.success("ABA payout account removed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not remove payout account");
    } finally {
      setDeletingAbaId(null);
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-4 safe-area-top">
      <header>
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="text-sm text-muted-foreground">Bakong ride earnings are paid manually to your saved ABA account. Card payouts use Stripe Connect where available.</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            ABA / Bakong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking ABA payout methods...
            </div>
          ) : abaMethods.length > 0 ? (
            <div className="space-y-2">
              {abaMethods.map((method) => (
                <div key={method.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{method.label || "ABA Account"}</span>
                        {method.is_default && <Badge variant="outline">Default</Badge>}
                        <Badge variant={method.is_verified || method.verification_status === "verified" ? "default" : "secondary"}>
                          {method.verification_status || (method.is_verified ? "verified" : "pending")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {method.account_holder_name || "Account holder"} - ABA {method.aba_account_id || "not set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!method.is_default && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => makeDefaultAbaMethod(method.id)}
                          disabled={defaultingAbaId === method.id || deletingAbaId === method.id}
                          title="Set as default"
                          aria-label="Set as default ABA payout account"
                        >
                          {defaultingAbaId === method.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteAbaMethod(method.id)}
                        disabled={deletingAbaId === method.id || defaultingAbaId === method.id}
                        title="Remove"
                        aria-label="Remove ABA payout account"
                      >
                        {deletingAbaId === method.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!showAbaForm && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAbaForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add another ABA account
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/wallet">Open wallet</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {!loading && showAbaForm && (
            <form onSubmit={saveAbaMethod} className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
              {abaMethods.length === 0 && (
                <p className="text-sm">Add your ABA account so finance can pay Bakong ride earnings after each completed trip.</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="aba-holder">Account holder name</Label>
                <Input
                  id="aba-holder"
                  value={abaForm.account_holder_name}
                  onChange={(event) => setAbaForm((form) => ({ ...form, account_holder_name: event.target.value }))}
                  placeholder="Full legal name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aba-account">ABA account / Bakong phone</Label>
                <Input
                  id="aba-account"
                  value={abaForm.aba_account_id}
                  onChange={(event) => setAbaForm((form) => ({ ...form, aba_account_id: event.target.value }))}
                  placeholder="e.g. 012345678"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aba-label">Nickname</Label>
                <Input
                  id="aba-label"
                  value={abaForm.label}
                  onChange={(event) => setAbaForm((form) => ({ ...form, label: event.target.value }))}
                  placeholder="ABA Account"
                />
              </div>
              {abaMethods.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={abaForm.is_default}
                    onCheckedChange={(checked) => setAbaForm((form) => ({ ...form, is_default: checked === true }))}
                  />
                  Use as default payout account
                </label>
              )}
              <div className="flex justify-end gap-2">
                {abaMethods.length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setShowAbaForm(false)} disabled={savingAba}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={savingAba}>
                  {savingAba ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save ABA account
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

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
