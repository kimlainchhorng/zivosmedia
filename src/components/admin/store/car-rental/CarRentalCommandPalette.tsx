/**
 * CarRentalCommandPalette — Cmd/Ctrl+K quick navigator.
 *
 * Opens with the keyboard shortcut while inside the car-rental admin area.
 * Lists every tab in the module plus recent reservations so the operator
 * can jump to any view in two keystrokes.
 */
import { useEffect, useState } from "react";
import {
  CalendarRange, KeyRound, ClipboardCheck, Car, DollarSign, PackagePlus, Building2,
  Wrench, Users, Star, Tag, Wallet, BarChart3, LayoutDashboard, ExternalLink,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  storeId: string;
  onJump: (tabId: string) => void;
}

interface RecentReservation {
  id: string;
  confirmation_code: string;
  customer_name: string;
  vehicle_label: string;
  status: string;
  pickup_at: string;
}

const TABS: { id: string; label: string; icon: typeof LayoutDashboard; hint?: string }[] = [
  { id: "car-rental-dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "overview" },
  { id: "car-rental-reservations", label: "Reservations", icon: CalendarRange, hint: "bookings list" },
  { id: "car-rental-checkout", label: "Pickup Check-out", icon: KeyRound },
  { id: "car-rental-returns", label: "Return & Check-in", icon: ClipboardCheck },
  { id: "car-rental-fleet", label: "Fleet & Vehicles", icon: Car, hint: "cars" },
  { id: "car-rental-rates", label: "Rates & Plans", icon: DollarSign },
  { id: "car-rental-addons", label: "Add-ons & Extras", icon: PackagePlus },
  { id: "car-rental-locations", label: "Pickup Locations", icon: Building2 },
  { id: "car-rental-maintenance", label: "Maintenance Log", icon: Wrench },
  { id: "car-rental-customers", label: "Renters", icon: Users, hint: "customers" },
  { id: "car-rental-reviews", label: "Reviews & Ratings", icon: Star },
  { id: "car-rental-promotions", label: "Promotions & Codes", icon: Tag },
  { id: "car-rental-income", label: "Income & Revenue", icon: DollarSign },
  { id: "car-rental-expenses", label: "Expenses & Bills", icon: Wallet },
  { id: "car-rental-reports", label: "Reports & Analytics", icon: BarChart3 },
];

export default function CarRentalCommandPalette({ storeId, onJump }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentReservation[]>([]);

  // Open / close on Cmd+K / Ctrl+K. Skip when typing inside any input/textarea so we don't hijack typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        // Allow opening even inside inputs — Cmd+K is global by convention
        e.preventDefault();
        setOpen((v) => !v);
        if (tag === "input" || tag === "textarea") (t as HTMLElement).blur?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-load recent reservations the first time the palette opens.
  useEffect(() => {
    if (!open || recent.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("car_rental_reservations")
        .select("id, confirmation_code, customer_name, vehicle_label, status, pickup_at")
        .eq("store_id", storeId)
        .order("pickup_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setRecent((data ?? []) as unknown as RecentReservation[]);
    })();
    return () => { cancelled = true; };
  }, [open, storeId, recent.length]);

  const jump = (tabId: string) => {
    onJump(tabId);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a tab or search reservations by code or customer…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <CommandItem
                key={t.id}
                value={`${t.label} ${t.hint ?? ""} ${t.id}`}
                onSelect={() => jump(t.id)}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{t.label}</span>
                {t.hint && <span className="text-[10px] text-muted-foreground">{t.hint}</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent reservations">
              {recent.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.confirmation_code} ${r.customer_name} ${r.vehicle_label}`}
                  onSelect={() => {
                    // Land on Reservations tab — operator can edit/find from there.
                    jump("car-rental-reservations");
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">
                      <span className="font-mono text-[11px] mr-2 text-muted-foreground">{r.confirmation_code}</span>
                      {r.customer_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {r.vehicle_label} · {r.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
