/**
 * ZIVO Hotels Features Grid
 * 
 * Displays stay types, unique stays, popular destinations, and tools/savings
 * in a structured, SEO-friendly grid layout.
 */

import { 
  Building2, 
  Home, 
  Palmtree, 
  Crown,
  Sparkles,
  Building,
  TreePine,
  Waves,
  MapPin,
  Zap,
  Heart,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}

interface FeatureSection {
  title: string;
  badge: string;
  badgeColor: string;
  items: FeatureItem[];
}

const stayTypes: FeatureItem[] = [
  {
    icon: <Building2 className="w-5 h-5" />,
    title: "Hotels",
    description: "Verified partner properties",
  },
  {
    icon: <Home className="w-5 h-5" />,
    title: "Apartments",
    description: "Home-style stays",
  },
  {
    icon: <Palmtree className="w-5 h-5" />,
    title: "Resorts",
    description: "All-inclusive options",
  },
  {
    icon: <Crown className="w-5 h-5" />,
    title: "Luxury",
    description: "Premium accommodations",
  },
];

const uniqueStays: FeatureItem[] = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Boutique Hotels",
    description: "Unique character stays",
  },
  {
    icon: <TreePine className="w-5 h-5" />,
    title: "Villas & Cabins",
    description: "Private retreats",
  },
  {
    icon: <Waves className="w-5 h-5" />,
    title: "Beach Resorts",
    description: "Oceanfront getaways",
  },
  {
    icon: <Building className="w-5 h-5" />,
    title: "City Center Hotels",
    description: "Central locations",
  },
];

const popularDestinations: FeatureItem[] = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "New York",
    description: "The city that never sleeps",
    href: "/hotels/new-york",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Miami",
    description: "Beach & nightlife",
    href: "/hotels/miami",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Los Angeles",
    description: "Entertainment capital",
    href: "/hotels/los-angeles",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Las Vegas",
    description: "Entertainment & gaming",
    href: "/hotels/las-vegas",
  },
];

const toolsSavings: FeatureItem[] = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Last-Minute Deals",
    description: "Partner offers",
    href: "/hotels?deal=last-minute",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Saved Hotels",
    description: "Wishlist",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Group Bookings",
    description: "Partner discounts",
  },
];

const sections: FeatureSection[] = [
  {
    title: "Stay Types",
    badge: "Properties",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    items: stayTypes,
  },
  {
    title: "Unique Stays",
    badge: "Experiences",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    items: uniqueStays,
  },
  {
    title: "Popular Destinations",
    badge: "Top Cities",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    items: popularDestinations,
  },
  {
    title: "Tools & Savings",
    badge: "Save More",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    items: toolsSavings,
  },
];

function FeatureCard({ item }: { item: FeatureItem }) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50 hover:border-border hover:bg-card/80 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-hotels/10 transition-colors">
        <span className="text-muted-foreground group-hover:text-hotels transition-colors">
          {item.icon}
        </span>
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-sm">{item.title}</h4>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link to={item.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface HotelFeaturesGridProps {
  className?: string;
}

export default function HotelFeaturesGrid({ className }: HotelFeaturesGridProps) {
  return (
    <section className={cn("py-12 md:py-16", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hotels/10 border border-hotels/20 mb-4">
            <Building2 className="w-4 h-4 text-hotels" />
            <span className="text-sm font-medium text-hotels">ZIVO Hotels</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Compare 500,000+ Properties Worldwide
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search all stay types, destinations, and deals in one place
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border",
                  section.badgeColor
                )}>
                  {section.badge}
                </span>
                <h3 className="font-semibold text-sm">{section.title}</h3>
              </div>
              
              {/* Section Items */}
              <div className="space-y-2">
                {section.items.map((item) => (
                  <FeatureCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
