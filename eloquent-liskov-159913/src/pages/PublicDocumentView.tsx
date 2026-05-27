/**
 * Public document view — opens via /d/:token.
 * Uses the get_shared_document RPC (security definer) to fetch the document
 * without exposing the underlying tables to anonymous users.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, Printer, AlertTriangle } from "lucide-react";
import { generateDocumentPdf, downloadPdf, type PdfDoc } from "@/lib/admin/invoicePdf";

type Resolved = {
  doc_type: "invoice" | "estimate";
  doc: any;
  store_id: string;
  expires_at: string;
} | null;

export default function PublicDocumentView() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Resolved>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [storeAddr, setStoreAddr] = useState<string>("");
  const [storePhone, setStorePhone] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data: rpc, error } = await supabase.rpc("get_shared_document" as any, { _token: token });
      if (error || !rpc) { setNotFound(true); setLoading(false); return; }
      setData(rpc as Resolved);
      const sid = (rpc as any).store_id;
      if (sid) {
        const { data: store } = await supabase
          .from("store_profiles")
          .select("name, address, phone")
          .eq("id", sid)
          .maybeSingle();
        if (store) {
          setStoreName(store.name || "");
          setStoreAddr(store.address || "");
          setStorePhone(store.phone || "");
        }
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8 space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h1 className="text-lg font-semibold">Link unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This share link has expired or been revoked. Please ask the shop to send a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = data.doc;
  const items = Array.isArray(d.items) ? d.items : Array.isArray(d.line_items) ? d.line_items : [];
  const totalCents: number = d.total_cents ?? 0;

  const lineAmount = (i: any) => {
    const gross =
      i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
      i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
      (i.price ?? 0);
    const disc = Math.max(0, i.discount ?? 0);
    if ((i.discountType ?? "pct") === "amt") return Math.max(0, gross - disc);
    return gross * (1 - Math.min(100, disc) / 100);
  };

  const handleDownload = () => {
    const pdfDoc: PdfDoc = {
      type: data.doc_type,
      number: d.number || "",
      customer: d.customer_name || "",
      phone: d.customer_phone || undefined,
      email: d.customer_email || undefined,
      address: d.customer_address || undefined,
      vehicle: d.vehicle_label || undefined,
      vin: d.vin || undefined,
      items,
      status: d.status || "sent",
      createdAt: d.created_at,
      customerNotes: d.notes || d.customer_notes,
    };
    const blob = generateDocumentPdf({ doc: pdfDoc, storeName, storeAddress: storeAddr, storePhone });
    downloadPdf(blob, `${data.doc_type}-${d.number}.pdf`);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{storeName || "Auto Repair"}</h1>
                {storeAddr && <p className="text-xs text-muted-foreground">{storeAddr}</p>}
                {storePhone && <p className="text-xs text-muted-foreground">{storePhone}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold uppercase tracking-wide">
                  {data.doc_type}
                </h2>
                <p className="text-sm text-muted-foreground">#{d.number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Bill To</p>
                <p className="font-semibold text-sm">{d.customer_name || "—"}</p>
                {d.customer_phone && <p className="text-xs text-muted-foreground">{d.customer_phone}</p>}
                {d.customer_email && <p className="text-xs text-muted-foreground">{d.customer_email}</p>}
                {d.customer_address && <p className="text-xs text-muted-foreground">{d.customer_address}</p>}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Vehicle</p>
                <p className="font-semibold text-sm">{d.vehicle_label || "—"}</p>
                {d.vin && <p className="text-xs text-muted-foreground">VIN: {d.vin}</p>}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2">Description</th>
                    <th className="text-right py-2 px-2">Qty/Hrs</th>
                    <th className="text-right py-2 px-2">Rate</th>
                    <th className="text-right py-2 pl-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 pr-2">
                        <p className="font-medium">{i.description || "—"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{i.category}</p>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {i.category === "labor" ? `${i.hours ?? 0} hr` : i.qty ?? 1}
                      </td>
                      <td className="py-2 px-2 text-right">${(i.price ?? 0).toFixed(2)}</td>
                      <td className="py-2 pl-2 text-right font-medium">${lineAmount(i).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-64 space-y-1.5">
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {(d.notes || d.customer_notes) && (
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{d.notes || d.customer_notes}</p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center pt-4 border-t border-border flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" /> This document was shared securely.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
