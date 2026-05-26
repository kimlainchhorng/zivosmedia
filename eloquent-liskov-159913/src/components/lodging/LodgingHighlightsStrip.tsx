/**
 * LodgingHighlightsStrip - Public hero strip for hotels & resorts.
 * Surfaces hero badges, included highlights, languages, meal plans,
 * accessibility, sustainability and nearby distances pulled from
 * lodge_property_profile.
 */
import {
  Sparkles, Languages, Utensils, Accessibility, Leaf, MapPin,
  Coffee, Wifi, Waves, Dumbbell, Car, ParkingCircle, ShieldCheck,
  Wine, Baby, Building2, Plane, Clock, CalendarX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";

const FACILITY_ICONS: Record<string, typeof Coffee> = {
  pool: Waves, restaurant: Utensils, bar: Wine, gym: Dumbbell, spa: Sparkles,
  "kids club": Baby, "business center": Building2, "conference room": Building2,
  laundry: ShieldCheck, "24h front desk": ShieldCheck, "airport shuttle": Plane,
  "ev charging": Car, parking: ParkingCircle, wifi: Wifi, breakfast: Coffee,
};

function iconFor(label: string) {
  const key = label.toLowerCase();
  return FACILITY_ICONS[key] ?? Sparkles;
}

interface Props {
  profile: LodgePropertyProfile | null | undefined;
}

export function LodgingHighlightsStrip({ profile }: Props) {
  if (!profile) return null;
  const heroBadges = profile.hero_badges || [];
  const included = profile.included_highlights || [];
  const facilities = profile.facilities || [];
  const mealPlans = profile.meal_plans || [];
  const languages = profile.languages || [];
  const accessibility = profile.accessibility || [];
  const sustainability = profile.sustainability || [];
  const nearby = profile.nearby || [];

  const hasAnything =
    heroBadges.length || included.length || facilities.length || mealPlans.length ||
    languages.length || accessibility.length || sustainability.length || nearby.length;
  if (!hasAnything) return null;

  // Top-4 included strip — prefer included_highlights, fall back to facilities
  const stripItems = (included.length ? included : facilities).slice(0, 4);

  return (
    <div className="space-y-3">
      {/* Hero badges row */}
      {heroBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {heroBadges.map(b => (
            <Badge key={b} className="bg-primary/10 text-primary border border-primary/20 text-[10px]">
              ✦ {b}
            </Badge>
          ))}
        </div>
      )}

      {/* Included strip */}
      {stripItems.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {stripItems.map(item => {
            const Icon = iconFor(item);
            return (
              <div
                key={item}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 border border-border/60"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in/out + Cancellation summary */}
      {(profile.check_in_from || profile.check_out_until || profile.cancellation_policy) && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {profile.check_in_from && (
            <Badge variant="outline" className="gap-1 border-border">
              <Clock className="h-2.5 w-2.5" /> Check-in {profile.check_in_from}{profile.check_in_until ? `–${profile.check_in_until}` : ""}
            </Badge>
          )}
          {profile.check_out_until && (
            <Badge variant="outline" className="gap-1 border-border">
              <Clock className="h-2.5 w-2.5" /> Check-out by {profile.check_out_until}
            </Badge>
          )}
          {profile.cancellation_policy && (
            <Badge variant="outline" className="gap-1 border-border">
              <CalendarX className="h-2.5 w-2.5" /> {profile.cancellation_window_hours ? `Free cancel ${profile.cancellation_window_hours}h` : "Cancellation policy"}
            </Badge>
          )}
        </div>
      )}

      {/* Meal plans + Languages summary */}
      {(mealPlans.length > 0 || languages.length > 0) && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {mealPlans.map(m => (
            <Badge key={m} variant="outline" className="gap-1 border-border">
              <Utensils className="h-2.5 w-2.5" /> {m}
            </Badge>
          ))}
          {languages.length > 0 && (
            <Badge variant="outline" className="gap-1 border-border">
              <Languages className="h-2.5 w-2.5" /> {languages.slice(0, 3).join(", ")}
              {languages.length > 3 && ` +${languages.length - 3}`}
            </Badge>
          )}
        </div>
      )}

      {/* Nearby distances */}
      {nearby.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {nearby.slice(0, 4).map((n, i) => (
            <Badge key={`${n.label}-${i}`} variant="outline" className="gap-1 border-border">
              <MapPin className="h-2.5 w-2.5" />
              {n.label}
              {typeof n.minutes === "number" ? ` · ${n.minutes} min` : ""}
              {typeof n.km === "number" ? ` · ${n.km} km` : ""}
            </Badge>
          ))}
        </div>
      )}

      {/* Accessibility + Sustainability chips */}
      {(accessibility.length > 0 || sustainability.length > 0) && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {accessibility.slice(0, 3).map(a => (
            <Badge key={a} variant="outline" className="gap-1 border-border text-muted-foreground">
              <Accessibility className="h-2.5 w-2.5" /> {a}
            </Badge>
          ))}
          {sustainability.slice(0, 3).map(s => (
            <Badge key={s} variant="outline" className="gap-1 border-border text-muted-foreground">
              <Leaf className="h-2.5 w-2.5" /> {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
