import { useQuery } from "@tanstack/react-query";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import Clock from "lucide-react/dist/esm/icons/clock";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import {
  fetchZivoBusinessRestaurants,
  restaurantMenuUrlForZivos,
  restaurantOrderUrlForZivos,
} from "@/lib/zivoBusinessRestaurantCatalog";

class CatalogRequestError extends Error {}

export default function ZivoBusinessRestaurantCards() {
  const { currentLanguage } = useI18n();
  const khmer = currentLanguage === "km";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["zivo-business-public-restaurants"],
    queryFn: async ({ signal }) => {
      const result = await fetchZivoBusinessRestaurants(signal);
      if (result.ok === false && result.code === "request_failed") throw new CatalogRequestError("Restaurant catalog request failed");
      return result;
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: (count, reason) => reason instanceof CatalogRequestError && count < 1,
    refetchOnWindowFocus: false,
  });
  const requestFailed = error instanceof CatalogRequestError;
  // React Query retains prior data after a failed refresh. The current error
  // must take precedence over a previously empty or unavailable result.
  const unavailableCode = !error && data?.ok === false ? data.code : null;
  const empty = !error && data?.ok && data.restaurants.length === 0;

  return (
    <section aria-labelledby="business-restaurant-menus-heading" className="min-w-0">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-eats/10 text-eats" aria-hidden="true"><UtensilsCrossed className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 id="business-restaurant-menus-heading" className="text-lg font-bold tracking-tight">{khmer ? "ម៉ឺនុយពីហាងក្នុងតំបន់" : "Menus from local restaurants"}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{khmer ? "ម៉ឺនុយដែលហាងបានចែករំលែកតាម Zivo Business។" : "Menus shared by restaurants on Zivo Business."}</p>
        </div>
      </div>
      {isPending ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground" role="status">
          {khmer ? "កំពុងពិនិត្យម៉ឺនុយ…" : "Loading restaurant menus…"}
        </div>
      ) : error || unavailableCode || empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5" role={requestFailed ? "alert" : "status"}>
          <p className="text-sm font-semibold">
            {unavailableCode === "not_configured"
              ? khmer ? "ម៉ឺនុយហាងមិនទាន់បានភ្ជាប់នៅទីនេះទេ" : "Restaurant menus are not connected here yet"
              : empty
                ? khmer ? "មិនទាន់មានម៉ឺនុយដែលបានចែករំលែកទេ" : "No restaurant menus have been shared yet"
                : khmer ? "មិនអាចផ្ទុកម៉ឺនុយបានឥឡូវនេះ" : "Restaurant menus could not be loaded"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {empty
              ? khmer ? "ហាងដែលចែករំលែកម៉ឺនុយរបស់ពួកគេនឹងបង្ហាញនៅទីនេះ។" : "Restaurants will appear here when they share their menus."
              : requestFailed
                ? khmer ? "សូមព្យាយាមម្តងទៀតដើម្បីផ្ទុកម៉ឺនុយពីហាង។" : "Try again to load the latest menus from restaurants."
                : khmer ? "សូមត្រឡប់មកពិនិត្យនៅពេលក្រោយ។" : "Please check back later."}
          </p>
          {requestFailed && <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? khmer ? "កំពុងព្យាយាម…" : "Trying again…" : khmer ? "ព្យាយាមម្តងទៀត" : "Try again"}</Button>}
        </div>
      ) : data?.ok ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.restaurants.map((restaurant) => {
            const language = khmer ? "km" : "en";
            const orderUrl = restaurant.orderUrl ? restaurantOrderUrlForZivos(restaurant.orderUrl, language) : null;
            const menuUrl = restaurant.menuUrl ? restaurantMenuUrlForZivos(restaurant.menuUrl, language) : null;
            const href = orderUrl || menuUrl;
            if (!href) return null;
            const address = khmer ? restaurant.addressKm : restaurant.address;
            return (
              <article key={restaurant.id} className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
                <a className="group flex h-full min-h-44 flex-col rounded-2xl p-5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" href={href} target="_blank" rel="noopener noreferrer">
                  <span className="mb-3 w-fit rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground">Zivo Business</span>
                  <h3 className="break-words text-base font-bold leading-relaxed">{khmer ? restaurant.nameKm : restaurant.nameEn}</h3>
                  {address && <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{address}</p>}
                  {orderUrl && restaurant.prepMinutes !== null && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{khmer ? `រៀបចំប្រហែល ${restaurant.prepMinutes} នាទី` : `About ${restaurant.prepMinutes} min preparation`}</p>}
                  <span className="mt-auto flex min-h-11 items-center gap-1.5 pt-3 text-sm font-semibold text-primary">
                    {orderUrl ? khmer ? "បើកម៉ឺនុយ និងកុម្ម៉ង់" : "Open menu & order" : khmer ? "មើលម៉ឺនុយ" : "View menu"}
                    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                </a>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
