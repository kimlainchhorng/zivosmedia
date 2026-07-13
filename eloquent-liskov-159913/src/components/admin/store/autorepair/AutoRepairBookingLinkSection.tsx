import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "lucide-react/dist/esm/icons/link";
import Copy from "lucide-react/dist/esm/icons/copy";
import QrCode from "lucide-react/dist/esm/icons/qr-code";
import Code from "lucide-react/dist/esm/icons/code";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import { useState } from "react";
import { toast } from "sonner";

interface Props { storeId: string }

export default function AutoRepairBookingLinkSection({ storeId }: Props) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const bookingUrl = `${window.location.origin}/book/${storeId}`;
  const embedCode = `<script src="${window.location.origin}/widget.js" data-store="${storeId}" async></script>`;

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
              <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-3 bg-muted/30 p-4">
                <QrCode className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-[10px] text-center text-muted-foreground font-mono break-all leading-tight">
                  {bookingUrl}
                </p>
              </div>
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                Print this page and display the QR code in your waiting room or on invoices. Customers can scan it to book their next appointment instantly.
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
