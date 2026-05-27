/**
 * SEO Destination Activities Page
 * Dynamic landing page for activities like /things-to-do/paris
 * Optimized for organic search with proper meta tags and structured data
 */
import { useParams, Link } from "react-router-dom";
import { Compass, MapPin, Star, Clock, Users, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { AFFILIATE_LINKS, openAffiliateLink, AFFILIATE_DISCLOSURE_TEXT } from "@/config/affiliateLinks";
import { destinationPhotos } from "@/config/photos";

// City activities data
const cityActivitiesData: Record<string, {
  name: string;
  country: string;
  description: string;
  topActivities: { name: string; type: string; duration: string; priceFrom: number }[];
}> = {
  "paris": {
    name: "Paris",
    country: "France",
    description: "Discover iconic Paris experiences from Eiffel Tower tours to Seine River cruises, Louvre museum visits, and hidden gem walking tours.",
    topActivities: [
      { name: "Eiffel Tower Summit Access", type: "Landmark", duration: "2-3 hours", priceFrom: 69 },
      { name: "Louvre Museum Skip-the-Line", type: "Museum", duration: "3 hours", priceFrom: 55 },
      { name: "Seine River Cruise", type: "Cruise", duration: "1 hour", priceFrom: 25 },
      { name: "Montmartre Walking Tour", type: "Tour", duration: "2 hours", priceFrom: 35 },
    ],
  },
  "rome": {
    name: "Rome",
    country: "Italy",
    description: "Explore ancient Rome with Colosseum tours, Vatican City visits, Sistine Chapel access, and authentic Italian food tours.",
    topActivities: [
      { name: "Colosseum Underground Tour", type: "Landmark", duration: "3 hours", priceFrom: 89 },
      { name: "Vatican & Sistine Chapel", type: "Museum", duration: "4 hours", priceFrom: 79 },
      { name: "Trastevere Food Tour", type: "Food", duration: "3 hours", priceFrom: 65 },
      { name: "Ancient Rome Walking Tour", type: "Tour", duration: "2.5 hours", priceFrom: 45 },
    ],
  },
  "new-york": {
    name: "New York",
    country: "USA",
    description: "Experience the Big Apple with Empire State Building tickets, Broadway shows, Central Park tours, and NYC food experiences.",
    topActivities: [
      { name: "Empire State Building", type: "Landmark", duration: "1-2 hours", priceFrom: 44 },
      { name: "Statue of Liberty & Ellis Island", type: "Landmark", duration: "4 hours", priceFrom: 49 },
      { name: "Broadway Show Tickets", type: "Entertainment", duration: "2.5 hours", priceFrom: 89 },
      { name: "NYC Food & History Tour", type: "Food", duration: "3 hours", priceFrom: 55 },
    ],
  },
  "tokyo": {
    name: "Tokyo",
    country: "Japan",
    description: "Immerse yourself in Tokyo culture with sushi-making classes, temple visits, anime tours, and traditional tea ceremonies.",
    topActivities: [
      { name: "Tsukiji Fish Market Tour", type: "Food", duration: "3 hours", priceFrom: 85 },
      { name: "Senso-ji Temple Tour", type: "Cultural", duration: "2 hours", priceFrom: 40 },
      { name: "Sushi Making Class", type: "Experience", duration: "2 hours", priceFrom: 75 },
      { name: "Anime & Gaming Tour", type: "Entertainment", duration: "4 hours", priceFrom: 65 },
    ],
  },
  "barcelona": {
    name: "Barcelona",
    country: "Spain",
    description: "Discover Gaudí's masterpieces, tapas tours, Gothic Quarter walks, and Mediterranean beach experiences in vibrant Barcelona.",
    topActivities: [
      { name: "Sagrada Familia Tour", type: "Landmark", duration: "2 hours", priceFrom: 55 },
      { name: "Park Güell Skip-the-Line", type: "Landmark", duration: "1.5 hours", priceFrom: 35 },
      { name: "Gothic Quarter Walking Tour", type: "Tour", duration: "2.5 hours", priceFrom: 35 },
      { name: "Tapas & Wine Tour", type: "Food", duration: "3 hours", priceFrom: 75 },
    ],
  },
};

export default function DestinationActivitiesPage() {
  const { city } = useParams<{ city: string }>();
  const citySlug = city?.toLowerCase().replace(/\s+/g, "-") || "";
  const cityInfo = cityActivitiesData[citySlug];
  
  const displayName = cityInfo?.name || city?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Destination";
  const countryName = cityInfo?.country || "";
  
  const pageTitle = `Things to Do in ${displayName}${countryName ? `, ${countryName}` : ""} - Tours & Activities | ZIVO`;
  const pageDescription = cityInfo?.description || `Discover the best tours, attractions, and activities in ${displayName}. Book tickets and experiences with instant confirmation.`;
  
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Activities", url: "/things-to-do" },
    { name: displayName, url: `/things-to-do/${citySlug}` },
  ];
  
  const photoKey = citySlug as keyof typeof destinationPhotos;
  const photo = destinationPhotos[photoKey];

  const handleSearchActivities = () => {
    openAffiliateLink("activities");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        canonical={`https://hizivo.com/things-to-do/${citySlug}`}
      />
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0">
            {photo ? (
              <img
                src={photo.src}
                alt={photo.alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 bg-secondary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <nav className="flex items-center justify-center gap-2 text-sm text-primary-foreground/70 mb-6">
                <Link to="/" className="hover:text-primary-foreground">Home</Link>
                <span>/</span>
                <Link to="/things-to-do" className="hover:text-primary-foreground">Activities</Link>
                <span>/</span>
                <span className="text-primary-foreground">{displayName}</span>
              </nav>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
                <Compass className="w-4 h-4 text-foreground" />
                <span className="text-primary-foreground/80">Tours & Experiences</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Things to Do in <span className="text-foreground">{displayName}</span>
              </h1>
              
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                {pageDescription}
              </p>
              
              <Button 
                onClick={handleSearchActivities}
                size="lg"
                className="gap-2 text-primary-foreground rounded-xl hover:opacity-90 bg-foreground"
              >
                <Compass className="w-5 h-5" />
                Browse All Activities
                <ExternalLink className="w-4 h-4" />
              </Button>
              
              <p className="text-xs text-primary-foreground/50 mt-4">
                {AFFILIATE_DISCLOSURE_TEXT.short}
              </p>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Top Activities */}
        {cityInfo?.topActivities && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-8">
                <Sparkles className="w-5 h-5 text-foreground" />
                <h2 className="font-display text-2xl font-bold">Top Activities in {displayName}</h2>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cityInfo.topActivities.map((activity) => (
                  <Card 
                    key={activity.name}
                    className="group cursor-pointer hover:border-border transition-all"
                    onClick={handleSearchActivities}
                  >
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-3 text-xs">{activity.type}</Badge>
                      <h3 className="font-semibold mb-2 group-hover:text-foreground transition-colors">
                        {activity.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.duration}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">From</span>
                        <span className="text-lg font-bold text-foreground">${activity.priceFrom}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleSearchActivities}
                >
                  View All {displayName} Activities
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Cross-sell */}
        <InternalLinkGrid currentService="home" />

        {/* SEO Content */}
        <section className="py-12 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-invert max-w-none text-center">
              <h2 className="text-2xl font-bold mb-4">
                Explore {displayName} with ZIVO
              </h2>
              <p className="text-muted-foreground">
                ZIVO connects you with top-rated tours, attractions, and experiences in {displayName}. 
                From skip-the-line tickets to hidden gem tours, find and book activities through our 
                trusted partners with instant confirmation.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                ZIVO earns commissions when you book through our partner links. 
                All bookings are completed and serviced by our activity partners.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
