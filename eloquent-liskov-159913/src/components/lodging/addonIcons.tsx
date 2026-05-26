/**
 * Shared lodge add-on icon mapping.
 * `slug` is a short keyword stored on LodgeAddon.icon — resolved here to a Lucide icon.
 * Falls back to Sparkles for unknown slugs (or legacy emoji strings).
 */
import {
  Croissant, Utensils, UtensilsCrossed, Wine, GlassWater, Martini, Bus, Car,
  CarTaxiFront, Bike, Clock, Bed, Baby, User, PawPrint, Sparkles,
  HeartHandshake, Flower2, Cake, Flower, Anchor, Palmtree, Ship, ChefHat,
  Brush, Shirt, ParkingCircle, Umbrella, Fish, Sailboat, Waves, Soup, IceCreamBowl,
  type LucideIcon,
} from "lucide-react";

export const ADDON_ICON_MAP: Record<string, LucideIcon> = {
  breakfast: Croissant,
  halfboard: Utensils,
  fullboard: UtensilsCrossed,
  lunch: Soup,
  dinner: UtensilsCrossed,
  kidsmeal: IceCreamBowl,
  floatingbreakfast: Croissant,
  romanticdinner: Utensils,
  welcomedrink: Martini,
  wine: Wine,
  minibar: GlassWater,
  roomservice: ChefHat,
  fruitbasket: IceCreamBowl,
  airportpickup: Bus,
  airportdropoff: CarTaxiFront,
  airporttransfer: Car,
  airportvip: HeartHandshake,
  privatedriver: Car,
  ferrytransfer: Ship,
  privatetransfer: Sailboat,
  privateboat: Sailboat,
  scooter: Bike,
  carrental: Car,
  bicycle: Bike,
  earlycheckin: Clock,
  latecheckout: Clock,
  extrabed: Bed,
  babycrib: Baby,
  extraguest: User,
  petfee: PawPrint,
  spa: Sparkles,
  spapackage: Sparkles,
  couplesmassage: HeartHandshake,
  yoga: Sparkles,
  sauna: Waves,
  gym: User,
  snorkeling: Anchor,
  island: Palmtree,
  cruise: Ship,
  resortdaypass: Palmtree,
  kidsclub: Baby,
  fishing: Fish,
  watersports: Waves,
  chef: ChefHat,
  honeymoon: Flower2,
  cake: Cake,
  flowers: Flower,
  champagne: Wine,
  housekeeping: Brush,
  laundry: Shirt,
  parking: ParkingCircle,
  beachtowel: Umbrella,
  extratowels: Umbrella,
  luggage: Bed,
  wakeup: Clock,
};

export function AddonIcon({ slug, className = "h-3.5 w-3.5" }: { slug?: string; className?: string }) {
  const Icon = (slug && ADDON_ICON_MAP[slug]) || Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
