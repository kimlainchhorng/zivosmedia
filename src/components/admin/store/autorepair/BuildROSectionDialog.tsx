/**
 * BuildROSectionDialog — opens another store section (Settings, Customers,
 * Bookings, Reports, …) as a popup over Build R.O. by embedding that section's
 * own tab URL in an iframe (?embed=1 strips the page chrome). The user stays on
 * Build R.O.; closing the dialog returns to the in-progress R.O.
 */
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildStoreTabUrl } from "@/lib/admin/storeTabRouting";
import ArQuickSettingsPanel from "./ArQuickSettingsPanel";

// Friendly titles for the sections reachable from the Build R.O. quick-nav toolbar.
const SECTION_LABELS: Record<string, string> = {
  settings: "Settings",
  customers: "Customers",
  "customer-bookings": "Bookings",
  "ar-vehicles": "Vehicles",
  "ar-dashboard": "Dashboard",
  "ar-labor-time": "Labor Time",
  "ar-fin-income": "Finance",
  "ar-campaigns": "SMS & Email",
  "ar-reports": "Reports",
  "ar-estimates": "Estimates",
  "ar-invoices": "Invoices",
  "ar-warranty": "Warranty",
  profile: "Profile",
  software: "Software & Apps",
  employees: "Employees",
  "ar-booking-link": "Online Booking Link",
  "ar-qr": "QR Check-In",
  "ar-reminders": "Reminders & Recalls",
  payroll: "Payroll",
  "employee-schedule": "Schedule",
  "time-clock": "Time Clock",
  attendance: "Attendance",
  training: "Training",
  documents: "Documents",
};

interface Props {
  storeId: string;
  /** Tab id to show; null closes the dialog. */
  tab: string | null;
  onOpenChange: (open: boolean) => void;
  /** Called when the embedded section requests navigation to another tab (e.g. "New R.O." in Customers). */
  onNavigate?: (tab: string) => void;
}

export default function BuildROSectionDialog({ storeId, tab, onOpenChange, onNavigate }: Props) {
  const open = !!tab;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "ar_navigate" && e.data?.tab) {
        onOpenChange(false);
        onNavigate?.(e.data.tab);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onOpenChange, onNavigate]);
  const label = tab ? SECTION_LABELS[tab] || "Section" : "";
  const src = tab ? `${buildStoreTabUrl(storeId, tab)}&embed=1` : "about:blank";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[88vh] max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">{label}</DialogTitle>
        </DialogHeader>
        {open && tab === "settings" ? (
          // The full Settings page is heavy (and crashes on a cold load), so the
          // Settings popup uses a focused, self-contained editor instead.
          <ArQuickSettingsPanel storeId={storeId} onClose={() => onOpenChange(false)} />
        ) : (
          <div className="flex-1 overflow-hidden bg-muted/30">
            {open && (
              <iframe
                key={tab}
                title={label}
                src={src}
                className="w-full h-full border-0 bg-background"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
