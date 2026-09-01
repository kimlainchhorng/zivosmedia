import { useQuery } from "@tanstack/react-query";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import Clock from "lucide-react/dist/esm/icons/clock";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";

import { useI18n } from "@/hooks/useI18n";
import {
  fetchZivoBusinessRestaurants,
  restaurantOrderUrlForZivos,
} from "@/lib/zivoBusinessRestaurantCatalog";

export default function ZivoBusinessRestaurantCards() {
  const { currentLanguage } = useI18n();
  const khmer = currentLanguage === "km";
  const { data, isPending } = useQuery({
    queryKey: ["zivo-business-public-restaurants"],
    queryFn: ({ signal }) => fetchZivoBusinessRestaurants(signal),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  if (isPending) {
    return (
      <article className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/50 bg-card p-5 text-center text-sm text-muted-foreground" aria-live="polite">
        {khmer ? "កំពុងពិនិត្យម៉ឺនុយ Zivo Business…" : "Checking Zivo Business menus…"}
      </article>
    );
  }

  if (!data?.ok) {
    return (
      <article className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-5 text-center" role="status">
        <UtensilsCrossed className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <strong className="mt-3 text-sm">
          {khmer ? "ម៉ឺនុយ Zivo Business មិនអាចប្រើបានឥឡូវនេះ" : "Zivo Business menus are unavailable right now"}
        </strong>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {khmer ? "សូមពិនិត្យម្តងទៀតនៅពេលក្រោយ។" : "Please check again later."}
        </p>
      </article>
    );
  }

  return data.restaurants.map((restaurant) => {
    const orderUrl = restaurantOrderUrlForZivos(restaurant.orderUrl, khmer ? "km" : "en");
    if (!orderUrl) return null;
    return (
      <article className="group overflow-hidden rounded-2xl border border-amber-500/25 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" key={restaurant.id}>
        <a className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href={orderUrl} target="_blank" rel="noreferrer">
          <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-emerald-50 dark:from-amber-950/50 dark:via-orange-950/30 dark:to-emerald-950/30">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-amber-500/10" aria-hidden="true" />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/90 text-amber-700 shadow-lg" aria-hidden="true">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Zivo Business
            </span>
          </div>
          <div className="p-5">
            <h3 className="truncate text-base font-bold">{khmer ? restaurant.nameKm : restaurant.nameEn}</h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{khmer ? restaurant.addressKm : restaurant.address}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {khmer ? `រៀបចំប្រហែល ${restaurant.prepMinutes} នាទី` : `About ${restaurant.prepMinutes} min preparation`}
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
              {khmer ? "បើកម៉ឺនុយ និងកុម្ម៉ង់" : "Open menu & order"}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </a>
      </article>
    );
  });
}
