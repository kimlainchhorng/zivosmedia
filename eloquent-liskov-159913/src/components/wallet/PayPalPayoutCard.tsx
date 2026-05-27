/**
 * PayPalPayoutCard — Cash out wallet balance directly to a PayPal email.
 * Available globally (including Cambodia, Vietnam, Laos, Myanmar — markets Stripe Connect doesn't support).
 */
import { useEffect, useState } from "react";
import { Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePayPalPayout, useSavePayPalEmail } from "@/hooks/usePayPalPayout";

interface Props {
  balanceDollars: number;
}

export default function PayPalPayoutCard({ balanceDollars }: Props) {
  const { user } = useAuth();
  const payout = usePayPalPayout();
  const saveEmail = useSavePayPalEmail();
  const [amount, setAmount] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: creator, isLoading } = useQuery({
    queryKey: ["creator-profile-paypal", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("creator_profiles")
        .select("payout_details, payout_method")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const savedEmail: string | undefined = creator?.payout_details?.paypal_email;

  useEffect(() => {
    if (savedEmail && !emailDraft) setEmailDraft(savedEmail);
  }, [savedEmail, emailDraft]);

  const amountNum = Number(amount) || 0;
  const canPayout =
    !!savedEmail &&
    amountNum >= 1 &&
    amountNum <= balanceDollars &&
    !payout.isPending;

  if (isLoading) return <div className="h-32 bg-muted/30 rounded-2xl animate-pulse" />;

  // No PayPal email saved — show setup
  if (!savedEmail || editing) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft);
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-[#003087] to-[#009cde] text-white p-5 shadow-lg shadow-[#003087]/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">PayPal Payouts</span>
        </div>
        <h3 className="text-lg font-bold mb-1">Cash out to PayPal</h3>
        <p className="text-sm text-white/80 mb-4 leading-relaxed">
          Get paid directly to your PayPal account — works globally, arrives in minutes.
        </p>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="your@paypal.com"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            className="h-11 rounded-xl bg-white/10 border-white/30 text-white placeholder:text-white/50"
          />
          <div className="flex gap-2">
            {editing && (
              <Button
                variant="ghost"
                onClick={() => { setEditing(false); setEmailDraft(savedEmail || ""); }}
                className="flex-1 h-11 rounded-xl text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={async () => {
                if (!user || !valid) return;
                await saveEmail.mutateAsync({ userId: user.id, paypal_email: emailDraft.trim() });
                setEditing(false);
              }}
              disabled={!valid || saveEmail.isPending}
              className="flex-1 h-11 rounded-xl bg-white text-[#003087] hover:bg-white/90 font-bold gap-2"
            >
              {saveEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Save PayPal email
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Saved — show payout form
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-[#003087] to-[#009cde] text-white p-4 shadow-lg shadow-[#003087]/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">PayPal Connected</p>
              <p className="text-sm font-semibold truncate">{savedEmail}</p>
            </div>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="text-[11px] underline opacity-80 hover:opacity-100 shrink-0">
            Change
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <div className="flex gap-2 flex-wrap mb-2">
          {[5, 25, 50, 100].filter((a) => a <= balanceDollars).map((amt) => (
            <button type="button"
              key={amt}
              onClick={() => setAmount(String(amt))}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold ${
                amount === String(amt) ? "bg-[#003087] text-white" : "bg-muted/50 border border-border/40"
              }`}
            >
              ${amt}
            </button>
          ))}
          {balanceDollars >= 1 && (
            <button type="button"
              onClick={() => setAmount(balanceDollars.toFixed(2))}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold ${
                amount === balanceDollars.toFixed(2) ? "bg-[#003087] text-white" : "bg-muted/50 border border-border/40"
              }`}
            >
              All
            </button>
          )}
        </div>
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl h-11"
          min="1"
          max={balanceDollars}
        />
      </div>

      <Button
        onClick={() => payout.mutate({ amount_cents: Math.round(amountNum * 100), paypal_email: savedEmail })}
        disabled={!canPayout}
        className="w-full h-12 rounded-2xl font-bold gap-2 bg-[#003087] hover:bg-[#001f5c] text-white"
      >
        {payout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        {payout.isPending ? "Sending…" : `Send $${amountNum.toFixed(2)} to PayPal`}
      </Button>

      <p className="text-[10px] text-muted-foreground/70 text-center">
        Funds arrive in your PayPal account within minutes. PayPal fees may apply on their side.
      </p>
    </motion.div>
  );
}
