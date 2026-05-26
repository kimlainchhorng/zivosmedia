/**
 * BusinessAccountPage — Corporate/business renter account info.
 * Backed by `business_renter_accounts` (orphan).
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building, Sparkles, Briefcase, FileCheck, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BizRow {
  id: string;
  user_id: string;
  company_name: string;
  company_size: string | null;
  industry: string | null;
  tax_id: string | null;
  business_email: string | null;
  verified_at: string | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function BusinessAccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: account, isLoading } = useQuery({
    queryKey: ["business-account-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: BizRow | null }> } } } };
      const { data } = await sb.from("business_renter_accounts").select("id, user_id, company_name, company_size, industry, tax_id, business_email, verified_at, created_at").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Business Account · ZIVO" description="Corporate renter account." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Building className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Business Account</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Corporate access</p>
          <p className="text-2xl font-extrabold mt-1 line-clamp-1">{account?.company_name ?? "Not set up"}</p>
          {account?.verified_at && <p className="text-sm text-white/85 mt-1 inline-flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> Verified {formatDate(account.verified_at)}</p>}
        </motion.div>
        {isLoading && <div className="h-40 bg-muted animate-pulse rounded-2xl" />}
        {!isLoading && !account && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Building className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No business account</p>
            <p className="text-xs text-muted-foreground mb-4">Apply for a business account to unlock corporate rates, priority support, and centralized billing.</p>
            <Button onClick={() => navigate("/business-account/setup")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">Apply</Button>
          </div>
        )}
        {!isLoading && account && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Briefcase className="h-4 w-4 text-ig-gradient" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Industry</p>
                <p className="text-sm font-bold text-foreground capitalize">{account.industry ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Building className="h-4 w-4 text-ig-gradient" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company size</p>
                <p className="text-sm font-bold text-foreground">{account.company_size ?? "—"}</p>
              </div>
            </div>
            {account.business_email && (
              <div className="flex items-center gap-3">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Mail className="h-4 w-4 text-ig-gradient" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business email</p>
                  <p className="text-sm font-bold text-foreground line-clamp-1">{account.business_email}</p>
                </div>
              </div>
            )}
            {account.tax_id && (
              <div className="flex items-center gap-3">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><FileCheck className="h-4 w-4 text-ig-gradient" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tax ID</p>
                  <p className="text-sm font-bold text-foreground font-mono">{account.tax_id}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2 border-t border-border/60">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-secondary flex items-center justify-center"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account created</p>
                <p className="text-sm font-bold text-foreground">{formatDate(account.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
