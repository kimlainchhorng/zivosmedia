/**
 * Auto Repair — service interval recommendations.
 * Used when a work order is marked done: we scan the notes / parts list for
 * keywords and auto-schedule a follow-up reminder per matched service.
 */

export type ServiceInterval = {
  reminderType: string;
  /** months until the next visit */
  months: number;
  /** miles until the next service (relative to current mileage) */
  mileage: number;
  /** lowercased keyword fragments to match in WO text */
  keywords: string[];
};

export const SERVICE_INTERVALS: ServiceInterval[] = [
  { reminderType: "Oil change",          months: 3,  mileage: 5_000,  keywords: ["oil change", "oil & filter", "lube oil filter", "lof"] },
  { reminderType: "Tire rotation",       months: 6,  mileage: 7_500,  keywords: ["tire rotation", "rotate tires", "tire rot"] },
  { reminderType: "Brake inspection",    months: 12, mileage: 12_000, keywords: ["brake pad", "brake rotor", "brake service", "brake job", "brake inspection"] },
  { reminderType: "Air filter",          months: 12, mileage: 15_000, keywords: ["engine air filter", "air filter"] },
  { reminderType: "Cabin filter",        months: 12, mileage: 15_000, keywords: ["cabin filter", "cabin air"] },
  { reminderType: "Wheel alignment",     months: 12, mileage: 15_000, keywords: ["alignment", "wheel alignment"] },
  { reminderType: "Transmission service",months: 24, mileage: 30_000, keywords: ["transmission flush", "transmission fluid", "trans service"] },
  { reminderType: "Coolant flush",       months: 24, mileage: 30_000, keywords: ["coolant flush", "antifreeze", "radiator service"] },
  { reminderType: "Battery check",       months: 12, mileage: 12_000, keywords: ["battery replac", "new battery"] },
  { reminderType: "Spark plugs",         months: 36, mileage: 60_000, keywords: ["spark plug"] },
];

export type SuggestedReminder = {
  reminderType: string;
  dueAtIso: string;
  dueMileage: number | null;
};

export function suggestReminders(opts: {
  text: string;
  currentMileage?: number | null;
  fromDate?: Date;
}): SuggestedReminder[] {
  const haystack = (opts.text || "").toLowerCase();
  if (!haystack) return [];
  const now = opts.fromDate ?? new Date();
  const seen = new Set<string>();
  const out: SuggestedReminder[] = [];
  for (const svc of SERVICE_INTERVALS) {
    if (seen.has(svc.reminderType)) continue;
    const hit = svc.keywords.some((k) => haystack.includes(k));
    if (!hit) continue;
    seen.add(svc.reminderType);
    const due = new Date(now);
    due.setMonth(due.getMonth() + svc.months);
    out.push({
      reminderType: svc.reminderType,
      dueAtIso: due.toISOString(),
      dueMileage: opts.currentMileage != null ? opts.currentMileage + svc.mileage : null,
    });
  }
  return out;
}
