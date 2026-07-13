/**
 * ZIVO Car Rental Features Grid
 * 
 * Displays vehicle categories, specialty vehicles, rental options, and protection/extras
 * in a structured, SEO-friendly grid layout.
 */

import { 
  Car, 
  Truck, 
  Zap,
  Trophy,
  Gauge,
  Sun,
  Clock,
  Calendar,
  Route,
  Plane,
  Shield,
  Fuel,
  MapPin,
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

const vehicleCategories: FeatureItem[] = [
  {
    icon: <Car className="w-5 h-5" />,
    title: "Economy",
    description: "Budget-friendly options",
  },
  {
    icon: <Car className="w-5 h-5" />,
    title: "Compact",
    description: "City-friendly size",
  },
  {
    icon: <Truck className="w-5 h-5" />,
    title: "SUV & Crossover",
    description: "Space & comfort",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "Luxury & Premium",
    description: "Top-tier vehicles",
  },
];

const specialtyVehicles: FeatureItem[] = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Electric Vehicles",
    description: "Eco-friendly options",
  },
  {
    icon: <Gauge className="w-5 h-5" />,
    title: "Sports Cars",
    description: "High performance",
  },
  {
    icon: <Sun className="w-5 h-5" />,
    title: "Convertibles",
    description: "Open-top driving",
  },
  {
    icon: <Truck className="w-5 h-5" />,
    title: "Vans & Trucks",
    description: "Extra cargo space",
  },
];

const rentalOptions: FeatureItem[] = [
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Hourly Rental",
    description: "Short-term flexibility",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Weekly Deals",
    description: "Extended savings",
  },
  {
    icon: <Route className="w-5 h-5" />,
    title: "One-Way Rental",
    description: "Drop off elsewhere",
  },
  {
    icon: <Plane className="w-5 h-5" />,
    title: "Airport Pickup",
    description: "Convenient locations",
  },
];

const protectionExtras: FeatureItem[] = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Insurance Options",
    description: "Offered by partners",
  },
  {
    icon: <Fuel className="w-5 h-5" />,
    title: "Prepaid Fuel",
    description: "Optional add-on",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "GPS Navigation",
    description: "Never get lost",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Additional Driver",
    description: "Share the driving",
  },
];

const sections: FeatureSection[] = [
  {
    title: "Vehicle Categories",
    badge: "Types",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    items: vehicleCategories,
  },
  {
    title: "Specialty Vehicles",
    badge: "Premium",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    items: specialtyVehicles,
  },
  {
    title: "Rental Options",
    badge: "Flexible",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    items: rentalOptions,
  },
  {
    title: "Protection & Extras",
    badge: "Add-ons",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    items: protectionExtras,
  },
];

function FeatureCard({ item }: { item: FeatureItem }) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50 hover:border-border hover:bg-card/80 transition-all duration-200 hover:shadow-sm group touch-manipulation active:scale-[0.98]">
      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:scale-110 transition-all duration-200">
        <span className="text-muted-foreground group-hover:text-foreground transition-all duration-200">
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

interface CarFeaturesGridProps {
  className?: string;
}

export default function CarFeaturesGrid({ className }: CarFeaturesGridProps) {
  return (
    <section className={cn("py-12 md:py-16", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <Car className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">ZIVO Car Rental</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Rent Cars from 800+ Locations Worldwide
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse vehicle types, rental options, and add-ons in one place
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
