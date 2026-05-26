/**
 * /connect/callback — post-OAuth picker page.
 * Lists FB Pages + linked IG accounts + ad accounts and lets the user
 * pick a default for the linked store.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Facebook, Instagram, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Building2 } from "lucide-react";

interface PageRow {
  id: string;
  account_id: string;
  platform: string;
  page_type: string;
  external_id: string;
  name: string | null;
  picture_url: string | null;
  is_default: boolean;
}

export default function ConnectCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const platform = params.get("platform");
  const accountId = params.get("account_id");
  const storeId = params.get("store_id");
  const error = params.get("error");

  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (error || !accountId) { setLoading(false); return; }
    (async () => {
      const { data, error: e } = await supabase
        .from("store_ad_pages" as any)
        .select("*")
        .eq("account_id", accountId)
        .order("page_type");
      if (e) toast.error(e.message);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [accountId, error]);

  const grouped = useMemo(() => {
    const g: Record<string, PageRow[]> = { fb_page: [], ig_account: [], ad_account: [] };
    rows.forEach((r) => { (g[r.page_type] ||= []).push(r); });
    return g;
  }, [rows]);

  const setDefault = async (row: PageRow) => {
    setSavingId(row.id);
    try {
      // Clear previous defaults of the same page_type
      await supabase
        .from("store_ad_pages" as any)
        .update({ is_default: false })
        .eq("account_id", row.account_id)
        .eq("page_type", row.page_type);
      const { error } = await supabase
        .from("store_ad_pages" as any)
        .update({ is_default: true })
        .eq("id", row.id);
      if (error) throw error;
      setRows((rs) => rs.map((r) => ({
        ...r,
        is_default: r.page_type === row.page_type ? r.id === row.id : r.is_default,
      })));
      toast.success(`Selected "${row.name}"`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const done = () => {
    if (storeId) navigate(`/admin/stores/${storeId}`);
    else navigate("/admin/stores");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
            <h1 className="text-xl font-bold">Connection failed</h1>
            <p className="text-sm text-muted-foreground">{decodeURIComponent(error)}</p>
            <Button onClick={done}>Back to ads</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const PlatformIcon = platform === "instagram" ? Instagram : Facebook;
  const platformColor = platform === "instagram" ? "text-[#E4405F]" : "text-[#1877F2]";

  const Section = ({
    title, icon: Icon, items, emptyHint,
  }: { title: string; icon: any; items: PageRow[]; emptyHint: string }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
          <Badge variant="outline" className="text-[10px] ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyHint}</p>
        ) : (
          items.map((row) => (
            <button type="button"
              key={row.id}
              onClick={() => setDefault(row)}
              disabled={savingId === row.id}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                row.is_default
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              {row.picture_url ? (
	                <img src={row.picture_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{row.name || row.external_id}</p>
                <p className="text-[11px] text-muted-foreground truncate">ID: {row.external_id}</p>
              </div>
              {row.is_default && <CheckCircle2 className="w-5 h-5 text-primary" />}
              {savingId === row.id && <Loader2 className="w-4 h-4 animate-spin" />}
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <PlatformIcon className={`w-8 h-8 ${platformColor}`} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Pick what to link</h1>
            <p className="text-sm text-muted-foreground">
              Select the Facebook Page, Instagram account, and ad account you want this store to use.
            </p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>

        <Section title="Facebook Pages" icon={Facebook} items={grouped.fb_page} emptyHint="No Pages found on this account." />
        <Section title="Instagram accounts" icon={Instagram} items={grouped.ig_account} emptyHint="No IG Business accounts linked to your Pages." />
        <Section title="Ad accounts" icon={Building2} items={grouped.ad_account} emptyHint="No ad accounts available." />

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={done}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={done} className="flex-1">Done</Button>
        </div>
      </div>
    </div>
  );
}
