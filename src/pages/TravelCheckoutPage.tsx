/**
 * Travel Checkout Page
 *
 * This surface intentionally fails closed until travel pricing, order creation,
 * and payment-session creation are backed by one server-owned contract.
 */
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  Clock3,
  Hotel,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTravelCart } from "@/contexts/TravelCartContext";
import SEOHead from "@/components/SEOHead";
import TravelPageFrame from "@/components/travel/TravelPageFrame";

const formatCartDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : format(date, "MMM d, yyyy");
};

const formatCartAmount = (amount: number, currency: string) => {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: normalizedCurrency,
      }).format(amount);
    } catch {
      // Fall through to a safe plain-text amount for an unknown currency code.
    }
  }

  return `${normalizedCurrency ? `${normalizedCurrency} ` : ""}${amount.toFixed(2)}`;
};

const TravelCheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal } = useTravelCart();

  if (items.length === 0) {
    return (
      <TravelPageFrame>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <SEOHead
            title="Travel Cart | Zivo Travel"
            description="Review your saved Zivo Travel selections before checkout."
          />
          <Card className="w-full max-w-md border-sky-200/70 bg-white/90 shadow-xl shadow-sky-950/5 backdrop-blur-xl">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
              <h1 className="mb-2 text-xl font-semibold">Your cart is empty</h1>
              <p className="mb-5 text-muted-foreground">
                Add a hotel, activity, or transfer before returning to checkout.
              </p>
              <Button onClick={() => navigate("/hotels")}>Browse Hotels</Button>
            </CardContent>
          </Card>
        </div>
      </TravelPageFrame>
    );
  }

  const currencies = new Set(items.map((item) => item.currency.trim().toUpperCase()));
  const singleCurrency = currencies.size === 1 ? items[0].currency : null;
  const estimatedSubtotal = getTotal();

  const getItemIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return <Hotel className="h-5 w-5" aria-hidden />;
      case "activity":
        return <MapPin className="h-5 w-5" aria-hidden />;
      case "transfer":
        return <Car className="h-5 w-5" aria-hidden />;
      default:
        return null;
    }
  };

  return (
    <TravelPageFrame>
      <div className="min-h-screen bg-background/85">
        <SEOHead
          title="Travel Checkout Temporarily Unavailable | Zivo Travel"
          description="Your Zivo Travel cart remains saved while checkout is temporarily unavailable. No booking or payment is created from this page."
        />

        <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/85 backdrop-blur-xl safe-area-top">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Travel checkout</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} saved item{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="container mx-auto max-w-4xl px-4 py-6 sm:py-10"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <Card
              className="overflow-hidden border-amber-200/80 bg-white/95 shadow-2xl shadow-sky-950/10"
              role="alert"
              aria-labelledby="checkout-unavailable-title"
            >
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" aria-hidden />
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Clock3 className="h-7 w-7" aria-hidden />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                    Checkout paused
                  </p>
                  <h2 id="checkout-unavailable-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Travel checkout is temporarily unavailable
                  </h2>
                  <p className="max-w-xl text-base leading-7 text-muted-foreground">
                    We cannot securely create a travel booking or start payment right now. Your selections remain
                    saved so you can return when checkout is available.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-700" aria-hidden />
                    <div>
                      <p className="font-semibold">No booking was created and no payment was taken.</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                        We will only enable payment after availability, pricing, and the booking total can be
                        verified by the travel service.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => navigate("/")} className="sm:min-w-44">
                    Back to Zivo Travel
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)} className="sm:min-w-36">
                    Go back
                  </Button>
                </div>

                <p className="text-xs leading-5 text-muted-foreground">
                  When checkout returns, our{" "}
                  <Link to="/legal/terms" className="font-medium text-sky-700 underline-offset-4 hover:underline">
                    Terms of Service
                  </Link>
                  ,{" "}
                  <Link to="/legal/privacy" className="font-medium text-sky-700 underline-offset-4 hover:underline">
                    Privacy Policy
                  </Link>
                  , and cancellation policies apply.
                </p>
              </CardContent>
            </Card>

            <Card className="h-fit border-sky-200/70 bg-white/90 shadow-xl shadow-sky-950/5 backdrop-blur-xl lg:sticky lg:top-24">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Saved cart</CardTitle>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Not booked
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCartDate(item.startDate)}
                        {item.endDate && item.endDate !== item.startDate && (
                          <> – {formatCartDate(item.endDate)}</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.adults} adult{item.adults === 1 ? "" : "s"}
                        {item.children > 0 && `, ${item.children} ${item.children === 1 ? "child" : "children"}`}
                        {item.quantity > 1 && ` · Qty ${item.quantity}`}
                      </p>
                    </div>
                    <p className="text-right text-sm font-medium">
                      {formatCartAmount(item.price * item.quantity, item.currency)}
                    </p>
                  </div>
                ))}

                <Separator />

                <div className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">Estimated cart subtotal</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Fees and final pricing are not calculated while checkout is unavailable.
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-semibold">
                    {singleCurrency
                      ? formatCartAmount(estimatedSubtotal, singleCurrency)
                      : "Multiple currencies"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.main>
      </div>
    </TravelPageFrame>
  );
};

export default TravelCheckoutPage;
