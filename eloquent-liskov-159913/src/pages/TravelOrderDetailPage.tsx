/**
 * Travel Order Detail Page
 * Shows full details of a travel order with actions
 */
import { useState } from "react";
import { useParams, Link, Navigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  XCircle,
  Loader2,
  User,
  Phone,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useTripDetails } from "@/hooks/useMyTrips";
import { useOrderActions } from "@/hooks/useOrderActions";
import { OrderItemCard } from "@/components/travel/OrderItemCard";
import { CancelRequestModal } from "@/components/travel/CancelRequestModal";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
// ReportProblemDialog removed

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  draft: { icon: Clock, label: "Draft", color: "text-muted-foreground" },
  pending_payment: { icon: Clock, label: "Pending Payment", color: "text-yellow-600" },
  confirmed: { icon: CheckCircle, label: "Confirmed", color: "text-green-600" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-red-600" },
  failed: { icon: AlertTriangle, label: "Failed", color: "text-red-600" },
  refunded: { icon: CreditCard, label: "Refunded", color: "text-blue-600" },
};

export default function TravelOrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: order, isLoading, error } = useTripDetails(orderNumber);
  const { resendConfirmation, isResending } = useOrderActions();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    const redirectTarget = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to={withRedirectParam("/login", redirectTarget)} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container px-4 py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-4">
            We couldn't find this order. It may have been deleted or you may not have access.
          </p>
          <Button asChild>
            <Link to="/my-trips">Back to My Trips</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const canCancel =
    order.status === "confirmed" &&
    order.cancellation_status === "none";
  const hasCancellationRequest = order.cancellation_status !== "none";
  const canReport = ["confirmed", "refunded"].includes(order.status);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Back to trips">
              <Link to="/my-trips">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold font-mono">{order.order_number}</h1>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              ${order.total.toFixed(2)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container px-4 py-4 space-y-4">
        {/* Cancellation Status Banner */}
        {hasCancellationRequest && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Cancellation {order.cancellation_status === "requested" ? "Requested" : order.cancellation_status}
                  </p>
                  {order.cancellation_reason && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Reason: {order.cancellation_reason}
                    </p>
                  )}
                  {order.cancellation_requested_at && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Requested on {format(new Date(order.cancellation_requested_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => resendConfirmation(order.id)}
            disabled={isResending}
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Resend Confirmation
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <Link to={`/support?order=${order.order_number}`}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Support
            </Link>
          </Button>

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Request Cancellation
            </Button>
          )}

          {canReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReportDialog(true)}
            >
              <Flag className="w-4 h-4 mr-2" />
              Report a problem
            </Button>
          )}
        </div>

        {/* Traveler Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Traveler Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{order.holder_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{order.holder_email}</span>
            </div>
            {order.holder_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{order.holder_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <div className="space-y-3">
          <h2 className="font-semibold">Booking Details</h2>
          {order.travel_order_items?.map((item) => (
            <OrderItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Fee</span>
              <span>${order.fees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxes</span>
              <span>${order.taxes.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${order.total.toFixed(2)} {order.currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p>Order created: {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            {order.updated_at !== order.created_at && (
              <p>Last updated: {format(new Date(order.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Modal */}
      <CancelRequestModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        orderId={order.id}
        orderNumber={order.order_number}
        total={order.total}
        currency={order.currency}
      />

      {/* ReportProblemDialog removed */}

      <MobileBottomNav />
    </div>
  );
}
