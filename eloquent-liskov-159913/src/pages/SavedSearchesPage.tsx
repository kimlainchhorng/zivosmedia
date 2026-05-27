/**
 * Saved Searches & Price Alerts Page
 * Unified management for saved searches with price alert controls
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Bell,
  BellOff,
  BellRing,
  Plane,
  Building2,
  Car,
  Trash2,
  DollarSign,
  Clock,
  ExternalLink,
  Bookmark,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useSavedSearches, type SavedSearch } from "@/hooks/useSavedSearches";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";

const serviceIcons: Record<string, typeof Plane> = {
  flights: Plane,
  hotels: Building2,
  cars: Car,
};

const serviceColors: Record<string, string> = {
  flights: "text-primary",
  hotels: "text-primary",
  cars: "text-primary",
};

export default function SavedSearchesPage() {
  const navigate = useNavigate();
  const { searches, isLoading, deleteSearch, toggleAlert, updateSearch } = useSavedSearches();
  const [filter, setFilter] = useState<"all" | "flights" | "hotels" | "cars">("all");
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const filtered = searches.filter((s) => {
    if (filter !== "all" && s.service_type !== filter) return false;
    if (showAlertsOnly && !s.price_alert_enabled) return false;
    return true;
  });

  const alertsCount = searches.filter((s) => s.price_alert_enabled).length;

  const handleRerun = (s: SavedSearch) => {
    const params = s.search_params as Record<string, string>;
    const base =
      s.service_type === "flights"
        ? "/flights/results"
        : s.service_type === "hotels"
          ? "/hotels/results"
          : "/cars/results";
    const qs = new URLSearchParams(params).toString();
    navigate(`${base}?${qs}`);
  };

  const handleSetTargetPrice = (id: string) => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) return;
    updateSearch({ id, target_price: price, price_alert_enabled: true });
    setEditingPrice(null);
    setPriceInput("");
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <NavBar />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Bookmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Saved Searches</h1>
              <p className="text-sm text-muted-foreground">
                {searches.length} saved · {alertsCount} price alerts active
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(["all", "flights", "hotels", "cars"] as const).map((t) => (
            <Button
              key={t}
              variant={filter === t ? "default" : "outline"}
              size="sm"
              className="rounded-full capitalize text-xs h-8"
              onClick={() => setFilter(t)}
            >
              {t === "all" ? (
                <SlidersHorizontal className="w-3 h-3 mr-1" />
              ) : (
                (() => {
                  const Icon = serviceIcons[t];
                  return <Icon className="w-3 h-3 mr-1" />;
                })()
              )}
              {t}
            </Button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Switch
              id="alerts-only"
              checked={showAlertsOnly}
              onCheckedChange={setShowAlertsOnly}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="alerts-only" className="text-xs cursor-pointer">
              Alerts only
            </Label>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="p-4">
                  <div className="h-12 bg-muted/50 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searches.length === 0 ? "No Saved Searches" : "No matches"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searches.length === 0
                  ? "Search for flights, hotels, or cars and save your searches to track prices and re-run them later."
                  : "Try adjusting your filters to see more results."}
              </p>
              {searches.length === 0 && (
                <Button className="mt-4" onClick={() => navigate("/flights")}>
                  <Search className="w-4 h-4 mr-2" />
                  Search Flights
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map((s) => {
                const Icon = serviceIcons[s.service_type] || Search;
                const isEditingThis = editingPrice === s.id;

                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card
                      className={cn(
                        "border-border/50 hover:border-border transition-all group",
                        s.price_alert_enabled && "border-primary/20"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              s.price_alert_enabled
                                ? "bg-primary/10"
                                : "bg-muted/50"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-5 h-5",
                                s.price_alert_enabled
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">
                                {s.title}
                              </p>
                              <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                                {s.service_type}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(s.created_at), {
                                  addSuffix: true,
                                })}
                              </span>
                              {s.current_price && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  Last: ${s.current_price}
                                </span>
                              )}
                            </div>

                            {/* Price alert info */}
                            {s.price_alert_enabled && (
                              <div className="mt-2 flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                                  <BellRing className="w-3 h-3 mr-1" />
                                  Alert {s.target_price ? `≤ $${s.target_price}` : "enabled"}
                                </Badge>
                                {s.target_price && s.current_price && s.current_price > s.target_price && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <TrendingDown className="w-3 h-3" />
                                    ${s.current_price - s.target_price} to go
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Set target price inline */}
                            {isEditingThis && (
                              <div className="mt-2 flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Target price"
                                  value={priceInput}
                                  onChange={(e) => setPriceInput(e.target.value)}
                                  className="h-8 w-28 text-xs"
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleSetTargetPrice(s.id)
                                  }
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => handleSetTargetPrice(s.id)}
                                >
                                  Set
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setEditingPrice(null);
                                    setPriceInput("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRerun(s)}
                              aria-label="Re-run search"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (s.price_alert_enabled) {
                                  toggleAlert({ id: s.id, enabled: false });
                                } else {
                                  setEditingPrice(s.id);
                                  setPriceInput(s.target_price?.toString() || "");
                                }
                              }}
                              aria-label="Toggle price alert"
                            >
                              {s.price_alert_enabled ? (
                                <BellOff className="w-4 h-4 text-primary" />
                              ) : (
                                <Bell className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/60 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteSearch(s.id)}
                              aria-label="Delete search"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </main>

      <Footer />
    </PageTransition>
  );
}
