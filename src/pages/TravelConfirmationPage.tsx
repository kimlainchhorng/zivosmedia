/**
 * Travel Confirmation Page
 *
 * This route intentionally makes no booking or payment claim until a trusted
 * server verifier binds the signed-in user, checkout session, payment, and
 * supplier confirmation.
 */
import { Link } from "react-router-dom";
import { AlertTriangle, Headphones, Home, Luggage, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import TravelPageFrame from "@/components/travel/TravelPageFrame";

const TravelConfirmationPage = () => (
  <TravelPageFrame>
    <div className="flex min-h-screen items-center justify-center bg-background/85 px-4 py-10">
      <SEOHead
        title="Travel Confirmation Unavailable | Zivo Travel"
        description="This link cannot currently verify a Zivo Travel booking or payment. Check My Trips or contact support for help."
      />

      <Card
        className="w-full max-w-2xl overflow-hidden border-amber-200/80 bg-white/95 shadow-2xl shadow-sky-950/10 backdrop-blur-xl"
        role="alert"
        aria-labelledby="travel-confirmation-unavailable-title"
      >
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" aria-hidden />
        <CardContent className="space-y-6 p-6 sm:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-8 w-8" aria-hidden />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Status unavailable
            </p>
            <h1
              id="travel-confirmation-unavailable-title"
              className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
            >
              Travel confirmation cannot be verified
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              We cannot verify a booking or payment from this link. Do not use this screen as proof of a
              reservation, ticket, or charge.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sky-950">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-sky-700" aria-hidden />
              <div>
                <p className="font-semibold">Your saved cart has not been changed.</p>
                <p className="mt-1 text-sm leading-6 text-sky-900/75">
                  Check My Trips for your account history. If you expected a booking after payment, contact
                  support before trying again.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="gap-2 sm:min-w-40">
              <Link to="/my-trips">
                <Luggage className="h-4 w-4" aria-hidden />
                View My Trips
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 sm:min-w-44">
              <Link to="/">
                <Home className="h-4 w-4" aria-hidden />
                Back to Zivo Travel
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2 sm:min-w-40">
              <a href="mailto:support@zivosmedia.com?subject=Travel%20confirmation%20help">
                <Headphones className="h-4 w-4" aria-hidden />
                Contact Support
              </a>
            </Button>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Confirmation details will return only after Zivo Travel can verify the payment and supplier booking
            through its server systems.
          </p>
        </CardContent>
      </Card>
    </div>
  </TravelPageFrame>
);

export default TravelConfirmationPage;
