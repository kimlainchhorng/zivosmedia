/**
 * PropertyCompletenessMeter - circular progress + sections-to-finish pill.
 * Computes a weighted 0-100 score across 12 fields.
 */
import { CheckCircle2 } from "lucide-react";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";

interface Props {
  form: Partial<LodgePropertyProfile>;
}

const WEIGHTS = {
  hero_badges: 10,
  included_highlights: 10,
  languages: 8,
  facilities: 12,
  meal_plans: 6,
  house_rules: 12,
  accessibility: 8,
  sustainability: 6,
  nearby: 10,
  check_in_out: 8,
  contact: 6,
  policies: 4,
};

export function computeCompleteness(form: Partial<LodgePropertyProfile>) {
  let score = 0;
  const missing: string[] = [];
  const arr = (k: keyof LodgePropertyProfile) => ((form[k] as any[]) || []).length > 0;

  if (arr("hero_badges")) score += WEIGHTS.hero_badges; else missing.push("Hero badges");
  if (arr("included_highlights")) score += WEIGHTS.included_highlights; else missing.push("Included highlights");
  if (arr("languages")) score += WEIGHTS.languages; else missing.push("Languages");
  if (arr("facilities")) score += WEIGHTS.facilities; else missing.push("Facilities");
  if (arr("meal_plans")) score += WEIGHTS.meal_plans; else missing.push("Meal plans");
  const hr = form.house_rules || {};
  if (Object.keys(hr).filter(k => (hr as any)[k] !== undefined && (hr as any)[k] !== "" && (hr as any)[k] !== null).length >= 2)
    score += WEIGHTS.house_rules; else missing.push("House rules");
  if (arr("accessibility")) score += WEIGHTS.accessibility; else missing.push("Accessibility");
  if (arr("sustainability")) score += WEIGHTS.sustainability; else missing.push("Sustainability");
  if (arr("nearby")) score += WEIGHTS.nearby; else missing.push("Nearby");
  if (form.check_in_from && form.check_out_until) score += WEIGHTS.check_in_out; else missing.push("Check-in/out");
  const c = form.contact || {};
  if (c.phone || c.email || c.whatsapp) score += WEIGHTS.contact; else missing.push("Contact");
  if (form.cancellation_policy || (form.pet_policy && form.pet_policy.allowed !== undefined) || (form.child_policy && form.child_policy.allowed !== undefined))
    score += WEIGHTS.policies; else missing.push("Policies");

  return { score: Math.min(100, score), missing };
}

export default function PropertyCompletenessMeter({ form }: Props) {
  const { score, missing } = computeCompleteness(form);
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 80 ? "hsl(var(--primary))" : score >= 50 ? "hsl(var(--accent-foreground))" : "hsl(var(--destructive))";

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 56 56" className="h-12 w-12 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
          {score}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-foreground flex items-center gap-1">
          {score === 100 ? <><CheckCircle2 className="h-3 w-3 text-primary" /> Profile complete</> : "Profile completeness"}
        </div>
        <div className="text-[10px] text-muted-foreground line-clamp-1">
          {missing.length === 0 ? "All sections filled" : `${missing.length} section${missing.length > 1 ? "s" : ""} to finish`}
        </div>
      </div>
    </div>
  );
}
