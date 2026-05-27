/**
 * Auto Repair — Digital Vehicle Inspection shared constants.
 * Used by both the admin section and the public customer viewer
 * so the two render the same 20-point checklist with matching colors.
 */
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";

export const POINTS = [
  "Brakes (Front)", "Brakes (Rear)", "Tires (Tread)", "Tire Pressure", "Battery Health",
  "Engine Oil", "Coolant Level", "Transmission Fluid", "Power Steering Fluid", "Brake Fluid",
  "Air Filter", "Cabin Filter", "Wiper Blades", "Headlights", "Taillights",
  "Belts", "Hoses", "Suspension", "Exhaust System", "Check Engine Code",
] as const;

export type Status = "good" | "attention" | "urgent";

export const COLORS: Record<Status, string> = {
  good: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  attention: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  urgent: "text-red-600 bg-red-500/10 border-red-500/30",
};

export const ICONS: Record<Status, any> = {
  good: CheckCircle2,
  attention: AlertTriangle,
  urgent: XCircle,
};
