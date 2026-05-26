/**
 * TenantMembershipsPage — Organizations / tenants you belong to.
 * Backed by `tenant_memberships` joined w/ `tenants`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Sparkles, Clock, Crown, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MembershipRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
}

interface TenantRow { id: string; name: string | null; slug: string | null; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000 * 30) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function TenantMembershipsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["tenant-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MembershipRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: MembershipRow[] | null }> } } } };
      const { data } = await sb.from("tenant_memberships").select("id, tenant_id, user_id, role, is_active, invited_by, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const tenantIds = useMemo(() => Array.from(new Set(memberships.map((m) => m.tenant_id))), [memberships]);

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-meta", tenantIds.join(",")],
    queryFn: async () => {
      if (tenantIds.length === 0) return [] as TenantRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: TenantRow[] | null }> } } };
      const { data } = await sb.from("tenants").select("id, name, slug").in("id", tenantIds);
      return data ?? [];
    },
    enabled: tenantIds.length > 0,
    staleTime: 120_000,
  });

  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t])), [tenants]);

  const stats = useMemo(() => ({
    total: memberships.length,
    active: memberships.filter((m) => m.is_active).length,
    admin: memberships.filter((m) => m.role === "admin" || m.role === "owner").length,
  }), [memberships]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Organizations · ZIVO" description="Tenants you belong to." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Building2 className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Organizations</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Memberships</p>
          <p className="text-3xl font-bold mt-1">{stats.active}</p>
          <p className="text-sm text-white/80 mt-1">{stats.admin} admin · {stats.total - stats.active} inactive</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && memberships.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Building2 className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No organizations</p>
            <p className="text-xs text-muted-foreground">When you join an org or workspace, it'll show up here.</p>
          </div>
        )}
        {!isLoading && memberships.length > 0 && (
          <div className="space-y-2">
            {memberships.map((m, idx) => {
              const t = tenantMap.get(m.tenant_id);
              const isAdmin = m.role === "admin" || m.role === "owner";
              return (
                <motion.button key={m.id} type="button" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} onClick={() => t?.slug && navigate(`/org/${t.slug}`)} className={cn("w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left", !m.is_active && "opacity-60")}>
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-ig-gradient" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{t?.name ?? "Organization"}</p>
                      {isAdmin && <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full"><Crown className="h-2.5 w-2.5" />{m.role}</span>}
                      {!isAdmin && <span className="text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{m.role}</span>}
                      {!m.is_active && <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> Joined {formatRelative(m.created_at)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
