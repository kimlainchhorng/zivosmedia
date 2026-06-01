import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "lucide-react/dist/esm/icons/link";
import Copy from "lucide-react/dist/esm/icons/copy";
import QrCode from "lucide-react/dist/esm/icons/qr-code";
import Code from "lucide-react/dist/esm/icons/code";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import Download from "lucide-react/dist/esm/icons/download";
import Printer from "lucide-react/dist/esm/icons/printer";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";

interface Props { storeId: string }

export default function AutoRepairBookingLinkSection({ storeId }: Props) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const bookingUrl = `${window.location.origin}/book/${storeId}`;
  const embedCode = `<script src="${window.location.origin}/widget.js" data-store="${storeId}" async></script>`;

  const findCanvas = (): HTMLCanvasElement | null =>
    qrWrapRef.current?.querySelector("canvas") ?? null;

  const downloadQr = () => {
    const canvas = findCanvas();
    if (!canvas) { toast.error("QR not ready yet"); return; }
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-qr-${storeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR code downloaded");
    } catch {
      toast.error("Failed to download QR");
    }
  };

  const printQr = () => {
    const canvas = findCanvas();
    if (!canvas) { toast.error("QR not ready yet"); return; }
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) { toast.error("Pop-up blocked. Allow pop-ups to print."); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Booking QR</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;color:#111;text-align:center;min-height:90vh;margin:0}
  h1{font-size:18px;font-weight:700;margin:0 0 4px}
  p{font-size:13px;color:#555;margin:0}
  img{width:320px;height:320px;margin:24px 0;border:8px solid #fff;box-shadow:0 0 0 1px #eee}
  .url{font-family:monospace;font-size:12px;color:#666;word-break:break-all;max-width:360px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>Scan to book your next appointment</h1>
  <p>Point your phone camera at the code below</p>
  <img src="${dataUrl}" alt="Booking QR" loading="lazy" decoding="async"/>
  <p class="url">${bookingUrl}</p>
</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy — please copy manually.");
    }
  };

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success("Embed code copied!");
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      toast.error("Failed to copy — please copy manually.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4" /> Online Booking Link
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Share this link with customers to let them book online.
          </p>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Booking URL</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm break-all select-all">
                {bookingUrl}
              </div>
              <Button
                size="sm"
                className="h-9 gap-1.5 shrink-0"
                onClick={copyLink}
              >
                {copied ? (
                  <><CheckCheck className="w-3.5 h-3.5" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send this link via email, SMS, or post it on your website and social media pages.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">QR Code</p>
              <Badge variant="outline" className="text-[10px] ml-auto">Print-ready</Badge>
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
              <div ref={qrWrapRef} className="bg-white p-4 rounded-xl shadow-sm border">
                <QRCodeCanvas value={bookingUrl} size={192} level="H" includeMargin={false} />
              </div>
              <p className="text-[10px] text-center text-muted-foreground font-mono break-all leading-tight max-w-xs">
                {bookingUrl}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={downloadQr}>
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={printQr}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                Display this QR in your waiting room or print it on invoices — customers scan it to book their next appointment instantly.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Embed Widget</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={copyEmbed}
              >
                {embedCopied ? (
                  <><CheckCheck className="w-3.5 h-3.5" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy code</>
                )}
              </Button>
            </div>
            <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground border">
              {embedCode}
            </pre>
            <p className="text-xs text-muted-foreground">
              Paste this snippet into your website's HTML to embed the booking widget directly on your page.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
