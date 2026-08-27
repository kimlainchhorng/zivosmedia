import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CarFront, CheckCircle, ShieldCheck, Lock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import TravelFAQ from "@/components/shared/TravelFAQ";
import UserTestimonials from "@/components/shared/UserTestimonials";
import VehicleTypeGallery from "@/components/shared/VehicleTypeGallery";
import PhotoDestinationGrid from "@/components/shared/PhotoDestinationGrid";
import PartnerLogosStrip from "@/components/shared/PartnerLogosStrip";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import { CarSearchFormPro } from "@/components/search";
import { cn } from "@/lib/utils";
import { heroPhotos, serviceOverlays } from "@/config/photos";
import ServiceDisclaimer from "@/components/shared/ServiceDisclaimer";
import { CAR_DISCLAIMERS, CAR_TRUST_BADGES } from "@/config/carCompliance";
import CarFeaturesGrid from "@/components/car/CarFeaturesGrid";
import CarComplianceFooter from "@/components/car/CarComplianceFooter";
import TravelPageFrame from "@/components/travel/TravelPageFrame";
import AppLayout from "@/components/app/AppLayout";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";

const trustBadges = [
  { icon: ShieldCheck, text: CAR_TRUST_BADGES.secureCheckout },
  { icon: CheckCircle, text: CAR_TRUST_BADGES.noHiddenFees },
  { icon: Lock, text: CAR_TRUST_BADGES.dataEncrypted },
];

export default function CarRentalLanding() {
  const navigate = useNavigate();
  const { location } = useParams<{ location?: string }>();
  const reduceMotion = useReducedMotion();
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost();

  const handleBack = () => {
    const historyIndex =
      typeof window !== "undefined" ? window.history.state?.idx : null;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  const formattedLocation = location?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  const pageTitle = formattedLocation 
    ? `Car Rental in ${formattedLocation} - Compare Prices | ZIVO`
    : "Compare Car Rental Prices from Top Providers | ZIVO";
  
  const pageDescription = formattedLocation
    ? `Find the best car rental deals in ${formattedLocation}. Compare prices from Hertz, Enterprise, Avis and more. No booking fees on ZIVO.`
    : "Compare car rental prices from trusted providers. Find the best rates on rental cars worldwide. No booking fees on ZIVO.";

  const heroImage = heroPhotos.cars;

  if (!isTravelHost) {
    return (
      <>
        <SEOHead
          title={pageTitle}
          description={pageDescription}
          canonical={formattedLocation ? `/rent-car/${location}` : "/rent-car"}
          ogImage="/og-cars.jpg"
          appLink="zivo://cars"
        />
        <BreadcrumbSchema
          items={
            formattedLocation
              ? [
                  { name: "Home", url: "/" },
                  { name: "Car Rental", url: "/rent-car" },
                  { name: formattedLocation, url: `/rent-car/${location}` },
                ]
              : [
                  { name: "Home", url: "/" },
                  { name: "Car Rental", url: "/rent-car" },
                ]
          }
        />

        <div
          data-car-rental-app-shell
          className="lg:[&>div>header]:hidden"
        >
          <AppLayout
            title="Rental Cars"
            showBack
            onBack={handleBack}
            className="bg-muted/20 lg:!pt-[88px]"
          >
            <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-6">
              <motion.section
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative min-h-[190px] overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-xl sm:min-h-[230px]"
              >
                <img
                  src={heroImage.src}
                  alt={heroImage.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-violet-950/70 to-slate-950/25"
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-[190px] max-w-xl flex-col justify-end p-5 text-white sm:min-h-[230px] sm:p-8">
                  <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                    <CarFront className="h-4 w-4" />
                    Compare trusted providers
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
                    {formattedLocation
                      ? `Rental cars in ${formattedLocation}`
                      : "Find your rental car"}
                  </h2>
                  <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">
                    Pick a location and dates to compare available cars in one place.
                  </p>
                </div>
              </motion.section>

              <section
                aria-label="Search rental cars"
                className="relative z-10 mx-auto -mt-4 max-w-4xl sm:-mt-6"
              >
                <CarSearchFormPro className="border-border/60 shadow-xl shadow-slate-950/10" />
              </section>

              <section
                aria-label="Rental protections"
                className="mx-auto mt-5 grid max-w-4xl grid-cols-3 gap-2 sm:gap-3"
              >
                {trustBadges.map((badge) => (
                  <div
                    key={badge.text}
                    className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card px-2 py-3 text-center shadow-sm sm:min-h-20 sm:flex-row sm:gap-2 sm:px-4"
                  >
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-violet-500/10 text-violet-600 sm:mb-0">
                      <badge.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-foreground/80 sm:text-xs">
                      {badge.text}
                    </span>
                  </div>
                ))}
              </section>

              <VehicleTypeGallery
                service="cars"
                title="Browse by Car Type"
                subtitle="Choose the right size for your trip"
                className="mx-auto mt-6 max-w-5xl rounded-[28px] border border-border/60 bg-card py-8 shadow-sm"
              />

              <section className="mx-auto mt-6 max-w-4xl rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  {CAR_DISCLAIMERS.partnerBooking}
                </div>
                <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {CAR_DISCLAIMERS.price} {CAR_DISCLAIMERS.insurance}
                </p>
              </section>
            </div>
          </AppLayout>
        </div>
      </>
    );
  }

  return (
    <TravelPageFrame>
      <div className="min-h-screen bg-background">
        <SEOHead
          title={pageTitle}
          description={pageDescription}
          canonical={formattedLocation ? `/rent-car/${location}` : "/rent-car"}
          ogImage="/og-cars.jpg"
          appLink="zivo://cars"
        />
      <BreadcrumbSchema
        items={
          formattedLocation
            ? [
                { name: "Home", url: "/" },
                { name: "Car Rental", url: "/rent-car" },
                { name: formattedLocation, url: `/rent-car/${location}` },
              ]
            : [
                { name: "Home", url: "/" },
                { name: "Car Rental", url: "/rent-car" },
              ]
        }
      />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section with Photo Background */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroImage.src}
	              alt={heroImage.alt}
	              className="absolute inset-0 w-full h-full object-cover"
	              loading="eager"
	              decoding="async"
	              fetchPriority="high"
	            />
            {/* Gradient Overlay */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", serviceOverlays.cars)} />
            {/* Additional depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="absolute left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-lg backdrop-blur-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:left-6 sm:top-6"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-3xl mx-auto text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
                <CarFront className="w-4 h-4 text-primary-foreground" />
                <span className="text-primary-foreground/80">Compare car rental prices</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                {formattedLocation ? (
                  <>Car Rental in <span className="text-ig-gradient">{formattedLocation}</span></>
                ) : (
                  <>Find the <span className="text-ig-gradient">Best Rental Car Deals</span></>
                )}
              </h1>
              
              <p className="text-lg text-primary-foreground/80 mb-8">
                Compare prices from Hertz, Enterprise, Avis, Budget and more. No booking fees on ZIVO.
              </p>
            </motion.div>

            {/* Professional Search Form */}
            <CarSearchFormPro className="max-w-4xl mx-auto" />

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8">
              {trustBadges.map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-sm text-primary-foreground/80">
                  <badge.icon className="w-4 h-4 text-primary-foreground" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Partner Logos */}
        <PartnerLogosStrip service="cars" />

        {/* Car Features Grid */}
        <CarFeaturesGrid className="border-b border-border/50 bg-muted/5" />

        {/* Car Types Gallery */}
        <VehicleTypeGallery 
          service="cars" 
          title="Browse by Car Type"
          subtitle="Find the perfect vehicle for your trip"
          className="bg-muted/20"
        />

        {/* Popular Destinations */}
        <PhotoDestinationGrid
          service="cars"
          title="Popular Rental Locations"
          subtitle="Pick up a car in these top destinations"
          limit={8}
        />

        <GlobalTrustBar />

        {/* Testimonials */}
        <UserTestimonials />

        {/* Internal Linking - Cross-sell Flights & Hotels */}
        <InternalLinkGrid currentService="cars" />

        {/* FAQ Section with Schema */}
        <TravelFAQ serviceType="cars" />

        {/* Locked Disclaimer Banner */}
        <section className="py-4 bg-secondary border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-foreground" />
              <span className="font-medium">{CAR_DISCLAIMERS.partnerBooking}</span>
            </div>
          </div>
        </section>

        {/* Affiliate Disclaimer */}
        <section className="py-8 border-t border-border/50">
          <div className="container mx-auto px-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-foreground shrink-0" />
              {CAR_DISCLAIMERS.partnerBooking}
            </p>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              {CAR_DISCLAIMERS.price} {CAR_DISCLAIMERS.insurance}
            </p>
          </div>
        </section>

        {/* Service Disclaimer */}
        <ServiceDisclaimer type="travel" />

        {/* Car Compliance Footer */}
        <CarComplianceFooter />
      </main>
      
      <Footer />
      </div>
    </TravelPageFrame>
  );
}
