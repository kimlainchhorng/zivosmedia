import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Store, Phone, MapPin, Clock, Globe, Save, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";

export default function ShopSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, description, phone, address, hours, slug, is_active")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");

  useEffect(() => {
    if (store) {
      setName(store.name ?? "");
      setDescription(store.description ?? "");
      setPhone(store.phone ?? "");
      setAddress(store.address ?? "");
      setHours(store.hours ?? "");
    }
  }, [store]);

  const save = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("No store found");
      const { error } = await supabase
        .from("store_profiles")
        .update({ name, description, phone, address, hours })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Settings saved!");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!store) {
    return (
      <AppLayout>
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Store className="h-14 w-14 text-muted-foreground/30" />
          <p className="font-semibold">No store found</p>
          <p className="text-sm text-muted-foreground">You don't have a store linked to your account yet.</p>
          <Button onClick={() => navigate("/shop-dashboard")}>Go to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-dvh bg-background pb-24">
        <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => navigate("/shop-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold flex-1">Shop Settings</h1>
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()} className="gap-1.5">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Store info */}
          <div className="space-y-4 rounded-2xl bg-card border border-border/40 p-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" /> Store Info
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Store Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Store" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What do you sell?" className="min-h-[80px]" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 rounded-2xl bg-card border border-border/40 p-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Contact & Location
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Address</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Business Hours</label>
                <Input value={hours} onChange={e => setHours(e.target.value)} placeholder="Mon–Fri 9am–6pm" />
              </div>
            </div>
          </div>

          {/* Store URL */}
          <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Store URL
            </h2>
            <p className="text-sm text-muted-foreground font-mono break-all">
              zivo.app/s/{store.slug}
            </p>
          </div>

          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
