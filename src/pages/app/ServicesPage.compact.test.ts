import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(process.cwd(), "src/pages/app/ServicesPage.tsx"), "utf8");

describe("ServicesPage compact Home parity", () => {
  it("reuses the eight Home launchers in the same order", () => {
    const primaryStart = source.indexOf("const getPrimaryServices");
    const primaryEnd = source.indexOf("/* ── Badge Variant Styles", primaryStart);
    const primarySource = source.slice(primaryStart, primaryEnd);
    const expectedLabels = [
      't("home.ride")',
      't("home.eats")',
      't("home.flights")',
      't("home.hotels")',
      't("home.rental_cars")',
      't("home.bus")',
      't("home.shopping")',
      't("home.delivery")',
    ];

    expectedLabels.forEach((label, index) => {
      const previousPosition = index === 0 ? -1 : primarySource.indexOf(expectedLabels[index - 1]);
      expect(primarySource.indexOf(label)).toBeGreaterThan(previousPosition);
    });
    expect(source).toContain('import zivoRideIcon from "@/assets/zivo-ride-icon.webp"');
    expect(source).toContain('import zivoEatsIcon from "@/assets/zivo-eats-icon.webp"');
    expect(source).toContain('import zivoFlightsAircraft from "@/assets/zivo-flights-aircraft.webp"');
    expect(source).toContain('import zivoHotelsIcon from "@/assets/zivo-hotels-icon.webp"');
    expect(source).toContain('import zivoRentalCarIcon from "@/assets/zivo-rental-car.webp"');
    expect(source).toContain('import zivoBusIcon from "@/assets/zivo-bus-icon.webp"');
    expect(source).toContain('import zivoShoppingIcon from "@/assets/zivo-shopping.webp"');
    expect(source).toContain('import zivoAeroplanePackage from "@/assets/zivo-aeroplane-package.png"');
    expect(source).toContain('href: "/bus"');
    expect(source).toContain('href: "/delivery"');
    expect(primarySource).toContain('href: "/delivery", imageSrc: zivoAeroplanePackage');
    expect(source).toContain("grid grid-cols-4");
  });

  it("uses the same premium artwork-tile language in the category panel", () => {
    expect(source).toContain("imageSrc?: string");
    expect(source).toContain('id: "package-delivery"');
    expect(source).toContain("imageSrc: zivoAeroplanePackage");
    expect(source).toContain("imageSrc: zivoReserveCar");
    expect(source).toContain("imageSrc: zivoGroupRideIcon");
    expect(source).toContain('import zivoAlcoholIcon from "@/assets/zivo-alcohol-icon.webp"');
    expect(source).toContain('import zivoPharmacyIcon from "@/assets/zivo-pharmacy-icon.webp"');
    expect(source).toContain('id: "alcohol", label: t("services.alcohol"), href: "/grocery", icon: Wine, imageSrc: zivoAlcoholIcon');
    expect(source).toContain('id: "pharmacy", label: t("services.pharmacy"), href: "/grocery", icon: Pill, imageSrc: zivoPharmacyIcon');
    expect(source).toContain('rounded-[19px] bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),0_2px_6px_rgba(15,23,42,0.04)]');
    expect(source).not.toContain('ACCENT_BY_HREF[service.href]?.bg ?? "bg-card"');
  });

  it("uses real artwork for live secondary Travel services without opening unavailable gates", () => {
    expect(source).toContain('import zivoThingsToDo from "@/assets/zivo-things-to-do.webp"');
    expect(source).toContain('import zivoAiPlanner from "@/assets/zivo-ai-planner.webp"');
    expect(source).toContain('id: "things-to-do", label: t("services.things_to_do"), href: "/explore", icon: MapPin, imageSrc: zivoThingsToDo');
    expect(source).toContain('id: "ai-trip-planner", label: t("services.ai_planner"), href: "/ai-trip-planner", icon: Sparkles, imageSrc: zivoAiPlanner');

    for (const id of ["travel-insurance", "visa-help", "cruise"]) {
      expect(source).toMatch(new RegExp(`\\{ id: "${id}"[^\\n]+comingSoon: true \\}`));
    }
  });

  it("uses the full service-directory title in a balanced branded header", () => {
    expect(source).toContain('t("services.title")');
    expect(source).toContain('import zivoLogo from "@/assets/zivo-logo.png"');
    expect(source).toContain('import { Capacitor } from "@capacitor/core"');
    expect(source).toContain('className="h-11 w-11 shrink-0 rounded-[14px]');
    expect(source).toContain('const isStandaloneDisplay = typeof window !== "undefined"');
    expect(source).toContain('Capacitor.isNativePlatform() || isStandaloneDisplay');
    expect(source).toContain('? "var(--zivo-safe-top-sticky)"');
    expect(source).toContain(': "max(var(--zivo-safe-top, 0px), 1rem)"');
    expect(source).toContain('style={{ "--_safe-top": servicesHeaderSafeTop } as CSSProperties}');
    expect(source).not.toContain('{t("home.more_services")}');
  });

  it("renders one accessible category panel at a time", () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('aria-selected={activeTab === tab.id}');
    expect(source).toContain('role={searchQuery.trim() ? undefined : "tabpanel"}');
    expect(source).toContain('const [activeTab, setActiveTab] = useState<ServiceTabId>("ride")');
    expect(source).toContain("activeCategory?.services ?? []");
    expect(source).not.toContain("filteredCategories.map");
  });

  it("uses a single-stop tablist with wrapping arrow and boundary-key navigation", () => {
    expect(source).toContain("const tabRefs = useRef<Array<HTMLButtonElement | null>>([])");
    expect(source).toContain('aria-orientation="horizontal"');
    expect(source).toContain("tabs.map((tab, index) => (");
    expect(source).toContain("ref={(element) => { tabRefs.current[index] = element; }}");
    expect(source).toContain("tabIndex={activeTab === tab.id ? 0 : -1}");
    expect(source).toContain("onKeyDown={(event) => handleTabKeyDown(event, index)}");
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "Home"');
    expect(source).toContain('event.key === "End"');
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("setActiveTab(tabs[nextIndex].id);");
    expect(source).toContain("tabRefs.current[nextIndex]?.focus();");
  });

  it("keeps search clear focus and exposes dynamic results without an ownerless tab panel", () => {
    expect(source).toContain("const searchInputRef = useRef<HTMLInputElement>(null)");
    expect(source).toContain("const clearSearch = () => {");
    expect(source).toContain('setSearchQuery("");\n    searchInputRef.current?.focus();');
    expect(source).toContain("ref={searchInputRef}");
    expect(source).toContain('role="searchbox"');
    expect(source).toContain('aria-label={t("services.search_placeholder")}');
    expect(source).toContain('aria-controls="services-category-panel"');
    expect(source).toContain('aria-describedby="services-search-status"');
    expect(source).toContain("onClick={clearSearch}");
    expect(source).toContain('id="services-search-status"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-labelledby={searchQuery.trim() ? "services-panel-heading" : "services-explore-heading"}');
    expect(source).toContain('id="services-panel-heading"');
    expect(source).not.toContain('id="services-category-panel"\n          role="tabpanel"');
  });

  it("uses 44px category and favorite touch targets without enlarging the heart surface", () => {
    expect(source).toContain('"h-11 shrink-0 rounded-full px-3');
    expect(source).toContain('"group/favorite absolute left-1/2 -top-2 z-20 ml-2 flex h-11 w-11');
    expect(source).toContain('className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90');
    expect(source).toContain("initial={{ opacity: 0, y: 6 }}");
    expect(source).not.toContain('"h-9 shrink-0 rounded-full px-3');
    expect(source).not.toContain("initial={{ opacity: 0, scale: 0.94 }}");
  });

  it("uses 44px conditional clear and close targets without enlarging their visible controls", () => {
    expect(source).toContain('bg-card/90 pl-9 pr-14 text-sm');
    expect(source).toContain('"group/clear absolute right-0 top-1/2 flex h-11 w-11');
    expect(source).toContain('className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20');
    expect(source).toContain('"group/sheet-close absolute right-2.5 top-1.5 z-50 flex h-11 w-11');
    expect(source).toContain('className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground');
    expect(source).toContain('className="inline-flex min-h-11 items-center justify-center rounded-md px-4');
    expect(source).not.toContain('className="absolute right-3 top-1/2 flex h-5 w-5');
    expect(source).not.toContain('className="absolute right-4 top-3 z-50 flex h-8 w-8');
  });

  it("removes the long promo stack without removing honest unavailable states", () => {
    expect(source).not.toContain("zivoDeliveryBanner");
    expect(source).not.toContain("zivoTravelBanner");
    expect(source).not.toContain("function PromoBanner");
    expect(source).toContain("service.comingSoon");
    expect(source).toContain("setWaitlistService(service.label)");
    expect(source).toContain('badgeVariant: "coming_soon"');
  });

  it("keeps favorite controls as siblings of service buttons", () => {
    const gridStart = source.indexOf("{visibleServices.map");
    const serviceButtonStart = source.indexOf("<motion.button", gridStart);
    const serviceButtonEnd = source.indexOf("</motion.button>", serviceButtonStart);
    const serviceButtonSource = source.slice(serviceButtonStart, serviceButtonEnd);
    const favoriteButtonStart = source.indexOf("<button", serviceButtonEnd);

    expect(gridStart).toBeGreaterThan(-1);
    expect(serviceButtonSource).not.toContain("<button");
    expect(favoriteButtonStart).toBeGreaterThan(serviceButtonEnd);
    expect(source.slice(favoriteButtonStart, favoriteButtonStart + 900)).toContain("toggleFavorite(service, event)");
  });

  it("exposes the visible favorite state through a pressed toggle", () => {
    expect(source).toContain("aria-pressed={isFavorite}");
    expect(source).toContain('? t("services.a11y.remove_favorite")');
    expect(source).toContain(': t("services.a11y.save_favorite")}');
    expect(source).toContain('isFavorite ? "fill-rose-500 text-rose-500"');
  });

  it("gives services with shared routes distinct favorite identities", () => {
    expect(source).toContain('{ id: "ride-travel", label: t("services.travel"), href: "/flights"');
    expect(source).toContain('{ id: "flights", label: t("services.flights"), href: "/flights"');
    expect(source).toContain('{ id: "cruise", label: t("services.cruise"), href: "/flights"');
    expect(source).toContain("const serviceFavoriteKey = (service: ServiceItem) => service.id");
  });
});
