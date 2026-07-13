/**
 * useInvoicePdfExport Hook
 * Generate and download invoice PDFs using the print dialog pattern
 */
import { format } from "date-fns";
import { toast } from "sonner";
import type { Invoice } from "./useBusinessInvoices";

interface InvoicePdfData {
  invoice: Invoice;
  companyName: string;
  billingEmail: string | null;
}

export function useInvoicePdfExport() {
  // Generate styled HTML invoice document
  const generateInvoiceHTML = ({ invoice, companyName, billingEmail }: InvoicePdfData): string => {
    const statusColor = invoice.status === "paid" 
      ? "#10b981" 
      : invoice.status === "overdue" 
        ? "#ef4444" 
        : "#f59e0b";
    
    const statusText = invoice.status.toUpperCase();
    
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency,
    }).format(invoice.amount);

    const issuedDate = format(new Date(invoice.issuedAt), "MMMM d, yyyy");
    const dueDate = invoice.dueAt 
      ? format(new Date(invoice.dueAt), "MMMM d, yyyy") 
      : "N/A";

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      padding: 40px; 
      background: #f5f5f5; 
      color: #1f2937;
    }
    .container { 
      max-width: 700px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
    }
    .header { 
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6); 
      color: white; 
      padding: 32px; 
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo { font-size: 28px; font-weight: bold; }
    .logo-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 24px; margin-bottom: 8px; }
    .invoice-number { font-size: 14px; opacity: 0.9; font-weight: 500; }
    
    .status-section {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: 100px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: ${statusColor}15;
      color: ${statusColor};
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${statusColor};
    }
    
    .details-section { 
      padding: 32px; 
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
    .detail-group h3 {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .detail-group p {
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
    .detail-group .highlight {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .amount-section {
      padding: 32px;
      background: #f9fafb;
      border-top: 1px dashed #e5e7eb;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
    }
    .amount-row.total {
      border-top: 2px solid #e5e7eb;
      margin-top: 12px;
      padding-top: 20px;
    }
    .amount-label {
      font-size: 14px;
      color: #6b7280;
    }
    .amount-value {
      font-size: 14px;
      color: #1f2937;
    }
    .amount-row.total .amount-label {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    .amount-row.total .amount-value {
      font-size: 24px;
      font-weight: 700;
      color: #0ea5e9;
    }
    
    .footer { 
      background: #1f2937; 
      padding: 24px 32px; 
      text-align: center; 
      font-size: 12px; 
      color: #9ca3af; 
    }
    .footer a { color: #0ea5e9; text-decoration: none; }
    .footer-note { margin-top: 8px; font-size: 11px; }
    
    @media print { 
      body { padding: 0; background: white; } 
      .container { box-shadow: none; border-radius: 0; } 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg> ZIVO</div>
        <div class="logo-sub">Travel Partner</div>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
      </div>
    </div>
    
    <div class="status-section">
      <div class="status-badge">
        <span class="status-dot"></span>
        ${statusText}
      </div>
    </div>
    
    <div class="details-section">
      <div class="detail-group">
        <h3>Bill To</h3>
        <p class="highlight">${companyName}</p>
        <p>${billingEmail || "—"}</p>
      </div>
      <div class="detail-group">
        <h3>Invoice Date</h3>
        <p class="highlight">${issuedDate}</p>
        <p>Due: ${dueDate}</p>
      </div>
    </div>
    
    ${invoice.description ? `
    <div style="padding: 0 32px 24px;">
      <div class="detail-group">
        <h3>Description</h3>
        <p>${invoice.description}</p>
      </div>
    </div>
    ` : ""}
    
    <div class="amount-section">
      <div class="amount-row">
        <span class="amount-label">Subtotal</span>
        <span class="amount-value">${formattedAmount}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Tax</span>
        <span class="amount-value">$0.00</span>
      </div>
      <div class="amount-row total">
        <span class="amount-label">Total Due</span>
        <span class="amount-value">${formattedAmount}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing <a href="https://hizivo.com">ZIVO</a></p>
      <p class="footer-note">
        ZIVO is a travel search and referral service. Payment and ticketing are handled by our licensed travel partners.
      </p>
    </div>
  </div>
</body>
</html>`;
  };

  // Export to PDF (using print dialog)
  const exportToPDF = (data: InvoicePdfData) => {
    try {
      const htmlContent = generateInvoiceHTML(data);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZIVO-Invoice-${data.invoice?.id?.slice(0, 8) || 'receipt'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  return {
    exportToPDF,
    generateInvoiceHTML,
  };
}
