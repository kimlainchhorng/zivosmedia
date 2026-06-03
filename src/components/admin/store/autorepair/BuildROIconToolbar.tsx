/**
 * Build R.O. — VSM-style top icon toolbar (quick-nav).
 * A compact row of icon shortcuts mirroring the VSM toolbar. Self-contained so
 * it can use any icons without touching the section's import block; the section
 * just renders it with onNavigate / onNew / onPrint / onHub.
 */
import {
  Plus, Home, Calendar, Users, Car, Gauge, Clock, Calculator,
  MessageSquare, BarChart3, Printer, Settings,
} from "lucide-react";

interface Props {
  onNew: () => void;
  onHub: () => void;
  onPrint: () => void;
  onNavigate?: (tab: string) => void;
}

export default function BuildROIconToolbar({ onNew, onHub, onPrint, onNavigate }: Props) {
  const nav = (tab: string) => () => onNavigate?.(tab);
  const items: { icon: typeof Plus; label: string; onClick: () => void; accent?: string }[] = [
    { icon: Plus, label: "New R.O.", onClick: onNew, accent: "text-emerald-600" },
    { icon: Home, label: "Start screen", onClick: onHub },
    { icon: Calendar, label: "Bookings", onClick: nav("customer-bookings") },
    { icon: Users, label: "Customers", onClick: nav("customers") },
    { icon: Car, label: "Vehicles", onClick: nav("ar-vehicles") },
    { icon: Gauge, label: "Dashboard", onClick: nav("ar-dashboard") },
    { icon: Clock, label: "Labor time", onClick: nav("ar-labor-time") },
    { icon: Calculator, label: "Finance", onClick: nav("ar-fin-income") },
    { icon: MessageSquare, label: "SMS & email", onClick: nav("ar-campaigns") },
    { icon: BarChart3, label: "Reports", onClick: nav("ar-reports") },
    { icon: Printer, label: "Print", onClick: onPrint },
    { icon: Settings, label: "Settings", onClick: nav("settings") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card px-2 py-1.5">
      {items.map(({ icon: Icon, label, onClick, accent }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          title={label}
          aria-label={label}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground ${accent ?? ""}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
