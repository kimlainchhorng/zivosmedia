/**
 * Business Invoices Page
 * View and download invoices for business account members
 */
import { useState, useMemo } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership } from "@/hooks/useBusinessMembership";
import { useBusinessInvoices, type Invoice } from "@/hooks/useBusinessInvoices";
import { useInvoicePdfExport } from "@/hooks/useInvoicePdfExport";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

export default function BusinessInvoicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useBusinessMembership();
  const { invoices, isLoading: invoicesLoading, totalPaid, totalPending, totalOverdue } = useBusinessInvoices();
  const { exportToPDF } = useInvoicePdfExport();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Loading state
  const isLoading = membershipLoading || invoicesLoading;

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invoice.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleDownloadPDF = (invoice: Invoice) => {
    if (!membership?.company) return;
    
    exportToPDF({
      invoice,
      companyName: membership.company.name,
      billingEmail: membership.company.billingEmail,
    });
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-destructive/10 text-destructive border-0">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    const redirectTarget = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to={withRedirectParam("/login", redirectTarget)} replace />;
  }

  // Not a business member - show message
  if (!isLoading && !membership?.isMember) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b safe-area-top">
          <div className="flex items-center gap-3 px-4 py-3">
            <button type="button"
              onClick={() => navigate(-1)}
              className="p-2.5 -ml-2 rounded-full hover:bg-muted touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Invoices</h1>
          </div>
        </div>

        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No Business Account</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Join a company account to view invoices billed to your organization.
          </p>
          <Button onClick={() => navigate("/business/account")}>
            Join Business Account
          </Button>
        </div>

        <ZivoMobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Business Invoices – ZIVO" description="View, search, and download invoices for your business account. Filter by status and export for accounting and record-keeping." />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="p-2.5 -ml-2 rounded-full hover:bg-muted touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Invoices</h1>
            {membership?.company && (
              <p className="text-xs text-muted-foreground">{membership.company.name}</p>
            )}
          </div>
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-emerald-500/20">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(totalPaid, "USD")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatPrice(totalPending, "USD")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold text-destructive">
                  {formatPrice(totalOverdue, "USD")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {invoices.length === 0
                  ? "No invoices yet. Invoices will appear here when you make orders billed to your company."
                  : "No invoices match your search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-2">
              {filteredInvoices.map((invoice, index) => (
                <div
                  key={invoice.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                    index < filteredInvoices.length - 1 && "border-b"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">
                        {invoice.invoiceNumber}
                      </p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.issuedAt), "MMM d, yyyy")}
                      {invoice.description && ` • ${invoice.description}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <p className="font-bold text-sm whitespace-nowrap">
                      {formatPrice(invoice.amount, invoice.currency)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownloadPDF(invoice)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Info Note */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Invoices are generated for orders billed to your company account. 
              For billing questions, contact your company administrator or{" "}
              <a href="mailto:support@hizivo.com" className="text-primary">
                support@hizivo.com
              </a>.
            </p>
          </div>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
