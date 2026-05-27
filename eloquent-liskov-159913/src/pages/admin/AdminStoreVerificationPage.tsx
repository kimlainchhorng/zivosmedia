import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Loader2, Store, CheckCircle2, XCircle, Search,
  Clock, ShieldCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  grocery: "Grocery",
  restaurant: "Restaurant",
  cafe: "Cafe",
  pharmacy: "Pharmacy",
  electronics: "Electronics",
  fashion: "Fashion",
  lodging: "Lodging",
  beauty: "Beauty",
  health: "Health",
  pet: "Pet",
  sports: "Sports",
  other: "Other",
};

export default function AdminStoreVerificationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"pending" | "verified" | "all">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-store-verification", tab],
    queryFn: async () => {
      let baseQ = (supabase as any)
        .from("store_profiles")
        .select("*, profiles(email, full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(300);

      if (tab === "pending") {
        baseQ = baseQ.or("is_verified.is.null,is_verified.eq.false");
      } else if (tab === "verified") {
        baseQ = baseQ.eq("is_verified", true);
      }

      const { data, error } = await baseQ;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = search.trim()
    ? stores.filter((s: any) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.slug?.toLowerCase().includes(search.toLowerCase()) ||
        (s.profiles as any)?.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase())
      )
    : stores;

  const stats = {
    pending: stores.filter((s: any) => !s.is_verified).length,
    verified: stores.filter((s: any) => s.is_verified).length,
    today: stores.filter((s: any) => {
      const d = new Date(s.created_at);
      return d.toDateString() === new Date().toDateString();
    }).length,
  };

  const approve = async (id: string) => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from("store_profiles")
        .update({
          is_verified: true,
          is_active: true,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Store approved & verified");
      qc.invalidateQueries({ queryKey: ["admin-store-verification"] });
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from("store_profiles")
        .update({ is_active: false, is_verified: false } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Store rejected");
      qc.invalidateQueries({ queryKey: ["admin-store-verification"] });
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    } finally {
      setActingId(null);
    }
  };

  const getStatusBadge = (store: any) => {
    if (store.is_verified) {
      return <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>;
    }
    if (store.is_active === false) {
      return <Badge className="bg-red-500/15 text-red-600 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    }
    return <Badge className="bg-amber-500/15 text-amber-600 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  return (
    <AdminLayout title="Store Verification">
      <div className="space-y-6 max-w-6xl">
        <div>
          <h2 className="text-2xl font-bold">Store Verification</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve new merchant store applications.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending Review", value: stats.pending, icon: AlertCircle, color: "text-amber-600" },
            { label: "Verified", value: stats.verified, icon: ShieldCheck, color: "text-emerald-600" },
            { label: "New Today", value: stats.today, icon: Store, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending {stats.pending > 0 && <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5">{stats.pending}</span>}
              </TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store name, email, category…"
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Store list */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {tab === "pending" ? "No stores pending review" : "No stores found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((store: any) => {
                const profile = store.profiles as any;
                const busy = actingId === store.id;
                return (
                  <div
                    key={store.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                  >
                    {/* Logo */}
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 cursor-pointer"
                      onClick={() => setSelected(store)}
                    >
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelected(store)}
                    >
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm">{store.name || "Unnamed Store"}</span>
                        {getStatusBadge(store)}
                        <Badge variant="outline" className="text-xs capitalize">
                          {CATEGORY_LABELS[store.category] || store.category || "Other"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {profile?.email && <span>{profile.email}</span>}
                        {store.address && <span>{store.address}</span>}
                        <span>/{store.slug}</span>
                        <span>{new Date(store.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!store.is_verified && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => approve(store.id)}
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => reject(store.id)}
                          className="gap-1 text-red-500 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                    {store.is_verified && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 shrink-0">Approved</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Store Details</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                  {selected.logo_url ? (
                    <img src={selected.logo_url} alt={selected.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selected.name || "Unnamed Store"}</h3>
                  <p className="text-sm text-muted-foreground">/{selected.slug}</p>
                  {getStatusBadge(selected)}
                </div>
              </div>

              <Card>
                <CardContent className="pt-4 pb-3 space-y-2 text-sm">
                  {[
                    ["Category", CATEGORY_LABELS[selected.category] || selected.category],
                    ["Market", selected.market],
                    ["Address", selected.address],
                    ["Phone", selected.phone],
                    ["Hours", selected.hours ? "Set" : "Not set"],
                    ["Owner email", (selected.profiles as any)?.email],
                    ["Owner name", (selected.profiles as any)?.full_name],
                    ["Created", new Date(selected.created_at).toLocaleString()],
                    ["Verified at", selected.verified_at ? new Date(selected.verified_at).toLocaleString() : "—"],
                    ["Active", selected.is_active ? "Yes" : "No"],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">{k}</span>
                        <span className="text-right truncate">{v}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {selected.description && (
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selected.description}</p>
                  </CardContent>
                </Card>
              )}

              {!selected.is_verified && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={actingId === selected.id}
                    onClick={() => approve(selected.id)}
                  >
                    {actingId === selected.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Store
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-red-500 border-red-300 hover:bg-red-50"
                    disabled={actingId === selected.id}
                    onClick={() => reject(selected.id)}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
