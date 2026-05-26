/**
 * ReferralsPage — Manage your invitation links.
 * Backed by the real `invitation_links` table (per-user, with use_count tracking).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gift, Plus, Copy, Trash2, Share2, X, Users, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkRow {
  id: string;
  code: string;
  link_type: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

function makeCode(): string {
  // 8-char URL-safe code: 4 letters + 4 digits, easy to share.
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
  const digits = "23456789"; // no 0, 1
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

function relativeExpiry(iso: string | null): { label: string; expired: boolean } {
  if (!iso) return { label: "Never expires", expired: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Expired", expired: true };
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return { label: "Expires today", expired: false };
  return { label: `${days}d left`, expired: false };
}

export default function ReferralsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState<string>("");
  const [duration, setDuration] = useState<"7d" | "30d" | "none">("30d");
  const [linkType, setLinkType] = useState<string>("referral");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["invitation-links", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LinkRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: LinkRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("invitation_links")
        .select("id, code, link_type, expires_at, max_uses, use_count, is_active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      const expires_at = duration === "none"
        ? null
        : new Date(Date.now() + (duration === "7d" ? 7 : 30) * 86400 * 1000).toISOString();
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const cleanedMax = maxUses.trim() ? Math.max(1, Math.floor(Number(maxUses))) : null;
      const { error } = await sb.from("invitation_links").insert({
        user_id: user.id,
        code: makeCode(),
        link_type: linkType,
        expires_at,
        max_uses: cleanedMax,
        use_count: 0,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Link created");
      qc.invalidateQueries({ queryKey: ["invitation-links", user?.id] });
      setCreating(false);
      setMaxUses("");
      setDuration("30d");
      setLinkType("referral");
    },
    onError: (e: Error) => toast.error(e.message || "Could not create"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("invitation_links").update({ is_active: !isActive }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitation-links", user?.id] }),
    onError: (e: Error) => toast.error(e.message || "Could not update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("invitation_links").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Link deleted");
      qc.invalidateQueries({ queryKey: ["invitation-links", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const stats = useMemo(() => {
    const totalUses = links.reduce((s, l) => s + (l.use_count ?? 0), 0);
    const active = links.filter((l) => l.is_active && !relativeExpiry(l.expires_at).expired).length;
    return { totalUses, active };
  }, [links]);

  const getShareUrl = (code: string) =>
    `${typeof window !== "undefined" ? window.location.origin : "https://hizivo.com"}/i/${code}`;

  const copy = async (text: string, label = "Link") => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error("Couldn't copy"); }
  };

  const share = async (l: LinkRow) => {
    const url = getShareUrl(l.code);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title: "Join me on ZIVO", url }); return; }
      catch { /* fall through to copy */ }
    }
    copy(url, "Share link");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Referrals · ZIVO" description="Invite friends with shareable links." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Referrals</h1>
          </div>
          {!creating && (
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
              New
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your invites</p>
          <p className="text-3xl font-bold mt-1">{stats.totalUses} {stats.totalUses === 1 ? "use" : "uses"}</p>
          <p className="text-sm text-white/80 mt-1">{stats.active} active link{stats.active === 1 ? "" : "s"}</p>
        </motion.div>

        {/* Create */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New referral link</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setCreating(false)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Duration</p>
                <div className="flex gap-2">
                  {(["7d", "30d", "none"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                        duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                      )}
                    >
                      {d === "none" ? "Never expires" : d.replace("d", " days")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Type</p>
                <input
                  type="text"
                  placeholder="referral, partner, beta…"
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value.slice(0, 30))}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Max uses (optional)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="No limit"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Creating…" : "Generate link"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && links.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No referral links yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Generate a shareable link to invite friends and partners.
            </p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Generate your first link
            </Button>
          </div>
        )}

        {!isLoading && links.length > 0 && (
          <div className="space-y-2">
            {links.map((l, idx) => {
              const exp = relativeExpiry(l.expires_at);
              const url = getShareUrl(l.code);
              const used = l.use_count ?? 0;
              const cap = l.max_uses ?? null;
              const exhausted = cap !== null && used >= cap;
              const inactive = !l.is_active || exp.expired || exhausted;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn("rounded-2xl bg-card border border-border p-3.5 space-y-3", inactive && "opacity-60")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                      inactive ? "bg-muted text-muted-foreground" : "bg-ig-gradient text-white",
                    )}>
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-bold text-foreground tracking-wider">{l.code}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="capitalize">{l.link_type ?? "referral"}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {used}{cap !== null ? `/${cap}` : ""} uses</span>
                        <span>·</span>
                        <span className={cn("inline-flex items-center gap-0.5", exp.expired && "text-destructive")}><Clock className="h-2.5 w-2.5" /> {exp.label}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copy(url)}
                      className="flex-1 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => share(l)}
                      className="flex-1 h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 hover:opacity-90 transition-all"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                    <button
                      type="button"
                      aria-label={l.is_active ? "Deactivate" : "Reactivate"}
                      onClick={() => toggleMutation.mutate({ id: l.id, isActive: !!l.is_active })}
                      className={cn(
                        "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center active:scale-95 transition-all",
                        l.is_active ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white",
                      )}
                    >
                      {l.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete link"
                      onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(l.id); }}
                      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
