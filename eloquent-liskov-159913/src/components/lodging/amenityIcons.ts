/**
 * Shared canonical amenity → Lucide icon mapping for lodging UI.
 * Lookup is case-insensitive and normalizes spaces / underscores / dashes / slashes.
 */
import {
  Wifi, Snowflake, Waves, ParkingCircle, Coffee, Tv, Utensils, Briefcase,
  WashingMachine, Dumbbell, PawPrint, TreePalm, Flame, Bath, Umbrella, Plane,
  ShieldAlert, Wind, Bed, Bell, Sparkles, Car, Mountain, Sun, Check,
  Shirt, Refrigerator, Microwave, Lock, Cigarette, CigaretteOff, Phone,
  Plug, Armchair, Building2, DoorOpen, Volume2, Square, Layers, Lamp,
  Refrigerator as Fridge, ChefHat, CookingPot, Soup, Box, Wine, Container,
  Tv2, Monitor, Laptop, Music, Trees, Building, Eye, Anchor, Waves as River,
  Landmark, Palmtree, Bike, ShowerHead, Sofa, BookOpen, Gamepad2, Baby,
  Accessibility, Cctv, KeyRound, Wrench, Hammer, Hand, Droplets, Zap, Clock,
  AlarmClock, Ruler, Users, Tv as Stream, ArrowUpToLine,
  type LucideIcon,
} from "lucide-react";

const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, "").replace(/['']/g, "").replace(/[\s_\-/>,.]+/g, "");

const RAW_MAP: Record<string, LucideIcon> = {
  // Connectivity
  wifi: Wifi,
  freewifi: Wifi,
  wirelessinternet: Wifi,
  internet: Wifi,

  // Climate
  ac: Snowflake,
  airconditioning: Snowflake,
  aircon: Snowflake,
  heating: Flame,
  fireplace: Flame,
  fan: Wind,
  ceilingfan: Wind,

  // Pool & water
  pool: Waves,
  swimmingpool: Waves,
  hottub: Bath,
  jacuzzi: Bath,
  bathtub: Bath,
  shower: ShowerHead,
  walkinshower: ShowerHead,
  rainshower: ShowerHead,

  // Bathroom
  freetoiletries: Droplets,
  toiletries: Droplets,
  bathrobe: Shirt,
  slippers: Shirt,
  hairdryer: Wind,
  bidet: Droplets,
  toilet: Bath,
  toiletpaper: Box,
  towels: Sparkles,
  privatebathroom: Bath,

  // Parking & transport
  parking: ParkingCircle,
  freeparking: ParkingCircle,
  carrental: Car,
  valet: Car,
  airportshuttle: Plane,
  shuttle: Plane,
  bicycle: Bike,
  bikerental: Bike,

  // Food & drink
  breakfast: Coffee,
  coffee: Coffee,
  coffeemachine: Coffee,
  coffeemaker: Coffee,
  teacoffeemaker: Coffee,
  kettle: Coffee,
  electrickettle: Coffee,
  kitchen: ChefHat,
  kitchenette: ChefHat,
  stovetop: CookingPot,
  oven: CookingPot,
  microwave: Microwave,
  toaster: Soup,
  dishwasher: Utensils,
  diningtable: Utensils,
  diningarea: Utensils,
  refrigerator: Fridge,
  minifridge: Fridge,
  minibar: Wine,
  "mini-bar": Wine,
  minbar: Wine,

  // Media & tech
  tv: Tv,
  cabletv: Tv,
  cablechannels: Tv,
  satellitechannels: Tv,
  smarttv: Tv2,
  flatscreentv: Tv2,
  streamingservicenetflix: Monitor,
  netflix: Monitor,
  laptopsafe: Laptop,
  telephone: Phone,
  phone: Phone,
  music: Music,

  // Workspace
  workspace: Briefcase,
  desk: Briefcase,

  // Laundry
  laundry: WashingMachine,
  washer: WashingMachine,
  washingmachine: WashingMachine,
  dryer: WashingMachine,
  iron: Shirt,
  ironingfacilities: Shirt,
  clothesrack: Shirt,
  dryingrackforclothing: Shirt,
  wardrobeorcloset: Shirt,
  wardrobe: Shirt,
  closet: Shirt,

  // Fitness & wellness
  gym: Dumbbell,
  fitness: Dumbbell,
  fitnesscentre: Dumbbell,
  spa: Sparkles,
  sauna: Droplets,

  // Pets
  pets: PawPrint,
  petsallowed: PawPrint,
  petfriendly: PawPrint,

  // Outdoor
  balcony: TreePalm,
  terrace: TreePalm,
  patio: TreePalm,
  garden: Trees,
  outdoorfurniture: Sofa,
  beachaccess: Umbrella,
  beachfront: Umbrella,

  // Safety & security
  smokedetector: ShieldAlert,
  smokealarm: ShieldAlert,
  safe: Lock,
  safetydepositbox: Lock,
  privateentrance: DoorOpen,
  cctv: Cctv,
  keycardaccess: KeyRound,

  // Bed
  kingbed: Bed,
  queenbed: Bed,
  twinbed: Bed,
  sofabed: Sofa,

  // Service
  roomservice: Bell,
  concierge: Bell,
  cleaning: Sparkles,
  housekeeping: Sparkles,
  dailyhousekeeping: Sparkles,
  towelssheets: Sparkles,

  // Room features
  carpeted: Layers,
  tilemarblefloor: Square,
  woodenparquetfloor: Square,
  soundproofing: Volume2,
  socketnearthebed: Plug,
  sittingarea: Armchair,
  seatingarea: Armchair,

  // Smoking
  nosmoking: CigaretteOff,
  smokingallowed: Cigarette,

  // View
  garden_view: Trees,
  gardenview: Trees,
  poolview: Waves,
  seaview: Sun,
  oceanview: Sun,
  mountainview: Mountain,
  cityview: Building,
  riverview: River,
  courtyardview: Building2,
  landmarkview: Landmark,
  view: Eye,

  // Accessibility & family
  accessible: Accessibility,
  wheelchairaccessible: Accessibility,
  upperfloorsaccessiblebyelevator: ArrowUpToLine,
  evcharger: Zap,
  babycot: Baby,
  crib: Baby,
  cribavailable: Baby,
  babycotonrequest: Baby,
  childrenscribscots: Baby,
  familyfriendly: Users,

  // Bedroom
  linens: Bed,
  extralongbeds: Ruler,
  alarmclock: AlarmClock,

  // Services & timing
  hotshower: ShowerHead,
  privatepool: Waves,
  spatub: Bath,
  "24hreception": Bell,
  wakeupservice: AlarmClock,
  laundryservice: WashingMachine,
  streamingservice: Monitor,

  // Parking variants
  privateparking: ParkingCircle,

  // Misc
  books: BookOpen,
  games: Gamepad2,
};

export function getAmenityIcon(name: string): LucideIcon {
  return RAW_MAP[norm(name)] ?? Check;
}
