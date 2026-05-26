/**
 * Travel Checkout Page
 * Unified checkout for hotels, activities, and transfers
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Hotel, MapPin, Car, Loader2, CreditCard, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTravelCart } from "@/contexts/TravelCartContext";
import { useCreateOrder, type HolderInfo } from "@/hooks/useCreateOrder";
import { useTravelCheckout } from "@/hooks/useTravelCheckout";
import { useServiceMaintenance } from "@/hooks/useServiceMaintenance";
import { MaintenanceScreen } from "@/components/shared/MaintenanceScreen";
import { format } from "date-fns";
import { usePromotionValidation } from "@/hooks/usePromotionValidation";
import { Tag, X, CheckCircle2, Loader2 as PromoLoader } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const TravelCheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useTravelCart();
  const { createOrder, isLoading: isCreatingOrder, error: orderError } = useCreateOrder();
  const { startCheckout, isLoading: isStartingCheckout, error: checkoutError } = useTravelCheckout();
  const { isInMaintenance, isLoading: maintenanceLoading } = useServiceMaintenance("hotels");

  const [step, setStep] = useState(1);
  const [holder, setHolder] = useState<HolderInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState("");
  const { isValidating: promoValidating, appliedPromo, error: promoError, validateCode: validatePromo, removePromo } = usePromotionValidation({ serviceType: 'hotels' });

  const isLoading = isCreatingOrder || isStartingCheckout;
  const error = orderError || checkoutError;

  const subtotal = getTotal();
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
  const promoDiscount = appliedPromo?.valid ? (appliedPromo.discount_amount || 0) : 0;
  const total = Math.max(0, subtotal + serviceFee - promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || promoValidating) return;
    await validatePromo(promoCode.trim(), subtotal + serviceFee);
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    removePromo();
  };

  // Show maintenance screen if travel service is paused
  if (maintenanceLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isInMaintenance) {
    return (
      <MaintenanceScreen
        serviceName="ZIVO Travel"
        browseUrl="/hotels"
        browseLabel="Browse Hotels"
        ordersUrl="/account/bookings"
        ordersLabel="View Past Bookings"
        showBrowse
        showOrders
      />
    );
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-4">
              Add hotels, activities, or transfers to your cart to checkout.
            </p>
            <Button onClick={() => navigate("/hotels")}>Browse Hotels</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!holder.name.trim()) {
      errors.name = "Full name is required";
    }
    if (!holder.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holder.email)) {
      errors.email = "Invalid email format";
    }
    if (holder.phone && !/^[+\d\s()-]{7,20}$/.test(holder.phone)) {
      errors.phone = "Invalid phone format";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueToPayment = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  const handleCheckout = async () => {
    if (!acceptTerms) {
      setFormErrors({ terms: "You must accept the terms and conditions" });
      return;
    }

    // Create order
    const orderResult = await createOrder(items, holder);
    if (!orderResult) return;

    // Start Stripe checkout
    await startCheckout(orderResult.orderId);

    // Cart will be cleared after successful payment (on confirmation page)
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "hotel": return <Hotel className="h-5 w-5" />;
      case "activity": return <MapPin className="h-5 w-5" />;
      case "transfer": return <Car className="h-5 w-5" />;
      default: return null;
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Travel Checkout – Secure Booking – ZIVO"
        description="Complete your travel booking securely. Review hotel accommodations, activities, and transfers with flexible payment options and instant confirmation."
      />
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length > 1 ? "s" : ""} in your cart
            </p>
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto px-4 py-6 max-w-4xl"
      >
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {step > 1 ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <span className="text-sm font-medium">Details</span>
              </div>
              <div className="flex-1 h-0.5 bg-muted" />
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  2
                </div>
                <span className="text-sm font-medium">Payment</span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Traveler Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Traveler Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={holder.name}
                      onChange={(e) => setHolder({ ...holder, name: e.target.value })}
                      placeholder="As shown on ID"
                      className={formErrors.name ? "border-destructive" : ""}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={holder.email}
                      onChange={(e) => setHolder({ ...holder, email: e.target.value })}
                      placeholder="booking@email.com"
                      className={formErrors.email ? "border-destructive" : ""}
                    />
                    {formErrors.email && (
                      <p className="text-sm text-destructive mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={holder.phone}
                      onChange={(e) => setHolder({ ...holder, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className={formErrors.phone ? "border-destructive" : ""}
                    />
                    {formErrors.phone && (
                      <p className="text-sm text-destructive mt-1">{formErrors.phone}</p>
                    )}
                  </div>

                  <Button onClick={handleContinueToPayment} className="w-full mt-4">
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-2">Booking for:</p>
                    <p className="font-medium">{holder.name}</p>
                    <p className="text-sm text-muted-foreground">{holder.email}</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm" 
                      onClick={() => setStep(1)}
                    >
                      Edit details
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-normal">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      , and understand that cancellation policies apply.
                    </Label>
                  </div>
                  {formErrors.terms && (
                    <p className="text-sm text-destructive">{formErrors.terms}</p>
                  )}

                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    disabled={isLoading || !acceptTerms}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay ${total.toFixed(2)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    You will be redirected to Stripe for secure payment
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.startDate), "MMM d, yyyy")}
                        {item.endDate && item.endDate !== item.startDate && (
                          <> - {format(new Date(item.endDate), "MMM d, yyyy")}</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.adults} adult{item.adults > 1 ? "s" : ""}
                        {item.children > 0 && `, ${item.children} child${item.children > 1 ? "ren" : ""}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Promo Code */}
                {appliedPromo?.valid ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{appliedPromo.code}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs">−${promoDiscount.toFixed(2)}</span>
                      </div>
                      {appliedPromo.description && <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">{appliedPromo.description}</p>}
                    </div>
                    <button type="button" onClick={handleRemovePromo} className="p-1 rounded-xl hover:bg-emerald-500/10" aria-label="Remove promo">
                      <X className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Promo Code</label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                          placeholder="Enter code"
                          disabled={promoValidating}
                          className="pl-8 h-9 uppercase text-sm"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <Button size="sm" onClick={handleApplyPromo} disabled={!promoCode.trim() || promoValidating} className="h-9 px-3">
                        {promoValidating ? <PromoLoader className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Promo Discount</span>
                      <span>−${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default TravelCheckoutPage;
