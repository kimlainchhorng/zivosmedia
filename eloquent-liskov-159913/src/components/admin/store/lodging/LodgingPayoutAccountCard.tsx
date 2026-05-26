/**
 * LodgingPayoutAccountCard
 * ------------------------
 * Multi-rail payout setup for a lodge/hotel. Routes by host country:
 *   - Stripe Connect Express (where supported)
 *   - ABA Bank / KHQR (Cambodia)
 *   - International bank wire (any unsupported country)
 *   - PayPal (where available)
 *
 * Methods are stored in `customer_payout_methods` scoped by `store_id` so
 * a host that owns multiple properties can set different bank accounts
 * per property.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Banknote, Landmark, Wallet, Trash2, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectStatus, useConnectOnboard } from "@/hooks/useStripeConnect";
import { getAvailableRails, normalizeCountry, recommendedRail, RAIL_DESCRIPTIONS, type PayoutRail } from "@/lib/payouts/payoutRails";

interface Props { storeId: string; storeCountry?: string | null; }

interface PayoutMethodRow {
  id: string;
  method_type: string;
  rail: string | null;
  label: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  aba_account_id: string | null;
  country_code: string | null;
  is_default: boolean;
  verification_status?: string | null;
  created_at: string;
}

const RAIL_ICON: Record<PayoutRail, typeof Banknote> = {
  stripe: ShieldCheck,
  aba: Banknote,
  bank_wire: Landmark,
  paypal: Wallet,
  square: Wallet,
  mercury: Landmark,
};

export default function LodgingPayoutAccountCard({ storeId, storeCountry }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const country = normalizeCountry(storeCountry);
  const rails = useMemo(() => getAvailableRails(country), [country]);
  const recommended = useMemo(() => recommendedRail(country), [country]);

  const [activeRail, setActiveRail] = useState<PayoutRail>(recommended);
  useEffect(() => { setActiveRail(recommended); }, [recommended]);

  // Stripe Connect status (account-level, not per-store — one Stripe account per user)
  const { data: connect, isLoading: connectLoading } = useConnectStatus();
  const onboard = useConnectOnboard();

  // Methods saved for THIS store
  const { data: methods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ["lodge-payout-methods", storeId],
    queryFn: async (): Promise<PayoutMethodRow[]> => {
      const { data, error } = await supabase
        .from("customer_payout_methods")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PayoutMethodRow[];
    },
    enabled: !!user && !!storeId,
  });

  // Handle return from Stripe (?connect=done) — refresh status, clean URL, preserve tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "done") {
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status"] });
      toast.success("Stripe setup updated — refreshing status…");
      params.delete("connect");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
    }
  }, [queryClient]);

  const startStripe = () => {
    if (!rails.stripe) {
      const fallback = recommended;
      setActiveRail(fallback);
      toast.error(`Stripe Connect isn't available in ${country}. Switched to ${fallback.replace("_", " ")}.`);
      return;
    }
    onboard.mutate(country, {
      onError: (e: any) => {
        const msg = String(e?.message || "");
        if (msg.includes("stripe_unsupported_country") || msg.toLowerCase().includes("not available")) {
          const fallback = recommended === "stripe" ? "bank_wire" : recommended;
          setActiveRail(fallback);
          toast.error(`Stripe Connect rejected ${country}. Switched to ${fallback.replace("_", " ")}.`);
        }
      },
    });
  };

  const removeMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_payout_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout method removed");
      queryClient.invalidateQueries({ queryKey: ["lodge-payout-methods", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove"),
  });

  const stripeReady = !!connect?.payouts_enabled;
  const anyManualReady = methods.length > 0;
  const anyConfigured = stripeReady || anyManualReady;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Payout account</p>
        </div>
        {anyConfigured ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />Not configured
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Property country: <span className="font-medium">{country}</span> · Recommended rail: <span className="font-medium">{recommended.replace("_", " ")}</span>
      </p>

      <Tabs value={activeRail} onValueChange={(v) => setActiveRail(v as PayoutRail)}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[rails.stripe, rails.aba, rails.bank_wire, rails.paypal].filter(Boolean).length}, minmax(0, 1fr))` }}>
          {rails.stripe && <TabsTrigger value="stripe" className="text-xs">Stripe</TabsTrigger>}
          {rails.aba && <TabsTrigger value="aba" className="text-xs">ABA</TabsTrigger>}
          {rails.bank_wire && <TabsTrigger value="bank_wire" className="text-xs">Bank wire</TabsTrigger>}
          {rails.paypal && <TabsTrigger value="paypal" className="text-xs">PayPal</TabsTrigger>}
        </TabsList>

        {/* Stripe tab */}
        {rails.stripe && (
          <TabsContent value="stripe" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{RAIL_DESCRIPTIONS.stripe}</p>
            {connectLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />Checking Stripe status…
              </p>
            ) : !connect?.connected ? (
              <Button size="sm" onClick={startStripe} disabled={onboard.isPending}>
                {onboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <ArrowRight className="h-3.5 w-3.5 mr-2" />}
                Set up Stripe ({country})
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={connect.details_submitted ? "default" : "secondary"} className="gap-1">
                    {connect.details_submitted ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    Details {connect.details_submitted ? "submitted" : "pending"}
                  </Badge>
                  <Badge variant={connect.payouts_enabled ? "default" : "secondary"} className="gap-1">
                    {connect.payouts_enabled ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    Payouts {connect.payouts_enabled ? "enabled" : "disabled"}
                  </Badge>
                </div>
                {!stripeReady && (
                  <Button size="sm" variant="outline" onClick={startStripe} disabled={onboard.isPending}>
                    {onboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                    Continue Stripe onboarding
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* ABA tab */}
        {rails.aba && (
          <TabsContent value="aba" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{RAIL_DESCRIPTIONS.aba}</p>
            <ManualMethodForm storeId={storeId} country={country} rail="aba" methods={methods} onRemove={(id) => removeMethod.mutate(id)} />
          </TabsContent>
        )}

        {/* Bank wire tab */}
        {rails.bank_wire && (
          <TabsContent value="bank_wire" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{RAIL_DESCRIPTIONS.bank_wire}</p>
            <ManualMethodForm storeId={storeId} country={country} rail="bank_wire" methods={methods} onRemove={(id) => removeMethod.mutate(id)} />
          </TabsContent>
        )}

        {/* PayPal tab */}
        {rails.paypal && (
          <TabsContent value="paypal" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{RAIL_DESCRIPTIONS.paypal}</p>
            <ManualMethodForm storeId={storeId} country={country} rail="paypal" methods={methods} onRemove={(id) => removeMethod.mutate(id)} />
          </TabsContent>
        )}
      </Tabs>

      {methodsLoading && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />Loading saved methods…
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Manual rail form (ABA / Bank wire / PayPal)                                */
/* -------------------------------------------------------------------------- */

function ManualMethodForm({
  storeId, country, rail, methods, onRemove,
}: {
  storeId: string;
  country: string;
  rail: PayoutRail;
  methods: PayoutMethodRow[];
  onRemove: (id: string) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    label: "", account_holder_name: "", bank_name: "", account_number: "",
    aba_account_id: "", paypal_email: "", swift: "",
  });
  const ownMethods = methods.filter((m) => (m.rail || mapMethodTypeToRail(m.method_type)) === rail);

  const reset = () => { setForm({ label: "", account_holder_name: "", bank_name: "", account_number: "", aba_account_id: "", paypal_email: "", swift: "" }); setConfirmed(false); };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!confirmed) throw new Error("Please confirm the account details are correct");

      // Per-rail validation (eligibility + format)
      if (rail === "aba") {
        if (!form.aba_account_id.trim()) throw new Error("ABA account ID is required");
        if (!form.account_holder_name.trim()) throw new Error("Account holder name is required");
        if (!/^[0-9]{6,12}$/.test(form.aba_account_id.replace(/\s/g, ""))) throw new Error("ABA account ID should be 6–12 digits");
      }
      if (rail === "bank_wire") {
        if (!form.bank_name.trim() || !form.account_number.trim()) throw new Error("Bank name and account number are required");
        if (!form.account_holder_name.trim()) throw new Error("Account holder name is required");
        if (country !== "US" && !form.swift.trim()) throw new Error("SWIFT/BIC is required for international wires");
      }
      if (rail === "paypal" && !/.+@.+\..+/.test(form.paypal_email)) throw new Error("Valid PayPal email required");

      const method_type = rail === "aba" ? "aba" : rail === "paypal" ? "paypal" : "bank_transfer";
      const payload: Record<string, any> = {
        user_id: user.id,
        store_id: storeId,
        country_code: country,
        rail,
        method_type,
        label: form.label || defaultLabel(rail),
        account_holder_name: form.account_holder_name || null,
        bank_name: rail === "bank_wire" ? form.bank_name : (rail === "aba" ? "ABA Bank" : null),
        account_number: rail === "bank_wire" ? form.account_number : (rail === "paypal" ? form.paypal_email : null),
        aba_account_id: rail === "aba" ? form.aba_account_id : null,
        verification_status: "pending",
        verification_note: rail === "bank_wire" && form.swift ? `SWIFT/BIC: ${form.swift}` : null,
        is_default: methods.length === 0,
      };
      const { error } = await (supabase.from("customer_payout_methods") as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout method saved");
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["lodge-payout-methods", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not save"),
  });

  return (
    <div className="space-y-2">
      {ownMethods.length > 0 && (
        <ul className="space-y-1.5">
          {ownMethods.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-2.5 py-1.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                  {m.label || defaultLabel(rail)}
                  {m.verification_status === "verified" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 h-4 px-1 text-[9px]">Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">Pending verification</Badge>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {m.method_type === "aba" ? `ABA: ${m.aba_account_id}` : m.method_type === "paypal" ? m.account_number : `${m.bank_name || ""} ···${(m.account_number || "").slice(-4)}`}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onRemove(m.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add {rail === "aba" ? "ABA" : rail === "paypal" ? "PayPal" : "bank"} account
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border border-border bg-background/40 p-2.5">
          {rail !== "paypal" && (
            <FieldRow label="Account holder">
              <Input value={form.account_holder_name} onChange={(e) => setForm((f) => ({ ...f, account_holder_name: e.target.value }))} placeholder="Full legal name" />
            </FieldRow>
          )}
          {rail === "aba" && (
            <FieldRow label="ABA account ID / phone">
              <Input value={form.aba_account_id} onChange={(e) => setForm((f) => ({ ...f, aba_account_id: e.target.value }))} placeholder="e.g. 000123456" />
            </FieldRow>
          )}
          {rail === "bank_wire" && (
            <>
              <FieldRow label="Bank name">
                <Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. ACLEDA Bank" />
              </FieldRow>
              <FieldRow label="Account number / IBAN">
                <Input value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} placeholder="Account number or IBAN" />
              </FieldRow>
              {country !== "US" && (
                <FieldRow label="SWIFT / BIC">
                  <Input value={form.swift} onChange={(e) => setForm((f) => ({ ...f, swift: e.target.value }))} placeholder="e.g. ACLBKHPP" />
                </FieldRow>
              )}
            </>
          )}
          {rail === "paypal" && (
            <FieldRow label="PayPal email">
              <Input type="email" value={form.paypal_email} onChange={(e) => setForm((f) => ({ ...f, paypal_email: e.target.value }))} placeholder="payouts@example.com" />
            </FieldRow>
          )}
          <FieldRow label="Nickname (optional)">
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder={defaultLabel(rail)} />
          </FieldRow>

          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>I confirm these account details are correct and the holder name matches my ID. ZIVO will mark this method as verified after the first successful payout.</span>
          </label>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function defaultLabel(rail: PayoutRail): string {
  return rail === "aba" ? "ABA Account" : rail === "paypal" ? "PayPal" : "Bank Account";
}

function mapMethodTypeToRail(method_type: string): PayoutRail {
  if (method_type === "aba") return "aba";
  if (method_type === "paypal") return "paypal";
  return "bank_wire";
}
