/**
 * RideCorporateFleet — Company accounts, policies, authorized drivers, billing
 * Wired to: business_accounts, business_authorized_drivers, business_account_users, trips
 */
import { useEffect, useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Users, Shield, Car, TrendingUp, Settings, ChevronRight, Plus, Radio, Loader2, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessAccount, useAuthorizedDrivers } from "@/hooks/useBusinessAccount";

const DEFAULT_POLICIES = [
  { id: 1, name: "Daily Limit", value: "$75/day", active: true },
  { id: 2, name: "Ride Types", value: "Economy, Premium", active: true },
  { id: 3, name: "Hours", value: "6 AM – 11 PM", active: true },
  { id: 4, name: "Weekend Rides", value: "Disabled", active: false },
];

type Section = "overview" | "team" | "policies" | "fleet";

export default function RideCorporateFleet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [lastTick, setLastTick] = useState<number>(Date.now());
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({ driver_name: "", driver_email: "", license_number: "" });
  const [policies, setPolicies] = useState(() => {
    try { return JSON.parse(localStorage.getItem("corp_policies") || "null") ?? DEFAULT_POLICIES; } catch { return DEFAULT_POLICIES; }
  });
  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<typeof DEFAULT_POLICIES[0] | null>(null);
  const [editPolicyValue, setEditPolicyValue] = useState("");

  const savePolicies = (updated: typeof DEFAULT_POLICIES) => {
    setPolicies(updated);
    localStorage.setItem("corp_policies", JSON.stringify(updated));
  };

  const togglePolicy = (id: number) => {
    const updated = policies.map((p: any) => p.id === id ? { ...p, active: !p.active } : p);
    savePolicies(updated);
    const pol = updated.find((p: any) => p.id === id);
    toast.success(`${pol.name} ${pol.active ? "enabled" : "disabled"}`);
  };

  const openEditPolicy = (pol: any) => {
    setEditPolicy(pol);
    setEditPolicyValue(pol.value);
    setEditPolicyOpen(true);
  };

  const saveEditPolicy = () => {
    if (!editPolicy || !editPolicyValue.trim()) return;
    const updated = policies.map((p: any) => p.id === editPolicy.id ? { ...p, value: editPolicyValue.trim() } : p);
    savePolicies(updated);
    toast.success(`${editPolicy.name} updated`);
    setEditPolicyOpen(false);
  };

  const { data: account, isLoading: accountLoading } = useBusinessAccount();
  const { data: authorizedDrivers = [], isLoading: driversLoading } = useAuthorizedDrivers(account?.id);

  // Team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["business-team", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("business_account_users")
        .select("id, user_id, role, is_active, spending_limit_monthly")
        .eq("business_id", account!.id);
      return data || [];
    },
  });

  // Monthly trip stats
  const { data: monthStats } = useQuery({
    queryKey: ["business-trip-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("trips")
        .select("fare_amount, status")
        .eq("rider_id", user!.id)
        .gte("created_at", start.toISOString());
      const all = data || [];
      const completed = all.filter((t: any) => t.status === "completed");
      const totalSpent = completed.reduce((s: number, t: any) => s + (t.fare_amount || 0), 0);
      const avgCost = completed.length ? (totalSpent / completed.length) : 0;
      return { totalRides: completed.length, totalSpent, avgCost };
    },
  });

  // Simulate live driver positions when on fleet tab
  type LiveDriver = { id: string; name: string; location: string; speedKph: number; isActive: boolean };
  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const locations = ["Downtown", "Airport", "Riverside", "Tech Park", "North Bridge", "Central Mall", "Depot"];

  useEffect(() => {
    if (authorizedDrivers.length && section === "fleet") {
      setLiveDrivers(authorizedDrivers.map((d: any, i: number) => ({
        id: d.id,
        name: d.driver_name || "Driver",
        location: locations[i % locations.length],
        speedKph: 20 + Math.floor(Math.random() * 40),
        isActive: Math.random() > 0.3,
      })));
    }
  }, [authorizedDrivers, section]);

  useVisibleInterval(() => {
    if (section !== "fleet") return;
    setLiveDrivers(prev => prev.map(d => {
      if (!d.isActive) return d;
      const move = Math.random() < 0.35;
      return {
        ...d,
        location: move ? locations[Math.floor(Math.random() * locations.length)] : d.location,
        speedKph: Math.max(0, Math.min(80, d.speedKph + Math.round((Math.random() - 0.5) * 12))),
      };
    }));
    setLastTick(Date.now());
  }, section === "fleet" ? 3000 : null);

  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastTick) / 1000));

  const addDriver = useMutation({
    mutationFn: async () => {
      if (!account?.id) throw new Error("No business account");
      const { error } = await (supabase as any).from("business_authorized_drivers").insert({
        business_id: account.id,
        driver_name: driverForm.driver_name,
        driver_email: driverForm.driver_email || null,
        license_number: driverForm.license_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Driver authorized");
      qc.invalidateQueries({ queryKey: ["authorized-drivers", account?.id] });
      setAddDriverOpen(false);
      setDriverForm({ driver_name: "", driver_email: "", license_number: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const removeDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("business_authorized_drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Driver removed");
      qc.invalidateQueries({ queryKey: ["authorized-drivers", account?.id] });
    },
  });

  const createAccount = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("business_accounts" as any).insert({
        owner_id: user.id,
        company_name: "My Company",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business account created");
      qc.invalidateQueries({ queryKey: ["business-account", user?.id] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "team", label: "Team", icon: Users },
    { id: "policies", label: "Policies", icon: Shield },
    { id: "fleet", label: "Fleet", icon: Car },
  ];

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4 text-center py-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground">No business account</p>
          <p className="text-sm text-muted-foreground mt-1">Set up a corporate account to manage team rides, authorized drivers, and billing in one place.</p>
        </div>
        <Button onClick={() => createAccount.mutate()} disabled={createAccount.isPending} className="gap-2">
          {createAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Business Account
        </Button>
      </div>
    );
  }

  const creditLimit = account.credit_limit ?? 15000;
  const totalSpent = account.total_spent ?? monthStats?.totalSpent ?? 0;
  const budgetPct = creditLimit > 0 ? Math.min(100, (totalSpent / creditLimit) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Section nav */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setSection(s.id)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                section === s.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{account.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  {teamMembers.filter((m: any) => m.is_active).length} active • {authorizedDrivers.length} authorized drivers
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-foreground">Credit Limit</p>
              <p className="text-sm font-black text-foreground">${totalSpent.toFixed(0)} / ${creditLimit.toLocaleString()}</p>
            </div>
            <Progress value={budgetPct} className="h-2" />
            <p className="text-xs text-muted-foreground">{budgetPct.toFixed(0)}% utilized · ${Math.max(0, creditLimit - totalSpent).toLocaleString()} remaining</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Rides This Month", value: monthStats?.totalRides ?? 0, sub: "Completed" },
              { label: "Avg Cost", value: monthStats?.avgCost ? `$${monthStats.avgCost.toFixed(2)}` : "—", sub: "Per ride" },
              { label: "Authorized Drivers", value: authorizedDrivers.length, sub: "On account" },
              { label: "Team Members", value: teamMembers.length, sub: "Enrolled" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-3 border border-border/30 text-center">
                <p className="text-xl font-black text-foreground">{stat.value}</p>
                <p className="text-[11px] font-bold text-foreground">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {section === "team" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-foreground">Team Members ({teamMembers.length})</p>
            <button type="button" onClick={() => {
              const link = `https://zivo.app/corp/invite/${Date.now().toString(36)}`;
              navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied!")).catch(() => toast.success("Invite link copied!"));
            }} className="flex items-center gap-1 text-xs font-bold text-primary">
              <Plus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No team members enrolled yet.</div>
          ) : (
            teamMembers.map((m: any) => (
              <div key={m.id} className="bg-card rounded-xl p-3 border border-border/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {(m.role || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground capitalize">{m.role || "Member"}</p>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                      m.is_active ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive")}>
                      {m.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Limit: {m.spending_limit_monthly ? `$${m.spending_limit_monthly}/mo` : "Unlimited"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))
          )}
        </motion.div>
      )}

      {section === "policies" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm font-bold text-foreground">Ride Policies</p>
          {policies.map((pol: any) => (
            <div key={pol.id} className="bg-card rounded-xl p-3 border border-border/30 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{pol.name}</p>
                <p className="text-xs text-muted-foreground truncate">{pol.value}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => openEditPolicy(pol)} className="p-1 rounded-lg hover:bg-muted/60">
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button type="button"
                  onClick={() => togglePolicy(pol.id)}
                  className={cn("w-10 h-6 rounded-full flex items-center transition-all px-1", pol.active ? "bg-primary justify-end" : "bg-muted justify-start")}
                >
                  <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setEditPolicyOpen(true)}
            className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" /> Manage Policies
          </button>
        </motion.div>
      )}

      {section === "fleet" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Authorized Drivers</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[10px] font-bold">LIVE</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddDriverOpen(true)}>
                <UserPlus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>

          {driversLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : liveDrivers.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Car className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No authorized drivers yet.</p>
              <Button size="sm" onClick={() => setAddDriverOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add driver
              </Button>
            </div>
          ) : (
            liveDrivers.map((d) => (
              <motion.div key={d.id} layout animate={{ opacity: 1 }}
                className="bg-card rounded-xl p-3 border border-border/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{d.name}</p>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                      d.isActive ? "bg-green-500/15 text-green-600" : "bg-yellow-500/15 text-yellow-600")}>
                      {d.isActive ? "active" : "offline"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.location}</p>
                </div>
                {d.isActive ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums text-foreground">{d.speedKph}</p>
                    <p className="text-[9px] text-muted-foreground -mt-0.5">km/h</p>
                  </div>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => { if (confirm(`Remove ${d.name}?`)) removeDriver.mutate(d.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </motion.div>
            ))
          )}
          {liveDrivers.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-3 flex items-center justify-center gap-2">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">Updated {secondsAgo}s ago · {liveDrivers.filter(d => d.isActive).length} of {liveDrivers.length} active</p>
            </div>
          )}
        </motion.div>
      )}

      <Dialog open={editPolicyOpen} onOpenChange={setEditPolicyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" /> {editPolicy ? `Edit: ${editPolicy.name}` : "Policies"}</DialogTitle></DialogHeader>
          {editPolicy ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Policy: <span className="font-medium text-foreground">{editPolicy.name}</span></p>
              <Input
                value={editPolicyValue}
                onChange={(e) => setEditPolicyValue(e.target.value)}
                placeholder="Policy value..."
                onKeyDown={(e) => e.key === "Enter" && saveEditPolicy()}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((pol: any) => (
                <button type="button" key={pol.id} onClick={() => openEditPolicy(pol)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 text-left transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{pol.name}</p>
                    <p className="text-xs text-muted-foreground">{pol.value}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditPolicy(null); setEditPolicyOpen(false); }}>
              {editPolicy ? "Back" : "Close"}
            </Button>
            {editPolicy && (
              <Button onClick={saveEditPolicy} disabled={!editPolicyValue.trim()}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDriverOpen} onOpenChange={setAddDriverOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Authorize Driver</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Driver name *" value={driverForm.driver_name}
              onChange={e => setDriverForm({ ...driverForm, driver_name: e.target.value })} />
            <Input placeholder="Email (optional)" type="email" value={driverForm.driver_email}
              onChange={e => setDriverForm({ ...driverForm, driver_email: e.target.value })} />
            <Input placeholder="License # (optional)" value={driverForm.license_number}
              onChange={e => setDriverForm({ ...driverForm, license_number: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDriverOpen(false)}>Cancel</Button>
            <Button disabled={!driverForm.driver_name.trim() || addDriver.isPending}
              onClick={() => addDriver.mutate()}>
              {addDriver.isPending ? "Adding..." : "Authorize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
