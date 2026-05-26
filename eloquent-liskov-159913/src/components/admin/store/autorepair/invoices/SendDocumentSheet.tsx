/**
 * Generate a public share link and copy it for sending via Email or SMS.
 * The link points at /d/:token which renders the document publicly.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Mail, MessageSquare, Link2, Loader2 } from "lucide-react";
import { createShareLink, markSent, type DocType } from "@/lib/admin/invoiceActions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  doc: {
    id: string;
    type: DocType;
    number: string;
    customer: string;
    email?: string;
    phone?: string;
  } | null;
  onSent: () => void;
}

export default function SendDocumentSheet({
  open, onOpenChange, storeId, doc, onSent,
}: Props) {
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !doc) { setUrl(""); return; }
    setGenerating(true);
    createShareLink({ storeId, docId: doc.id, docType: doc.type })
      .then(({ url }) => setUrl(url))
      .catch((e) => toast.error(`Could not create share link: ${e?.message || "error"}`))
      .finally(() => setGenerating(false));
  }, [open, doc, storeId]);

  if (!doc) return null;

  const stamp = async () => {
    try {
      await markSent(doc.type, doc.id);
      onSent();
    } catch { /* non-fatal */ }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); await stamp(); }
    catch { toast.error("Could not copy link"); }
  };

  const subject = encodeURIComponent(`Your ${doc.type} ${doc.number}`);
  const body = encodeURIComponent(
    `Hi ${doc.customer || "there"},\n\nYour ${doc.type} ${doc.number} is ready to view:\n${url}\n\nThanks!`
  );
  const smsBody = encodeURIComponent(`Your ${doc.type} ${doc.number} is ready: ${url}`);

  const openEmail = () => {
    window.open(`mailto:${doc.email || ""}?subject=${subject}&body=${body}`);
    stamp();
  };
  const openSms = () => {
    window.open(`sms:${doc.phone || ""}?&body=${smsBody}`);
    stamp();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send · {doc.number}</DialogTitle>
          <DialogDescription>
            Share a secure link with {doc.customer || "your customer"}. The link is valid for 60 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Share link
            </Label>
            <div className="flex gap-2">
              <Input value={generating ? "Generating…" : url} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={copyLink} disabled={!url}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={openEmail} disabled={!url} className="gap-1.5">
              <Mail className="w-4 h-4" /> Email
            </Button>
            <Button variant="outline" onClick={openSms} disabled={!url} className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> SMS
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {doc.email ? `Email: ${doc.email}` : "No email on file"}
            {doc.phone ? ` · Phone: ${doc.phone}` : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
