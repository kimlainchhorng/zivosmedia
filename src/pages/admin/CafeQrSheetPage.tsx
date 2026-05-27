/**
 * Printable QR sheet at /admin/cafe-qr-sheet/:storeId. Renders every active
 * table's QR code in a grid sized to A4 so owners can print one page and
 * stick QRs on every table. Auto-prints on load.
 *
 * Auth: relies on RLS — only the owner can list their store's tables, so
 * unauthenticated visits return empty.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StoreLite { id: string; name: string; slug: string }
interface TableRow { id: string; label: string; qr_token: string }

const buildQrUrl = (storeSlug: string, token: string) =>
  `${window.location.origin}/cafe/${encodeURIComponent(storeSlug)}?t=${encodeURIComponent(token)}`;

const qrImage = (data: string, size = 320) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

export default function CafeQrSheetPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const [store, setStore] = useState<StoreLite | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [storeRes, tableRes] = await Promise.all([
        supabase.from("store_profiles").select("id,name,slug").eq("id", storeId).maybeSingle(),
        supabase.from("cafe_tables" as never)
          .select("id, label, qr_token")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("label"),
      ]);
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) { setError("Store not found."); setLoading(false); return; }
      setStore(storeRes.data as StoreLite);
      setTables((tableRes.data ?? []) as unknown as TableRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  // Auto-print once content is ready. Delay so the QR images have a moment
  // to fetch — otherwise the print preview comes out empty.
  useEffect(() => {
    if (loading || error || tables.length === 0) return;
    const t = setTimeout(() => { try { window.print(); } catch { /* noop */ } }, 1500);
    return () => clearTimeout(t);
  }, [loading, error, tables.length]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (error || !store) {
    return <div className="min-h-screen grid place-items-center text-destructive">{error ?? "Store unavailable."}</div>;
  }
  if (tables.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-center p-6">
        No active tables yet. Add tables in the Tables tab first.
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen p-6 print:p-3">
      <Helmet><title>{store.name} · Table QR sheet</title></Helmet>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">Scan to order · {tables.length} table{tables.length === 1 ? "" : "s"}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {tables.map((t) => (
            <div key={t.id} className="border border-gray-300 rounded-lg p-3 flex flex-col items-center break-inside-avoid">
              <p className="text-xs uppercase tracking-wider text-gray-500">Table</p>
              <p className="text-2xl font-bold mb-2">{t.label}</p>
              <img
                src={qrImage(buildQrUrl(store.slug, t.qr_token), 320)}
                alt={`QR for table ${t.label}`}
                className="w-40 h-40"
              />
              <p className="mt-2 text-[10px] text-gray-500 text-center">
                Scan to order at this table
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center no-print">
          <button onClick={() => window.print()} className="text-sm underline">Print again</button>
        </div>
      </div>
    </div>
  );
}
