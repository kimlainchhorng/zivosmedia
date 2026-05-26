/**
 * Auto Repair — Document Preview Dialog
 * Print-ready preview with Print / Email / SMS share actions.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Mail, MessageSquare, Download, X } from "lucide-react";
import { toast } from "sonner";

type LineCategory = "labor" | "part" | "diagnosis";
export type PreviewLineItem = {
  id: string;
  category: LineCategory;
  description: string;
  qty: number;
  price: number;
  hours?: number;
  discount?: number;
  discountType?: "pct" | "amt";
};
export type PreviewDoc = {
  id: string;
  type: "estimate" | "invoice";
  number: string;
  customer: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  vin: string;
  vehicle: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  driveType: string;
  items: PreviewLineItem[];
  status: string;
  createdAt: string;
};

const lineAmount = (i: PreviewLineItem): number => {
  const gross =
    i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
    i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
    (i.price ?? 0);
  const discVal = Math.max(0, i.discount ?? 0);
  if ((i.discountType ?? "pct") === "amt") return Math.max(0, gross - discVal);
  return gross * (1 - Math.min(100, discVal) / 100);
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: PreviewDoc | null;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export default function AutoRepairDocPreviewDialog({ open, onOpenChange, doc, storeName, storeAddress, storePhone }: Props) {
  if (!doc) return null;

  const total = doc.items.reduce((s, i) => s + lineAmount(i), 0);
  const labor = doc.items.filter(i => i.category === "labor").reduce((s, i) => s + lineAmount(i), 0);
  const parts = doc.items.filter(i => i.category === "part").reduce((s, i) => s + lineAmount(i), 0);
  const diag = doc.items.filter(i => i.category === "diagnosis").reduce((s, i) => s + lineAmount(i), 0);

  const docTypeLabel = doc.type === "estimate" ? "ESTIMATE" : "INVOICE";
  const dateStr = new Date(doc.createdAt).toLocaleDateString();

  const buildPrintableHtml = () => `
<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docTypeLabel} ${doc.number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;padding:32px;background:#fff}
  .wrap{max-width:760px;margin:0 auto}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .brand{font-size:22px;font-weight:800}
  .sub{font-size:12px;color:#555;margin-top:2px}
  .badge{display:inline-block;padding:4px 10px;border:1px solid #111;border-radius:999px;font-size:11px;letter-spacing:1px;font-weight:700}
  h2{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:6px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
  .box p{font-size:13px;line-height:1.5;color:#222}
  .box .name{font-weight:600;font-size:14px;color:#111}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;padding:8px 6px;border-bottom:1px solid #ddd}
  td{padding:10px 6px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  td.r,th.r{text-align:right}
  .cat{font-weight:600;background:#fafafa;padding:8px 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;border-top:1px solid #ddd}
  .totals{margin-top:18px;display:flex;justify-content:flex-end}
  .totals table{width:280px}
  .totals td{padding:6px 4px;border:none}
  .totals .grand td{border-top:2px solid #111;padding-top:10px;font-weight:800;font-size:16px}
  .notes{margin-top:24px;padding:12px;background:#fafafa;border-left:3px solid #111;font-size:12px;color:#444}
  .foot{margin-top:32px;text-align:center;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:0}}
</style></head><body><div class="wrap">
  <div class="head">
    <div>
      <div class="brand">${storeName || "AB Complete Car Care"}</div>
      ${storeAddress ? `<div class="sub"><span style="color:#888;font-weight:600">Shop:</span> ${storeAddress}</div>` : ""}
      ${storePhone ? `<div class="sub"><span style="color:#888;font-weight:600">Phone:</span> ${storePhone}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="badge">${docTypeLabel}</div>
      <div style="font-size:18px;font-weight:700;margin-top:8px">${doc.number}</div>
      <div class="sub">${dateStr}</div>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <h2>Bill to</h2>
      <p class="name">${doc.customer || `${doc.firstName} ${doc.lastName}`.trim() || "—"}</p>
      <p>${doc.phone || ""}</p>
      <p>${doc.email || ""}</p>
      <p>${doc.address || ""}</p>
    </div>
    <div class="box">
      <h2>Vehicle</h2>
      <p class="name">${doc.vehicle || `${doc.year} ${doc.make} ${doc.model}`.trim() || "—"}</p>
      <p>${[doc.trim, doc.engine, doc.driveType].filter(Boolean).join(" · ")}</p>
      <p style="font-family:monospace;font-size:11px;color:#888">VIN ${doc.vin || "—"}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="r">Qty / Hrs</th><th class="r">Rate</th><th class="r">Discount</th><th class="r">Amount</th></tr></thead>
    <tbody>
      ${(["labor","part","diagnosis"] as LineCategory[]).map(cat => {
        const rows = doc.items.filter(i => i.category === cat);
        if (rows.length === 0) return "";
        const label = cat === "labor" ? "Labor" : cat === "part" ? "Parts & Materials" : "Diagnosis & Inspection";
        return `<tr><td colspan="5" class="cat">${label}</td></tr>` + rows.map(it => {
          const qtyHrs = cat === "labor" ? `${it.hours ?? 0} hr` : cat === "part" ? `${it.qty ?? 0}` : "—";
          const rate = cat === "diagnosis" ? "—" : fmt(it.price ?? 0);
          const discType = it.discountType ?? "pct";
          const discTxt = !it.discount ? "—" : discType === "pct" ? `${it.discount}%` : fmt(it.discount);
          return `<tr><td>${it.description || "—"}</td><td class="r">${qtyHrs}</td><td class="r">${rate}</td><td class="r">${discTxt}</td><td class="r">${fmt(lineAmount(it))}</td></tr>`;
        }).join("");
      }).join("")}
    </tbody>
  </table>
  <div class="totals"><table>
    ${labor > 0 ? `<tr><td>Labor</td><td class="r">${fmt(labor)}</td></tr>` : ""}
    ${parts > 0 ? `<tr><td>Parts</td><td class="r">${fmt(parts)}</td></tr>` : ""}
    ${diag > 0 ? `<tr><td>Diagnosis</td><td class="r">${fmt(diag)}</td></tr>` : ""}
    <tr class="grand"><td>Total</td><td class="r">${fmt(total)}</td></tr>
  </table></div>
  <div class="notes">${doc.type === "estimate" ? "This is an estimate. Actual costs may vary based on inspection." : "Thank you for your business. Payment is due upon receipt unless otherwise agreed."}</div>
  <div class="foot">${storeName || "AB Complete Car Care"} · Generated by ZIVO Partner</div>
</div></body></html>`;

  const handlePrint = () => {
    const html = buildPrintableHtml();
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast.error("Pop-up blocked. Allow pop-ups to print."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const handleDownload = () => {
    const html = buildPrintableHtml();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTypeLabel}-${doc.number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${docTypeLabel} ${doc.number} from ${storeName || "AB Complete Car Care"}`);
    const body = encodeURIComponent(
      `Hello ${doc.firstName || doc.customer || ""},\n\n` +
      `Please find your ${docTypeLabel.toLowerCase()} ${doc.number} for ${doc.vehicle || "your vehicle"}.\n\n` +
      `Total: ${fmt(total)}\n\n` +
      `Thank you,\n${storeName || "AB Complete Car Care"}`
    );
    if (!doc.email) { toast.error("No customer email on file"); return; }
    window.location.href = `mailto:${doc.email}?subject=${subject}&body=${body}`;
  };

  const handleSms = () => {
    const body = encodeURIComponent(
      `${storeName || "AB Complete Car Care"}: Your ${docTypeLabel.toLowerCase()} ${doc.number} for ${doc.vehicle || "your vehicle"} — Total ${fmt(total)}.`
    );
    if (!doc.phone) { toast.error("No customer phone on file"); return; }
    const tel = doc.phone.replace(/[^\d+]/g, "");
    window.location.href = `sms:${tel}?body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 pr-12 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-semibold">Preview · {doc.number}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</Button>
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download</Button>
            <Button size="sm" variant="outline" onClick={handleEmail} className="gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Button>
            <Button size="sm" variant="outline" onClick={handleSms} className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> SMS</Button>
            
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <iframe
            title="document-preview"
            srcDoc={buildPrintableHtml()}
            className="w-full h-[75vh] bg-white rounded-lg shadow-md border border-border"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
