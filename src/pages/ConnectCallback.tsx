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
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Building2 } from "lucide-react";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" />
    <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8z" />
    <circle cx="18.406" cy="5.594" r="1.44" />
  </svg>
);

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

  const PlatformIcon = platform === "instagram" ? InstagramIcon : FacebookIcon;
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

        <Section title="Facebook Pages" icon={FacebookIcon} items={grouped.fb_page} emptyHint="No Pages found on this account." />
        <Section title="Instagram accounts" icon={InstagramIcon} items={grouped.ig_account} emptyHint="No IG Business accounts linked to your Pages." />
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
