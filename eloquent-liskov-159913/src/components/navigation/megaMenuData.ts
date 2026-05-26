import { Car, UtensilsCrossed, Plane, Hotel, Package, Train, Ticket, Shield, FileText, HelpCircle, DollarSign, MapPin, Clock, Star, Users, Briefcase, Heart, Zap, Globe, CreditCard, Phone, ShieldCheck, Scale, MessageCircle, Building2, Bed, Utensils, Coffee, Wine, Truck, Calendar, Sparkles, Crown, Compass, Wallet, Award, Gift, Luggage, BadgePercent, Timer, Fuel, Key, Settings, Navigation, Mountain, Palmtree, Sunrise, Waves, Landmark, TrendingUp, Bell, Headphones, CheckCircle, Percent, Receipt, CircleDollarSign, Armchair, Wifi, UtensilsCrossed as Meal, Monitor, BaggageClaim, PlaneTakeoff, PlaneLanding, Route, Building, TreePine, Snowflake, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MegaMenuItem {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color?: string;
  badge?: string;
}

export interface MegaMenuSection {
  title: string;
  items: MegaMenuItem[];
}

export interface MegaMenuData {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  hoverColor: string;
  description: string;
  mainAction: {
    label: string;
    href: string;
  };
  sections: MegaMenuSection[];
  policies: MegaMenuItem[];
}

export const megaMenuData: MegaMenuData[] = [
  {
    id: "flights",
    label: "Flights",
    icon: Plane,
    color: "text-sky-500",
    hoverColor: "hover:text-sky-500",
    description: "Book airline tickets worldwide at competitive prices",
    mainAction: {
      label: "Book Flights",
      href: "/flights",
    },
    sections: [
      {
        title: "Cabin Classes",
        items: [
          { icon: Armchair, label: "Economy", description: "Best value fares", href: "/flights?class=economy", color: "text-sky-500" },
          { icon: Sparkles, label: "Premium Economy", description: "Extra comfort & legroom", href: "/flights?class=premium-economy", color: "text-sky-500" },
          { icon: Crown, label: "Business Class", description: "Priority & comfort", href: "/flights?class=business", color: "text-amber-500" },
          { icon: Star, label: "First Class", description: "Premium travel experience", href: "/flights?class=first", color: "text-amber-500" },
        ],
      },
      {
        title: "Flight Types",
        items: [
          { icon: Route, label: "Round Trip", description: "Depart and return", href: "/flights?type=round", color: "text-sky-500" },
          { icon: PlaneTakeoff, label: "One Way", description: "Single destination", href: "/flights?type=oneway", color: "text-sky-500" },
          { icon: Globe, label: "Multi-City", description: "Multiple destinations", href: "/flights?type=multi", color: "text-sky-500" },
        ],
      },
      {
        title: "Travel Services",
        items: [
          { icon: FileText, label: "Flight Ticketing", description: "Issued by ZIVO", href: "/flights", color: "text-sky-500" },
          { icon: Calendar, label: "Changes & Cancellations", description: "Manage your booking", href: "/help/changes", color: "text-sky-500" },
          { icon: Armchair, label: "Seat Selection", description: "Choose your seat", href: "/flights?addon=seat", color: "text-sky-500" },
          { icon: BaggageClaim, label: "Baggage Options", description: "Add checked bags", href: "/flights?addon=baggage", color: "text-sky-500" },
          { icon: Shield, label: "Travel Protection", description: "Trip insurance", href: "/travel-insurance", color: "text-emerald-500" },
        ],
      },
      {
        title: "Deals & Tools",
        items: [
          { icon: BadgePercent, label: "Flight Deals", description: "Limited-time offers", href: "/flights?deals=flash", color: "text-rose-500" },
          { icon: Calendar, label: "Fare Calendar", description: "Find best prices", href: "/flights?calendar=true", color: "text-sky-500" },
          { icon: TrendingUp, label: "Price Drop Alerts", description: "Track price changes", href: "/profile?tab=alerts", color: "text-primary" },
        ],
      },
    ],
    policies: [
      { icon: FileText, label: "Ticketing", description: "Flight tickets are issued by ZIVO or its authorized airline ticketing partners.", href: "/partner-disclosure" },
    ],
  },
  {
    id: "hotels",
    label: "Hotels",
    icon: Hotel,
    color: "text-amber-500",
    hoverColor: "hover:text-amber-500",
    description: "Book hotels and accommodations worldwide",
    mainAction: {
      label: "Book Hotels",
      href: "/hotels",
    },
    sections: [
      {
        title: "Stay Types",
        items: [
          { icon: Hotel, label: "Hotels", description: "Verified properties", href: "/hotels", color: "text-amber-500" },
          { icon: Building2, label: "Apartments", description: "Home-style stays", href: "/hotels?type=apartment", color: "text-amber-500" },
          { icon: TreePine, label: "Resorts", description: "All-inclusive options", href: "/hotels?type=resort", color: "text-emerald-500" },
          { icon: Crown, label: "Luxury Stays", description: "Premium accommodations", href: "/hotels?type=luxury", color: "text-amber-500" },
        ],
      },
      {
        title: "Services",
        items: [
          { icon: CheckCircle, label: "Instant Confirmation", description: "Book with confidence", href: "/hotels", color: "text-emerald-500" },
          { icon: Calendar, label: "Flexible Cancellation", description: "Where available", href: "/hotels?flex=true", color: "text-sky-500" },
          { icon: Users, label: "Group Bookings", description: "Multiple rooms", href: "/hotels?group=true", color: "text-amber-500" },
        ],
      },
      {
        title: "Popular Destinations",
        items: [
          { icon: Landmark, label: "New York", description: "NYC hotels", href: "/hotels?city=new-york", color: "text-sky-500" },
          { icon: Palmtree, label: "Miami", description: "Beach & city stays", href: "/hotels?city=miami", color: "text-emerald-500" },
          { icon: Sunrise, label: "Los Angeles", description: "LA accommodations", href: "/hotels?city=los-angeles", color: "text-orange-500" },
          { icon: Sun, label: "Las Vegas", description: "Vegas hotels", href: "/hotels?city=las-vegas", color: "text-amber-500" },
        ],
      },
    ],
    policies: [
      { icon: FileText, label: "Reservations", description: "Hotel reservations are confirmed by ZIVO or its accommodation partners.", href: "/partner-disclosure" },
    ],
  },
  {
    id: "car-rental",
    label: "Car Rental",
    icon: Car,
    color: "text-primary",
    hoverColor: "hover:text-primary",
    description: "Reserve rental cars worldwide",
    mainAction: {
      label: "Book Car Rentals",
      href: "/rent-car",
    },
    sections: [
      {
        title: "Vehicle Types",
        items: [
          { icon: Car, label: "Economy", description: "Budget-friendly options", href: "/rent-car?type=economy", color: "text-primary" },
          { icon: Car, label: "SUV", description: "Space for groups", href: "/rent-car?type=suv", color: "text-primary" },
          { icon: Crown, label: "Luxury", description: "Premium vehicles", href: "/rent-car?type=luxury", color: "text-amber-500" },
          { icon: Truck, label: "Vans", description: "Cargo & passengers", href: "/rent-car?type=van", color: "text-muted-foreground" },
        ],
      },
      {
        title: "Rental Services",
        items: [
          { icon: MapPin, label: "Airport Pickup", description: "Convenient locations", href: "/rent-car?location=airport", color: "text-primary" },
          { icon: Navigation, label: "One-Way Rentals", description: "Flexible drop-off", href: "/rent-car?oneway=true", color: "text-sky-500" },
          { icon: Shield, label: "Optional Insurance", description: "Protection plans", href: "/rent-car?addon=insurance", color: "text-emerald-500" },
          { icon: Key, label: "Additional Driver", description: "Share the driving", href: "/rent-car?addon=driver", color: "text-muted-foreground" },
        ],
      },
    ],
    policies: [
      { icon: FileText, label: "Rentals", description: "Car rentals are fulfilled by rental companies through ZIVO.", href: "/partner-disclosure" },
    ],
  },
  {
    id: "help",
    label: "Help",
    icon: HelpCircle,
    color: "text-muted-foreground",
    hoverColor: "hover:text-primary",
    description: "ZIVO Help Center",
    mainAction: {
      label: "Help Center",
      href: "/help",
    },
    sections: [
      {
        title: "Support",
        items: [
          { icon: FileText, label: "Manage Booking", description: "View & modify trips", href: "/trips", color: "text-primary" },
          { icon: Calendar, label: "Changes & Cancellations", description: "Modify reservations", href: "/help/changes", color: "text-sky-500" },
          { icon: Receipt, label: "Refund Requests", description: "Request a refund", href: "/help/refunds", color: "text-amber-500" },
          { icon: BaggageClaim, label: "Baggage & Seat Policies", description: "Airline rules", href: "/help/baggage", color: "text-sky-500" },
          { icon: Headphones, label: "Customer Support", description: "Contact us", href: "/contact", color: "text-primary" },
        ],
      },
      {
        title: "Company",
        items: [
          { icon: Globe, label: "About ZIVO", description: "Our story", href: "/about", color: "text-primary" },
          { icon: Compass, label: "How It Works", description: "Book with ZIVO", href: "/how-it-works", color: "text-primary" },
          { icon: FileText, label: "Legal & Policies", description: "Terms & privacy", href: "/terms", color: "text-muted-foreground" },
        ],
      },
    ],
    policies: [
      { icon: Headphones, label: "Support", description: "ZIVO provides customer support for all bookings made on this platform.", href: "/help" },
    ],
  },
];

// ZIVO More dropdown - Rides, Eats & local services
export const moreServicesData: MegaMenuData = {
  id: "more",
  label: "Rides · Eats · Move",
  icon: Package,
  color: "text-rides",
  hoverColor: "hover:text-rides",
  description: "Local services powered by ZIVO",
  mainAction: {
    label: "Explore Services",
    href: "/rides/hub",
  },
  sections: [
    {
      title: "Services",
      items: [
        { icon: Car, label: "ZIVO Rides", description: "Request local rides", href: "/rides/hub", color: "text-rides" },
        { icon: UtensilsCrossed, label: "ZIVO Eats", description: "Order food from local restaurants", href: "/eats", color: "text-eats" },
        { icon: Package, label: "ZIVO Delivery", description: "Package and courier delivery", href: "/delivery", color: "text-primary" },
      ],
    },
    {
      title: "For Drivers",
      items: [
        { icon: Car, label: "Become a Driver", description: "Earn on ZIVO Driver", href: "/drive", color: "text-rides" },
      ],
    },
  ],
  policies: [
    { icon: HelpCircle, label: "Legal Note", description: "Mobility services are provided by independent drivers using the ZIVO Driver platform.", href: "/terms" },
  ],
};
