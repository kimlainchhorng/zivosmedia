/**
 * BuildROSectionDialog — opens another store section (Settings, Customers,
 * Bookings, Reports, …) as a popup over Build R.O. by embedding that section's
 * own tab URL in an iframe (?embed=1 strips the page chrome). The user stays on
 * Build R.O.; closing the dialog returns to the in-progress R.O.
 */
import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildStoreTabUrl } from "@/lib/admin/storeTabRouting";
import ArQuickSettingsPanel from "./ArQuickSettingsPanel";
import AutoRepairWarrantySection from "./AutoRepairWarrantySection";

// Friendly titles for the sections reachable from the Build R.O. quick-nav toolbar.
const SECTION_LABELS: Record<string, string> = {
  settings: "Settings",
  customers: "Customers",
  "customer-bookings": "Bookings",
  "ar-vehicles": "Vehicles",
  "ar-workorders": "Work Orders",
  "ar-inspections": "Inspections",
  "ar-customer-notes": "History & Notes",
  "ar-dashboard": "Dashboard",
  "ar-labor-time": "Labor Time",
  "ar-parts": "Parts Catalog",
  "ar-tires": "Tire Inventory",
  "ar-parts-suppliers": "Parts Suppliers",
  "ar-fin-income": "Finance",
  "ar-fin-expenses": "Expenses & Bills",
  "ar-fin-payments": "Payments Received",
  "ar-fin-pnl": "Profit & Loss",
  "ar-fin-tax": "Tax & Payouts",
  "ar-promos": "Promotions & Deals",
  "ar-campaigns": "SMS & Email",
  "ar-gift-cards": "Gift Cards",
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
  "ar-reviews": "Reviews & Ratings",
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
  isSoftwareDomain?: boolean;
}

export default function BuildROSectionDialog({ storeId, tab, onOpenChange, onNavigate }: Props) {
  const open = !!tab;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Only act on messages from our own app (the embedded section iframe).
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "ar_navigate" && e.data?.tab) {
        // Apply any handoff prefill in the parent context first, so the target
        // tab (e.g. Build R.O.) reliably sees it even if storage isn't shared
        // across the iframe boundary. Then close the popup and switch tabs.
        const prefill = e.data.prefill;
        if (prefill?.key && typeof prefill.value === "string") {
          try { sessionStorage.setItem(prefill.key, prefill.value); } catch { /* ignore */ }
        }
        onOpenChange(false);
        onNavigate?.(e.data.tab);
        // Build R.O. is usually already mounted under this popup, so navigating to
        // its tab is a no-op and its mount-time prefill read won't re-fire. Nudge it
        // to consume the handoff now (next tick, after the dialog has closed).
        if (e.data.tab === "ar-build-ro") {
          setTimeout(() => window.dispatchEvent(new CustomEvent("ar-buildro-consume-prefill")), 0);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onOpenChange, onNavigate]);
  const label = tab === "settings" ? "Auto Repair Settings" : tab ? SECTION_LABELS[tab] || "Section" : "";
  const src = tab ? `${buildStoreTabUrl(storeId, tab)}&embed=1` : "about:blank";
  const inlineSection = tab === "ar-warranty" ? <AutoRepairWarrantySection storeId={storeId} /> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={inlineSection ? "ar-section-dialog-content max-w-none" : "max-w-5xl w-[95vw] h-[88vh] max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0"}>
        <DialogHeader className={inlineSection ? "ar-section-dialog-header" : "px-5 py-3 border-b border-border"}>
          <DialogTitle className={inlineSection ? "ar-section-dialog-title" : "text-sm font-semibold"}>{label}</DialogTitle>
          <DialogDescription className="sr-only">
            {label} is open over the Build R.O. workspace.
          </DialogDescription>
        </DialogHeader>
        {open && tab === "settings" ? (
          // The full Settings page is heavy (and crashes on a cold load), so the
          // Settings popup uses a focused, self-contained editor instead.
          <ArQuickSettingsPanel storeId={storeId} onClose={() => onOpenChange(false)} />
        ) : inlineSection ? (
          <div className="ar-section-dialog-body">
            <div className="ar-section-dialog-direct">{inlineSection}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-muted/30">
            {open && (
              <iframe
                key={tab}
                title={label}
                src={src}
                className="ar-section-dialog-frame"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
