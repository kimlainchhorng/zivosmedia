import { useMemo, useState } from "react";
import { Accessibility, ArrowLeft, CheckCircle2, CreditCard, Crown, Gem, PawPrint, Shield, Sparkles, TrendingDown, Users, Zap } from "lucide-react";

type RideCategory = "Popular" | "Premium" | "Accessible";

type RideOption = {
  id: string;
  name: string;
  category: RideCategory;
  eta: string;
  description: string;
  price: number;
  oldPrice?: number;
  seats: number;
  image: string;
};

const rideOptionsSeed: RideOption[] = [
  {
    id: "economy",
    name: "ZIVO Economy",
    category: "Popular",
    eta: "3:20 pm",
    description: "Affordable everyday rides",
    price: 24.15,
    seats: 3,
    image: "/vehicles/economy-car-v2.png",
  },
  {
    id: "share",
    name: "ZIVO Share",
    category: "Popular",
    eta: "3:22 pm",
    description: "Share a ride, save money",
    price: 11.40,
    oldPrice: 16.29,
    seats: 2,
    image: "/vehicles/share-car-v2.png",
  },
  {
    id: "comfort",
    name: "ZIVO Comfort",
    category: "Popular",
    eta: "3:24 pm",
    description: "Top-rated drivers, extra legroom",
    price: 45.61,
    seats: 3,
    image: "/vehicles/comfort-car-v2.png",
  },
  {
    id: "ev",
    name: "ZIVO EV",
    category: "Popular",
    eta: "3:25 pm",
    description: "Electric, zero-emission rides",
    price: 27.50,
    seats: 3,
    image: "/vehicles/ev-car-v2.png",
  },
  {
    id: "xl",
    name: "ZIVO XL",
    category: "Popular",
    eta: "3:26 pm",
    description: "Extra space for groups",
    price: 35.00,
    seats: 5,
    image: "/vehicles/xl-car-v2.png",
  },
  {
    id: "black-lane",
    name: "ZIVO BLACK Lane",
    category: "Premium",
    eta: "3:26 pm",
    description: "Premium with professional drivers",
    price: 73.23,
    seats: 4,
    image: "/vehicles/black-lane-car-v2.png",
  },
  {
    id: "black-xl",
    name: "ZIVO BLACK XL",
    category: "Premium",
    eta: "3:27 pm",
    description: "Premium SUV for groups",
    price: 89.50,
    seats: 6,
    image: "/vehicles/black-xl-car-v2.png",
  },
  {
    id: "luxury-xl",
    name: "ZIVO Luxury XL",
    category: "Premium",
    eta: "3:28 pm",
    description: "Luxury spacious SUV experience",
    price: 95.99,
    seats: 6,
    image: "/vehicles/luxury-car-v2.png",
  },
  {
    id: "pet",
    name: "ZIVO Pet",
    category: "Accessible",
    eta: "3:30 pm",
    description: "Pet-friendly rides",
    price: 30.00,
    seats: 3,
    image: "/vehicles/pet-car-v2.png",
  },
  {
    id: "wheelchair",
    name: "ZIVO Wheel Chair",
    category: "Accessible",
    eta: "3:32 pm",
    description: "Wheelchair accessible vehicle",
    price: 28.00,
    seats: 3,
    image: "/vehicles/wheelchair-car-v2.png",
  },
];

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

const categories: RideCategory[] = ["Popular", "Premium", "Accessible"];

interface RideOptionsSheetProps {
  onConfirm?: (rideId: string) => void;
  onBack?: () => void;
  promoPercent?: number;
}

export default function RideOptionsSheet({
  onConfirm,
  onBack,
  promoPercent = 15,
}: RideOptionsSheetProps) {
  const [activeCategory, setActiveCategory] = useState<RideCategory>("Popular");
  const [selectedRideId, setSelectedRideId] = useState<string>("economy");

  const filteredOptions = useMemo(
    () => rideOptionsSeed.filter((r) => r.category === activeCategory),
    [activeCategory]
  );

  const selectedRide =
    rideOptionsSeed.find((r) => r.id === selectedRideId) ?? rideOptionsSeed[0];

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">Choose a ride</h2>
        </div>

        {promoPercent > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {promoPercent}% promo applied
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button type="button"
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Ride Options List */}
      <div className="flex-1 overflow-y-auto px-3 pt-1 pb-2">
        {filteredOptions.map((ride) => {
          const isSelected = selectedRideId === ride.id;
          return (
            <button type="button"
              key={ride.id}
              onClick={() => setSelectedRideId(ride.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                isSelected
                  ? "bg-muted/70 ring-1 ring-foreground/10"
                  : "hover:bg-muted/40"
              }`}
            >
              {/* Vehicle Image */}
              <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center">
                <img
	                  src={ride.image}
	                  alt={ride.name}
	                  className="h-12 w-auto object-contain"
	                  loading="lazy"
	                  decoding="async"
	                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {ride.name}
                  </span>
                  {ride.id === "economy" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                      <TrendingDown className="w-3 h-3" />
                      LOW
                    </span>
                  )}
                  {ride.id === "share" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      <Users className="w-3 h-3" />
                      SAVE
                    </span>
                  )}
                  {ride.id === "comfort" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                      <Sparkles className="w-3 h-3" />
                      TOP
                    </span>
                  )}
                  {ride.id === "ev" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <Zap className="w-3 h-3" />
                      EV
                    </span>
                  )}
                  {ride.id === "xl" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                      <Users className="w-3 h-3" />
                      5+
                    </span>
                  )}
                  {ride.id === "black-lane" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold">
                      <Crown className="w-3 h-3" />
                      VIP
                    </span>
                  )}
                  {ride.id === "black-xl" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                      <Shield className="w-3 h-3" />
                      PREMIUM
                    </span>
                  )}
                  {ride.id === "luxury-xl" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                      <Gem className="w-3 h-3" />
                      ELITE
                    </span>
                  )}
                  {ride.id === "pet" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                      <PawPrint className="w-3 h-3" />
                      PET
                    </span>
                  )}
                  {ride.id === "wheelchair" && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                      <Accessibility className="w-3 h-3" />
                      WAV
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {ride.seats}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ride.eta} · {ride.description}
                </p>
              </div>

              {/* Price + Check */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(ride.price)}
                </span>
                {ride.oldPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(ride.oldPrice)}
                  </span>
                )}
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Payment + Confirm — pinned bottom */}
      <div className="mt-auto border-t border-border bg-background px-5 pb-[var(--zivo-safe-bottom,0px)]">
        <button type="button" className="flex w-full items-center gap-3 py-3 hover:bg-muted/40 transition-colors rounded-xl px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm text-foreground font-medium">Payment method</span>
          <ArrowLeft className="ml-auto h-4 w-4 rotate-180 text-muted-foreground" />
        </button>
        <button type="button"
          onClick={() => onConfirm?.(selectedRide.id)}
          className="w-full rounded-2xl bg-emerald-500 py-4 text-center text-base font-bold text-white transition-opacity hover:opacity-90 mb-3"
        >
          Confirm {selectedRide.name} · {formatPrice(selectedRide.price)}
        </button>
      </div>
    </div>
  );
}
