import { MapPin, Star, TrendingUp, ArrowRight, Plane, Calendar, Landmark, Palmtree, Building2, Sun, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const destinations = [
  {
    id: 1,
    name: "Tokyo, Japan",
    tagline: "Where tradition meets future",
    icon: Landmark,
    iconColor: "text-rose-500",
    rating: 4.9,
    priceFrom: 450,
    bestTime: "Mar-May, Sep-Nov",
    trending: true,
    highlights: ["Cherry Blossoms", "Street Food", "Tech Hub"]
  },
  {
    id: 2,
    name: "Paris, France",
    tagline: "City of light and love",
    icon: Landmark,
    iconColor: "text-sky-500",
    rating: 4.8,
    priceFrom: 380,
    bestTime: "Apr-Jun, Sep-Oct",
    highlights: ["Art & Culture", "Cuisine", "Fashion"]
  },
  {
    id: 3,
    name: "Bali, Indonesia",
    tagline: "Island of the gods",
    icon: Palmtree,
    iconColor: "text-emerald-500",
    rating: 4.7,
    priceFrom: 320,
    bestTime: "Apr-Oct",
    highlights: ["Beaches", "Temples", "Wellness"]
  },
  {
    id: 4,
    name: "New York, USA",
    tagline: "The city that never sleeps",
    icon: Building2,
    iconColor: "text-amber-500",
    rating: 4.8,
    priceFrom: 420,
    bestTime: "Apr-Jun, Sep-Nov",
    trending: true,
    highlights: ["Broadway", "Museums", "Skyline"]
  },
  {
    id: 5,
    name: "Dubai, UAE",
    tagline: "Luxury in the desert",
    icon: Sun,
    iconColor: "text-orange-500",
    rating: 4.7,
    priceFrom: 350,
    bestTime: "Nov-Mar",
    highlights: ["Shopping", "Architecture", "Desert"]
  },
  {
    id: 6,
    name: "Sydney, Australia",
    tagline: "Harbour city paradise",
    icon: Waves,
    iconColor: "text-cyan-500",
    rating: 4.8,
    priceFrom: 550,
    bestTime: "Sep-Nov, Mar-May",
    highlights: ["Beaches", "Wildlife", "Opera House"]
  },
];

const DestinationGuides = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-teal-500/20 text-teal-400 border-teal-500/30">
            <MapPin className="w-3 h-3 mr-1" /> Destination Guides
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Popular Destinations
          </h2>
          <p className="text-muted-foreground">Expert guides to the world's most sought-after places</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="group relative bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden hover:border-border transition-all hover:-translate-y-1"
            >
              {/* Image Header */}
              <div className="relative h-32 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <dest.icon className={`w-12 h-12 ${dest.iconColor}`} />
                
                {dest.trending && (
                  <Badge className="absolute top-3 left-3 bg-teal-500 text-primary-foreground border-0">
                    <TrendingUp className="w-3 h-3 mr-1" /> Trending
                  </Badge>
                )}
                
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 rounded-full">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-primary-foreground">{dest.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1">{dest.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{dest.tagline}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {dest.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="px-2 py-1 text-xs bg-muted/50 rounded-full text-muted-foreground"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {dest.bestTime}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <span className="text-xs text-muted-foreground">From</span>
                    <p className="text-lg font-display font-bold text-teal-400">${dest.priceFrom}</p>
                  </div>
                  <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground">
                    <Plane className="w-4 h-4 mr-1" /> Explore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" size="lg">
            View All Destinations <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DestinationGuides;
