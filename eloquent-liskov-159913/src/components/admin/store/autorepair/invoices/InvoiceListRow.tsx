/**
 * One row in the Estimates/Invoices list, with full action menu.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye, MoreHorizontal, Pencil, Send, DollarSign, Copy, Download, Trash2, ArrowRightLeft,
} from "lucide-react";

export type RowDoc = {
  id: string;
  type: "invoice" | "estimate";
  number: string;
  customer: string;
  vehicle: string;
  totalCents: number;
  amountPaidCents: number;
  status: string; // draft | sent | paid | partially_paid | approved
  isOverdue?: boolean;
};

interface Props {
  doc: RowDoc;
  onView: () => void;
  onEdit: () => void;
  onSend: () => void;
  onMarkPaid?: () => void;
  onDuplicate: () => void;
  onDownloadPdf: () => void;
  onDelete: () => void;
  onConvert?: () => void; // estimates only
}

const statusVariant = (status: string, isOverdue?: boolean) => {
  if (isOverdue) return { label: "Overdue", cls: "bg-red-500/15 text-red-600 border-red-500/30" };
  switch (status) {
    case "paid":
      return { label: "Paid", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    case "partially_paid":
      return { label: "Partial", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    case "sent":
      return { label: "Sent", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
    case "approved":
      return { label: "Approved", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    default:
      return { label: "Draft", cls: "bg-muted text-muted-foreground border-border" };
  }
};

export default function InvoiceListRow({
  doc, onView, onEdit, onSend, onMarkPaid, onDuplicate, onDownloadPdf, onDelete, onConvert,
}: Props) {
  const status = statusVariant(doc.status, doc.isOverdue);
  const total = `$${(doc.totalCents / 100).toFixed(2)}`;
  const remaining = Math.max(0, doc.totalCents - doc.amountPaidCents);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/40 transition">
      <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-semibold text-sm">{doc.number}</span>
          <Badge variant="outline" className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
          {doc.status === "partially_paid" && (
            <span className="text-[10px] text-muted-foreground">
              ${(remaining / 100).toFixed(2)} left
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {doc.customer || "—"} · {doc.vehicle || "—"}
        </p>
      </button>

      <div className="text-right shrink-0 ml-3 flex items-center gap-2">
        <p className="font-bold text-sm">{total}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Actions">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onView}>
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSend}>
              <Send className="w-3.5 h-3.5 mr-2" /> Send
            </DropdownMenuItem>
            {doc.type === "invoice" && doc.status !== "paid" && onMarkPaid && (
              <DropdownMenuItem onClick={onMarkPaid}>
                <DollarSign className="w-3.5 h-3.5 mr-2" /> Record payment
              </DropdownMenuItem>
            )}
            {doc.type === "estimate" && onConvert && (
              <DropdownMenuItem onClick={onConvert}>
                <ArrowRightLeft className="w-3.5 h-3.5 mr-2" /> Convert to invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadPdf}>
              <Download className="w-3.5 h-3.5 mr-2" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
