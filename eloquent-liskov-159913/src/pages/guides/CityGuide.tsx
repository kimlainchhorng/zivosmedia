/**
 * CityGuide Page
 * Dynamic city travel guide template
 */

import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { 
  MapPin, Plane, Hotel, Car, Calendar, 
  Sun, Thermometer, DollarSign, ArrowRight, Star 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { destinationPhotos } from "@/config/photos";

// City data - in production this would come from a CMS or API
const CITY_DATA: Record<string, {
  name: string;
  country: string;
  tagline: string;
  description: string;
  imageKey: string;
  airports: Array<{ code: string; name: string }>;
  bestTimeToVisit: string;
  avgTemp: string;
  budgetLevel: string;
  topAttractions: string[];
  neighborhoods: string[];
}> = {
  "new-york": {
    name: "New York City",
    country: "United States",
    tagline: "The city that never sleeps",
    description: "New York City, the largest city in the United States, is an international hub of culture, fashion, finance, and the arts. From the bright lights of Times Square to the serenity of Central Park, NYC offers endless experiences.",
    imageKey: "new-york",
    airports: [
      { code: "JFK", name: "John F. Kennedy International" },
      { code: "LGA", name: "LaGuardia" },
      { code: "EWR", name: "Newark Liberty International" },
    ],
    bestTimeToVisit: "April-June, September-November",
    avgTemp: "55°F (13°C)",
    budgetLevel: "$$$",
    topAttractions: [
      "Statue of Liberty",
      "Central Park",
      "Empire State Building",
      "Times Square",
      "Brooklyn Bridge",
      "Metropolitan Museum of Art",
    ],
    neighborhoods: ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"],
  },
  "los-angeles": {
    name: "Los Angeles",
    country: "United States",
    tagline: "The entertainment capital of the world",
    description: "Los Angeles, home to Hollywood and the entertainment industry, offers year-round sunshine, beautiful beaches, and world-class dining. From celebrity sightings to stunning coastal drives, LA has it all.",
    imageKey: "los-angeles",
    airports: [
      { code: "LAX", name: "Los Angeles International" },
      { code: "BUR", name: "Hollywood Burbank" },
    ],
    bestTimeToVisit: "March-May, September-November",
    avgTemp: "66°F (19°C)",
    budgetLevel: "$$$",
    topAttractions: [
      "Hollywood Sign",
      "Santa Monica Pier",
      "Universal Studios",
      "Getty Center",
      "Venice Beach",
      "Griffith Observatory",
    ],
    neighborhoods: ["Hollywood", "Santa Monica", "Venice", "Downtown LA", "Beverly Hills"],
  },
  "miami": {
    name: "Miami",
    country: "United States",
    tagline: "Where the sun always shines",
    description: "Miami is a vibrant coastal metropolis known for its stunning beaches, Art Deco architecture, and thriving nightlife. The city blends Latin American culture with American glamour.",
    imageKey: "miami",
    airports: [
      { code: "MIA", name: "Miami International" },
      { code: "FLL", name: "Fort Lauderdale-Hollywood International" },
    ],
    bestTimeToVisit: "December-April",
    avgTemp: "77°F (25°C)",
    budgetLevel: "$$",
    topAttractions: [
      "South Beach",
      "Art Deco Historic District",
      "Wynwood Walls",
      "Vizcaya Museum",
      "Little Havana",
      "Everglades National Park",
    ],
    neighborhoods: ["South Beach", "Wynwood", "Brickell", "Little Havana", "Coconut Grove"],
  },
};

export default function CityGuide() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? CITY_DATA[citySlug] : null;

  // Inject BreadcrumbList JSON-LD (must be before any early returns)
  useEffect(() => {
    if (!city || !citySlug) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://hizivo.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://hizivo.com/guides" },
        { "@type": "ListItem", position: 3, name: city.name, item: `https://hizivo.com/guides/${citySlug}` },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-city-guide-breadcrumb", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [city, citySlug]);

  if (!city) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">City not found</h1>
            <p className="text-muted-foreground mb-4">
              We don't have a guide for this city yet.
            </p>
            <Button asChild>
              <Link to="/guides">Browse All Guides</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{city.name} Travel Guide | ZIVO</title>
        <meta 
          name="description" 
          content={`Complete travel guide for ${city.name}. Find flights, hotels, attractions, and insider tips for your trip.`} 
        />
        <link rel="canonical" href={`https://hizivo.com/guides/${citySlug}`} />
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          {/* Background destination image */}
          {(() => {
            const photo = destinationPhotos[city.imageKey as keyof typeof destinationPhotos];
            return photo ? (
              <img
                src={photo.src}
                alt={photo.alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            ) : null;
          })()}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/guides" className="hover:text-primary">Guides</Link>
                <span>/</span>
                <span>Destinations</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">{city.country}</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{city.name}</h1>
              <p className="text-xl text-muted-foreground mb-6">{city.tagline}</p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <Button asChild size="lg" className="gap-2">
                  <Link to={`/flights/to/${citySlug}`}>
                    <Plane className="w-4 h-4" />
                    Flights to {city.name.split(" ")[0]}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to={`/hotels?destination=${encodeURIComponent(city.name)}`}>
                    <Hotel className="w-4 h-4" />
                    Hotels
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Info */}
        <section className="py-8 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: "Best Time", value: city.bestTimeToVisit },
                { icon: Thermometer, label: "Avg. Temp", value: city.avgTemp },
                { icon: DollarSign, label: "Budget", value: city.budgetLevel },
                { icon: Plane, label: "Airports", value: city.airports.map(a => a.code).join(", ") },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  <item.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold mb-4">About {city.name}</h2>
              <p className="text-muted-foreground leading-relaxed">{city.description}</p>
            </div>
          </div>
        </section>

        {/* Top Attractions */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Top Attractions</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {city.topAttractions.map((attraction, i) => (
                <div key={attraction} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="font-medium">{attraction}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Airports */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Airports</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {city.airports.map((airport) => (
                <Link
                  key={airport.code}
                  to={`/airports/${airport.code.toLowerCase()}`}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Plane className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{airport.code}</p>
                    <p className="text-sm text-muted-foreground">{airport.name}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Neighborhoods */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Neighborhoods</h2>
            <div className="flex flex-wrap gap-2">
              {city.neighborhoods.map((hood) => (
                <span
                  key={hood}
                  className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium"
                >
                  {hood}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-2">Plan Your Trip to {city.name}</h2>
            <p className="text-muted-foreground mb-6">
              Compare prices and book your perfect getaway
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button asChild size="lg" className="gap-2">
                <Link to={`/flights/to/${citySlug}`}>
                  <Plane className="w-4 h-4" />
                  Search Flights
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to={`/hotels?destination=${encodeURIComponent(city.name)}`}>
                  <Hotel className="w-4 h-4" />
                  Find Hotels
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/rent-car">
                  <Car className="w-4 h-4" />
                  Rent a Car
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
