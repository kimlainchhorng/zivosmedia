/**
 * Per-tab metadata for the car-rental module. Drives the page title and the
 * CarRentalComingSoonSection placeholder until each tab gets a real component.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarRange, Car, DollarSign, PackagePlus, Building2,
  Users, KeyRound, ClipboardCheck, Wrench, Star, Tag, Wallet, BarChart3,
} from "lucide-react";

export interface CarRentalTabMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
  bullets: string[];
}

export const CAR_RENTAL_TAB_META: Record<string, CarRentalTabMeta> = {
  "car-rental-dashboard": {
    title: "Car Rental Dashboard",
    description: "At-a-glance overview of today's pickups, returns, and revenue.",
    Icon: LayoutDashboard,
    bullets: [
      "Today's pickups and returns",
      "Active rentals on the road",
      "Available vs. rented fleet snapshot",
      "Revenue for the day",
    ],
  },
  "car-rental-reservations": {
    title: "Reservations",
    description: "All bookings — pending, confirmed, on-rental, and returned.",
    Icon: CalendarRange,
    bullets: [
      "Calendar view per vehicle",
      "Conflict-free vehicle assignment",
      "Status flow: pending → confirmed → picked up → returned",
      "Quick walk-in or phone booking",
    ],
  },
  "car-rental-fleet": {
    title: "Fleet & Vehicles",
    description: "Manage the fleet — vehicles, photos, daily rate, mileage limits.",
    Icon: Car,
    bullets: [
      "Add vehicles with make/model/year/plate",
      "Category, transmission, fuel, seats",
      "Daily / weekly / monthly rate",
      "Status: available, rented, maintenance, retired",
    ],
  },
  "car-rental-rates": {
    title: "Rates & Plans",
    description: "Seasonal pricing, weekend surcharges, long-rental discounts.",
    Icon: DollarSign,
    bullets: [
      "Base daily / weekly / monthly rates per vehicle",
      "Mileage limit and extra-mile fee",
      "Security deposit",
    ],
  },
  "car-rental-addons": {
    title: "Add-ons & Extras",
    description: "Insurance, GPS, child seats, additional drivers, refuel options.",
    Icon: PackagePlus,
    bullets: [
      "Per-day or per-rental pricing",
      "Active / inactive toggle",
      "Show on public booking flow",
    ],
  },
  "car-rental-locations": {
    title: "Pickup Locations",
    description: "Branches where renters pick up and return vehicles.",
    Icon: Building2,
    bullets: [
      "Multiple branch support",
      "Opening hours",
      "Default branch for new reservations",
    ],
  },
  "car-rental-customers": {
    title: "Renters",
    description: "Customer book — contact, license details, rental history.",
    Icon: Users,
    bullets: [
      "Driver license capture",
      "Lifetime rental count",
      "Block problem renters",
    ],
  },
  "car-rental-checkout": {
    title: "Pickup Check-out",
    description: "Hand keys to a renter — capture odometer, fuel level, signature.",
    Icon: KeyRound,
    bullets: [
      "Verify license",
      "Record start odometer & fuel",
      "Confirm security deposit",
    ],
  },
  "car-rental-returns": {
    title: "Return & Check-in",
    description: "Process returns — final mileage, fuel, damage, payment.",
    Icon: ClipboardCheck,
    bullets: [
      "End odometer & fuel",
      "Calculate over-mileage charges",
      "Damage / cleanliness notes",
      "Settle the bill",
    ],
  },
  "car-rental-maintenance": {
    title: "Maintenance Log",
    description: "Service history per vehicle to keep the fleet road-worthy.",
    Icon: Wrench,
    bullets: [
      "Oil changes, tire rotations, inspections",
      "Take vehicles off the road during service",
      "Cost tracking feeds expenses",
    ],
  },
  "car-rental-reviews": {
    title: "Reviews & Ratings",
    description: "Renter feedback after each rental.",
    Icon: Star,
    bullets: [
      "Per-vehicle and overall ratings",
      "Respond to reviews",
      "Surface common complaints",
    ],
  },
  "car-rental-promotions": {
    title: "Promotions & Codes",
    description: "Promo codes, seasonal discounts, free upgrades.",
    Icon: Tag,
    bullets: [
      "Percentage or flat-amount discounts",
      "Expiration dates",
      "Usage caps",
    ],
  },
  "car-rental-income": {
    title: "Income & Revenue",
    description: "Rental fees, add-ons, security deposits, and damage charges.",
    Icon: DollarSign,
    bullets: [
      "Daily / weekly / monthly totals",
      "Split by vehicle category",
      "Compare to previous periods",
    ],
  },
  "car-rental-expenses": {
    title: "Expenses & Bills",
    description: "Fuel, insurance, maintenance, lot rent, and other costs.",
    Icon: Wallet,
    bullets: [
      "Categorized expense log",
      "Per-vehicle cost-of-ownership",
      "Attach receipts",
    ],
  },
  "car-rental-reports": {
    title: "Reports & Analytics",
    description: "Utilization, top vehicles, no-show rate, customer retention.",
    Icon: BarChart3,
    bullets: [
      "Fleet utilization %",
      "Top earners per vehicle",
      "Average rental length",
      "Year-over-year growth",
    ],
  },
};

export const CAR_RENTAL_TAB_IDS = Object.keys(CAR_RENTAL_TAB_META);
