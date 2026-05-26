/**
 * Travel Confirmation Page
 * Shows booking confirmation after successful payment
 */
import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Hotel, MapPin, Car, ArrowLeft, Copy, Download, Mail, Home, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { useTravelCart } from "@/contexts/TravelCartContext";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { toast } from "sonner";
import CheckoutTrustFooter from "@/components/checkout/CheckoutTrustFooter";
import { CHECKOUT_CONFIRMATION } from "@/config/checkoutCompliance";
import CrossServiceCTAs from "@/components/shared/CrossServiceCTAs";
import { downloadICS } from "@/lib/buildICS";
import { CalendarPlus } from "lucide-react";

const TravelConfirmationPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useTravelCart();
  const { data: order, isLoading, error } = useOrderDetails(orderNumber);

  // Clear cart on successful confirmation page load
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      clearCart();
    }
  }, [searchParams, clearCart]);

  const getItemIcon = (type: string) => {
    switch (type) {
      case "hotel": return <Hotel className="h-5 w-5" />;
      case "activity": return <MapPin className="h-5 w-5" />;
      case "transfer": return <Car className="h-5 w-5" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending_payment":
        return <Badge variant="secondary">Pending Payment</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Confirmed</Badge>;
      case "reserved":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Processing</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-600 border-red-600">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyOrderNumber = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      toast.success("Order number copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find this order. Please check the order number or contact support.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSuccess = order.status === "confirmed";
  const items = order.travel_order_items || [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Booking Confirmed – ZIVO" description="Your travel bookings have been confirmed. Check your confirmation details." />
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Go home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Booking Confirmation</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Status Hero */}
        <div className="text-center mb-8">
          {isSuccess ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">{CHECKOUT_CONFIRMATION.success}</h1>
              <p className="text-muted-foreground">
                {CHECKOUT_CONFIRMATION.received}
              </p>
            </>
          ) : order.status === "failed" ? (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Booking Issue</h1>
              <p className="text-muted-foreground">
                There was an issue with your booking. Our team will contact you shortly.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Processing Booking</h1>
              <p className="text-muted-foreground">
                Your payment was received. We're confirming your booking...
              </p>
            </>
          )}
        </div>

        {/* Order Number Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-xl font-mono font-bold">{order.order_number}</p>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(order.status)}
                <Button variant="outline" size="icon" onClick={copyOrderNumber} aria-label="Copy order number">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-xl p-4 hover:border-primary/20 transition-all duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.start_date), "EEE, MMM d, yyyy")}
                          {item.end_date && item.end_date !== item.start_date && (
                            <> - {format(new Date(item.end_date), "EEE, MMM d, yyyy")}</>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.adults} adult{item.adults > 1 ? "s" : ""}
                          {item.children > 0 && `, ${item.children} child${item.children > 1 ? "ren" : ""}`}
                        </p>
                      </div>
                      {getItemStatusBadge(item.status)}
                    </div>
                    
                    {item.provider_reference && (
                      <div className="mt-2 bg-muted/50 rounded px-3 py-2">
                        <p className="text-xs text-muted-foreground">Confirmation Number</p>
                        <p className="font-mono font-medium">{item.provider_reference}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Traveler & Payment */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traveler Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.holder_name}</p>
              <p className="text-sm text-muted-foreground">{order.holder_email}</p>
              {order.holder_phone && (
                <p className="text-sm text-muted-foreground">{order.holder_phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee</span>
                <span>${order.fees.toFixed(2)}</span>
              </div>
              {order.taxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes</span>
                  <span>${order.taxes.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Paid</span>
                <span>${order.total.toFixed(2)} {order.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cross-service follow-ups (ride from airport, food to room) + calendar export */}
        {(() => {
          const hotelItem = items.find((it) => it.type === "hotel");
          if (!hotelItem) return null;
          return (
            <div className="mb-6 space-y-3">
              <Button
                variant="outline"
                onClick={() =>
                  downloadICS(
                    {
                      title: `Stay: ${hotelItem.title}`,
                      description: `Order ${order.order_number} · Booked via ZIVO`,
                      start: `${hotelItem.start_date}T15:00:00`,
                      end: `${hotelItem.end_date ?? hotelItem.start_date}T11:00:00`,
                      location: hotelItem.title,
                      uid: `hotel-${hotelItem.id}@zivo.app`,
                    },
                    `zivo-hotel-${hotelItem.title}`,
                  )
                }
                className="w-full h-12 rounded-xl gap-2"
              >
                <CalendarPlus className="w-4 h-4" /> Add stay to calendar
              </Button>
              <CrossServiceCTAs
                variant="after-hotel"
                title="Round out your stay"
                context={{
                  hotelName: hotelItem.title,
                  destinationAddress: hotelItem.title,
                  arrivalDate: hotelItem.start_date,
                  departureDate: hotelItem.end_date,
                }}
              />
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/my-orders")} className="gap-2">
            <Mail className="w-4 h-4" />
            {CHECKOUT_CONFIRMATION.buttons.view}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = 'mailto:support@hizovo.com'} className="gap-2">
            <Headphones className="w-4 h-4" />
            {CHECKOUT_CONFIRMATION.buttons.support}
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" />
            {CHECKOUT_CONFIRMATION.buttons.home}
          </Button>
        </div>

        {/* Trust Footer */}
        <CheckoutTrustFooter className="mt-8" />
      </main>
    </div>
  );
};

export default TravelConfirmationPage;
