import { useParams } from "react-router-dom";
import { CarFront, Shield, Clock, CheckCircle, ExternalLink, ShieldCheck, Lock } from "lucide-react";
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

const trustBadges = [
  { icon: ShieldCheck, text: CAR_TRUST_BADGES.secureCheckout },
  { icon: CheckCircle, text: CAR_TRUST_BADGES.noHiddenFees },
  { icon: Lock, text: CAR_TRUST_BADGES.dataEncrypted },
];

export default function CarRentalLanding() {
  const { location } = useParams<{ location?: string }>();

  const formattedLocation = location?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  const pageTitle = formattedLocation 
    ? `Car Rental in ${formattedLocation} - Compare Prices | ZIVO`
    : "Compare Car Rental Prices from Top Providers | ZIVO";
  
  const pageDescription = formattedLocation
    ? `Find the best car rental deals in ${formattedLocation}. Compare prices from Hertz, Enterprise, Avis and more. No booking fees on ZIVO.`
    : "Compare car rental prices from trusted providers. Find the best rates on rental cars worldwide. No booking fees on ZIVO.";

  const heroImage = heroPhotos.cars;

  return (
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
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
                <CarFront className="w-4 h-4 text-foreground" />
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
            </div>

            {/* Professional Search Form */}
            <CarSearchFormPro className="max-w-4xl mx-auto" />

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              {trustBadges.map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <badge.icon className="w-4 h-4 text-foreground" />
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
  );
}
