/**
 * SoftwareDownloadsSection — Companion app & driver downloads for store owners.
 * Filters apps by store category (hotel vs shop vs all).
 */
import {
  Download, Apple, Smartphone, Monitor, Laptop, Bell,
  Building2, ShoppingBag, Car, Printer, ScanBarcode, ChefHat,
  LayoutDashboard, BellRing, Brush, Navigation, Hotel,
  Briefcase, Server, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { isLodgingStoreCategory } from "@/hooks/useOwnerStoreProfile";

type Platform = "ios" | "android" | "windows" | "macos";
type Audience = "hotel" | "shop" | "all";

interface SoftwareApp {
  id: string;
  name: string;
  description: string;
  audience: Audience;
  platforms: Platform[];
  downloads: Partial<Record<Platform, string>>;
  icon: LucideIcon;
  status: "available" | "coming-soon";
  version?: string;
}

const SOFTWARE_CATALOG: SoftwareApp[] = [
  {
    id: "zivo-manager",
    name: "ZIVO Manager",
    description: "Run your store from your phone — orders, inbox, payouts, and analytics in one place.",
    audience: "all",
    platforms: ["ios", "android"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo",
      android: "https://play.google.com/store/apps/details?id=com.hizovo.app",
    },
    icon: LayoutDashboard,
    status: "available",
    version: "v2.6",
  },
  {
    id: "zivo-pos",
    name: "ZIVO POS",
    description: "Point-of-sale for in-store checkout, receipt printing, and split payments.",
    audience: "shop",
    platforms: ["ios", "android", "windows"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo-pos",
      android: "https://play.google.com/store/apps/details?id=com.hizovo.pos",
    },
    icon: ShoppingBag,
    status: "coming-soon",
    version: "Beta",
  },
  {
    id: "zivo-frontdesk",
    name: "ZIVO Front Desk",
    description: "Check-in/out, room assignments, and key card issuance for hotel reception.",
    audience: "hotel",
    platforms: ["ios", "windows"],
    downloads: {},
    icon: BellRing,
    status: "coming-soon",
  },
  {
    id: "zivo-housekeeping",
    name: "ZIVO Housekeeping",
    description: "Room status, cleaning queues, and maintenance tickets for housekeeping staff.",
    audience: "hotel",
    platforms: ["ios", "android"],
    downloads: {},
    icon: Brush,
    status: "coming-soon",
  },
  {
    id: "zivo-kds",
    name: "ZIVO Kitchen Display",
    description: "Kitchen Display System for restaurants — incoming orders, prep timers, ticket routing.",
    audience: "shop",
    platforms: ["ios", "android"],
    downloads: {},
    icon: ChefHat,
    status: "coming-soon",
  },
  {
    id: "zivo-driver",
    name: "ZIVO Driver",
    description: "Accept rides and delivery jobs, navigate with built-in maps, and track earnings.",
    audience: "all",
    platforms: ["ios", "android"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo-driver",
      android: "https://play.google.com/store/apps/details?id=com.zivodriver.app",
    },
    icon: Navigation,
    status: "available",
    version: "v1.8",
  },
  {
    id: "receipt-printer",
    name: "Receipt Printer Driver",
    description: "Universal driver for ESC/POS thermal receipt printers (USB & network).",
    audience: "all",
    platforms: ["windows", "macos"],
    downloads: {},
    icon: Printer,
    status: "coming-soon",
  },
  {
    id: "inventory-scanner",
    name: "Inventory Scanner",
    description: "Barcode scanning for stock counts, restocking, and supplier receiving.",
    audience: "shop",
    platforms: ["android"],
    downloads: {},
    icon: ScanBarcode,
    status: "coming-soon",
  },
  {
    id: "zivo-property",
    name: "ZIVO Property Suite",
    description: "Desktop property management — rates, channels, reservations, and reporting.",
    audience: "hotel",
    platforms: ["windows", "macos"],
    downloads: {},
    icon: Hotel,
    status: "coming-soon",
  },
];

const PLATFORM_META: Record<Platform, { label: string; icon: LucideIcon }> = {
  ios: { label: "iOS", icon: Apple },
  android: { label: "Android", icon: Smartphone },
  windows: { label: "Windows", icon: Monitor },
  macos: { label: "macOS", icon: Laptop },
};

interface Props {
  storeCategory?: string;
}

export default function SoftwareDownloadsSection({ storeCategory }: Props) {
  const isHotel = isLodgingStoreCategory(storeCategory);
  const audience: Audience = isHotel ? "hotel" : "shop";

  const apps = SOFTWARE_CATALOG.filter(
    (app) => app.audience === "all" || app.audience === audience,
  );

  const handleDownload = (url?: string, appName?: string, platformLabel?: string) => {
    if (!url) {
      toast.info(`${appName} for ${platformLabel} is coming soon.`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNotify = (appName: string) => {
    toast.success(`We'll notify you when ${appName} is available.`);
  };

  return (
    <div className="space-y-4">
      <div className="zivo-card-organic p-3 md:p-4 flex items-start gap-3">
        <div className="zivo-icon-pill shrink-0">
          <Download className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-semibold text-foreground">
            Software & Apps
          </h2>
          <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
            Download the official ZIVO companion apps to operate your{" "}
            {isHotel ? "hotel" : "business"} on mobile, tablet, or desktop. All apps sync
            in real time with this dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {apps.map((app) => {
          const Icon = app.icon;
          const isComingSoon = app.status === "coming-soon";
          return (
            <div
              key={app.id}
              className="zivo-card-organic p-3 md:p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="zivo-icon-pill shrink-0">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13px] md:text-sm font-semibold text-foreground truncate">
                      {app.name}
                    </h3>
                    {app.version && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {app.version}
                      </Badge>
                    )}
                    {isComingSoon && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-700 dark:text-amber-400"
                      >
                        Coming soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                    {app.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {app.platforms.map((p) => {
                  const meta = PLATFORM_META[p];
                  const PIcon = meta.icon;
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
                    >
                      <PIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 mt-auto">
                {isComingSoon ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[12px] gap-1.5"
                    onClick={() => handleNotify(app.name)}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Notify me
                  </Button>
                ) : (
                  app.platforms.map((p) => {
                    const meta = PLATFORM_META[p];
                    const PIcon = meta.icon;
                    const url = app.downloads[p];
                    return (
                      <Button
                        key={p}
                        size="sm"
                        variant={url ? "default" : "outline"}
                        className="h-8 text-[12px] gap-1.5"
                        onClick={() => handleDownload(url, app.name, meta.label)}
                        disabled={!url}
                      >
                        <PIcon className="w-3.5 h-3.5" />
                        {meta.label}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Need something else? Email{" "}
        <a
          href="mailto:partners@hizivo.com"
          className="text-emerald-600 hover:underline"
        >
          partners@hizivo.com
        </a>{" "}
        — we ship custom integrations for enterprise partners.
      </p>
    </div>
  );
}
